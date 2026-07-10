// src/app/api/professional/records/[id]/route.ts
// PATCH — update a chart.
//   - email: only allowed when the chart has NO linked account.
//   - registration data (P1-b): dateOfBirth now stored encrypted, sex, cpf, address.

import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { z } from "zod";
import { buildPatientRecordSearchText } from "@/lib/patient-record-search";
import { canEditChart, resolveChartAccess, auditChartView } from "@/lib/chart-access";
import {
  notifyPatientChartLinked,
  patientDisplayName,
} from "@/lib/chart-link-notify";
import { markChartInvitesLinked } from "@/lib/patient-chart-link";

function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

const patchSchema = z.object({
  firstName:    z.string().min(1).max(100).optional(),
  lastName:     z.string().min(1).max(100).optional(),
  phone:        z.string().max(40).optional().or(z.literal("")),
  notes:        z.string().max(5000).optional().or(z.literal("")),
  email:        z.string().email().or(z.literal("")).optional(),
  dateOfBirth:  z.string().optional().or(z.literal("")),
  sex:          z.string().max(10).optional().or(z.literal("")),
  cpf:          z.string().max(30).optional().or(z.literal("")),
  addressLine1: z.string().max(200).optional().or(z.literal("")),
  city:         z.string().max(100).optional().or(z.literal("")),
  state:        z.string().max(100).optional().or(z.literal("")),
  country:      z.string().max(60).optional().or(z.literal("")),
  zipCode:      z.string().max(30).optional().or(z.literal("")),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const access = await resolveChartAccess(ctx.professional.id, params.id);
  if (!access) {
    return NextResponse.json({ error: "Chart not found" }, { status: 404 });
  }

  await auditChartView(ctx.userId, params.id, access);

  const record = await db.patientRecord.findFirst({
    where: { id: params.id },
    include: {
      medicalDocuments: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { category: { select: { name: true } } },
      },
    },
  });
  if (!record) {
    return NextResponse.json({ error: "Chart not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: record.id,
    firstName: safeDecrypt(record.firstName),
    lastName: safeDecrypt(record.lastName),
    documents: record.medicalDocuments.map((d) => ({
      id: d.id,
      title: safeDecrypt(d.title),
      content: d.content ? safeDecrypt(d.content) : null,
      categoryName: d.category?.name ?? null,
      createdAt: d.createdAt.toISOString(),
    })),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const access = await resolveChartAccess(ctx.professional.id, params.id);
  if (!canEditChart(access)) {
    return NextResponse.json({ error: "Chart not found" }, { status: 404 });
  }

  const record = await db.patientRecord.findFirst({
    where: { id: params.id },
  });
  if (!record) {
    return NextResponse.json({ error: "Chart not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
  const d = parsed.data;

  const wantsEmailChange = Object.prototype.hasOwnProperty.call(body, "email");
  const regKeys = ["dateOfBirth", "sex", "cpf", "addressLine1", "city", "state", "country", "zipCode"];
  const wantsRegUpdate = regKeys.some((k) => Object.prototype.hasOwnProperty.call(body, k));
  const wantsNameUpdate =
    Object.prototype.hasOwnProperty.call(body, "firstName") ||
    Object.prototype.hasOwnProperty.call(body, "lastName");
  const wantsPhoneUpdate = Object.prototype.hasOwnProperty.call(body, "phone");
  const wantsNotesUpdate = Object.prototype.hasOwnProperty.call(body, "notes");

  const data: Record<string, unknown> = {};
  let linkedUserId: string | null = null;

  if (wantsNameUpdate) {
    const nextFirst = d.firstName ?? safeDecrypt(record.firstName);
    const nextLast = d.lastName ?? safeDecrypt(record.lastName);
    if (Object.prototype.hasOwnProperty.call(body, "firstName")) {
      data.firstName = encrypt(nextFirst);
    }
    if (Object.prototype.hasOwnProperty.call(body, "lastName")) {
      data.lastName = encrypt(nextLast);
    }
    data.searchText = buildPatientRecordSearchText(
      nextFirst,
      nextLast,
      record.email,
    );
  }

  if (wantsPhoneUpdate) {
    data.phone = d.phone ? encrypt(d.phone) : null;
  }

  if (wantsNotesUpdate) {
    data.notes = d.notes ? encrypt(d.notes) : null;
  }

  // EMAIL block
  if (wantsEmailChange) {
    if (record.linkedUserId) {
      return NextResponse.json(
        { error: "This chart is already linked to an account; its email can't be changed." },
        { status: 400 }
      );
    }
    const newEmail = d.email ? d.email.toLowerCase() : null;
    data.email = newEmail;
    data.searchText = buildPatientRecordSearchText(
      safeDecrypt(record.firstName),
      safeDecrypt(record.lastName),
      newEmail,
    );
    if (newEmail) {
      const existing = await db.user.findUnique({ where: { email: newEmail } });
      if (existing && existing.role === "PATIENT") {
        linkedUserId = existing.id;
        data.linkedUserId = linkedUserId;
      }
    }
  }

  // REGISTRATION block
  if (wantsRegUpdate) {
    const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);

    if (has("dateOfBirth")) {
      // Store as encrypted ISO string — NOT a Date object
      data.dateOfBirth = d.dateOfBirth
        ? encrypt(d.dateOfBirth) as unknown as Date
        : null;
    }
    if (has("sex"))          data.sex         = d.sex || null;
    if (has("cpf"))          data.cpf         = d.cpf ? encrypt(d.cpf) : null;
    if (has("addressLine1")) data.addressLine1 = d.addressLine1 ? encrypt(d.addressLine1) : null;
    if (has("city"))         data.city         = d.city || null;
    if (has("state"))        data.state        = d.state || null;
    if (has("country"))      data.country      = d.country || null;
    if (has("zipCode"))      data.zipCode      = d.zipCode ? encrypt(d.zipCode) : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  await db.patientRecord.update({
    where: { id: record.id },
    data,
  });

  if (linkedUserId) {
    try {
      const profile = await db.patientProfile.findUnique({
        where: { userId: linkedUserId },
        select: { id: true },
      });
      if (profile) {
        await db.medicalDocument.updateMany({
          where: { patientRecordId: record.id, patientId: null },
          data:  { patientId: profile.id },
        });
      }
      await markChartInvitesLinked(linkedUserId);

      const patientUser = await db.user.findUnique({
        where: { id: linkedUserId },
        select: { email: true, language: true },
      });
      if (patientUser?.email) {
        const patientName = await patientDisplayName(linkedUserId);
        const doctorName = `Dr. ${ctx.professional.firstName} ${ctx.professional.lastName}`.trim();
        notifyPatientChartLinked({
          patientUserId: linkedUserId,
          patientEmail: patientUser.email,
          patientName,
          doctorName,
          patientRecordId: record.id,
          professionalId: ctx.professional.id,
          language: patientUser.language,
        }).catch((e) => console.error("[RECORD PATCH] chart link notify failed:", e));
      }
    } catch (e) {
      console.error("[RECORD PATCH] attach docs failed:", e);
    }
  }

  return NextResponse.json({
    success: true,
    ...(wantsEmailChange
      ? { email: (data.email as string | null) ?? null, hasAccount: !!linkedUserId }
      : {}),
  });
}
