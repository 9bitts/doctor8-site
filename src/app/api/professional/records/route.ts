// src/app/api/professional/records/route.ts
// Patient charts (PatientRecord) created by a professional.
// GET  — list this professional's patient charts
// POST — create a new patient chart (optionally attaching a shared document)
//
// dateOfBirth is now stored as encrypted string (ISO YYYY-MM-DD) — PHI/HIPAA.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { z } from "zod";
import { buildPatientRecordSearchText } from "@/lib/patient-record-search";
import { findPossibleDuplicateCharts } from "@/lib/patient-record-dedup";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { attachSharedDocumentToChart } from "@/lib/shared-document-attach";

const createSchema = z.object({
  firstName:        z.string().min(1).max(100),
  lastName:         z.string().min(1).max(100),
  email:            z.string().email().optional().or(z.literal("")),
  phone:            z.string().min(1).max(40),
  dateOfBirth:      z.string().optional().or(z.literal("")),
  notes:            z.string().max(5000).optional().or(z.literal("")),
  sex:              z.string().max(10).optional().or(z.literal("")),
  cpf:              z.string().max(30).optional().or(z.literal("")),
  addressLine1:     z.string().max(200).optional().or(z.literal("")),
  city:             z.string().max(100).optional().or(z.literal("")),
  state:            z.string().max(100).optional().or(z.literal("")),
  country:          z.string().max(60).optional().or(z.literal("")),
  zipCode:          z.string().max(30).optional().or(z.literal("")),
  attachDocumentId: z.string().optional().or(z.literal("")),
  forceDuplicate:   z.boolean().optional(),
});

function safeDecrypt(v: string): string {
  try { return decrypt(v); } catch { return v; }
}

// Decrypt dateOfBirth — handles both encrypted string and legacy Date
function decryptDob(raw: unknown): string | null {
  if (!raw) return null;
  if (raw instanceof Date) return raw.toISOString().slice(0, 10); // legacy
  if (typeof raw === "string") {
    try { return decrypt(raw); } catch { return raw; }
  }
  return null;
}

function computeMissingForRx(r: {
  firstName: string | null;
  lastName: string | null;
  dobDecrypted: string | null;
  addressLine1: string | null;
  city: string | null;
}): string[] {
  const missing: string[] = [];
  if (!(r.firstName && r.lastName)) missing.push("name");
  if (!(r.addressLine1 || r.city))  missing.push("address");
  if (!r.dobDecrypted)              missing.push("dob");
  return missing;
}

export async function GET() {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;
  const { professional } = ctx;

  const records = await db.patientRecord.findMany({
    where: { professionalId: professional.id },
    orderBy: { updatedAt: "desc" },
  });

  const decoded = records.map((r) => {
    const firstName    = safeDecrypt(r.firstName);
    const lastName     = safeDecrypt(r.lastName);
    const dobDecrypted = decryptDob((r as { dateOfBirth?: unknown }).dateOfBirth);
    return {
      id:           r.id,
      firstName,
      lastName,
      email:        r.email || null,
      phone:        r.phone ? safeDecrypt(r.phone) : null,
      linkedUserId: r.linkedUserId,
      hasAccount:   !!r.linkedUserId,
      createdAt:    r.createdAt,
      updatedAt:    r.updatedAt,
      missingForRx: computeMissingForRx({
        firstName,
        lastName,
        dobDecrypted,
        addressLine1: r.addressLine1 ? safeDecrypt(r.addressLine1) : null,
        city:         r.city || null,
      }),
    };
  });

  return NextResponse.json({ records: decoded });
}

export async function POST(req: NextRequest) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;
  const { professional, userId } = ctx;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;

  const proFull = await db.professionalProfile.findUnique({
    where: { id: professional.id },
    select: { specialty: true },
  });
  if (proFull) {
    const { assertCanAddPsychologyPatient } = await import("@/lib/psychology-plan-limits");
    const { isPsychologistSpecialty } = await import("@/lib/psychologist-portal");
    if (isPsychologistSpecialty(proFull.specialty)) {
      const gate = await assertCanAddPsychologyPatient(userId, professional.id, proFull.specialty);
      if (!gate.ok) {
        return NextResponse.json(
          { code: gate.code, limit: gate.limit, current: gate.current },
          { status: 402 },
        );
      }
    }
  }

  if (!d.forceDuplicate) {
    const duplicates = await findPossibleDuplicateCharts(
      professional.id,
      d.firstName,
      d.lastName,
      d.email || null,
    );
    if (duplicates.length > 0) {
      return NextResponse.json(
        { code: "POSSIBLE_DUPLICATE", matches: duplicates },
        { status: 409 },
      );
    }
  }

  let linkedUserId: string | null = null;
  if (d.email) {
    const existing = await db.user.findUnique({ where: { email: d.email.toLowerCase() } });
    if (existing?.role === "PATIENT") linkedUserId = existing.id;
  }

  const record = await db.patientRecord.create({
    data: {
      professionalId: professional.id,
      firstName:      encrypt(d.firstName),
      lastName:       encrypt(d.lastName),
      email:          d.email ? d.email.toLowerCase() : null,
      searchText:     buildPatientRecordSearchText(d.firstName, d.lastName, d.email),
      phone:          d.phone ? encrypt(d.phone) : null,
      // dateOfBirth: store as encrypted ISO string (YYYY-MM-DD)
      dateOfBirth:    d.dateOfBirth ? encrypt(d.dateOfBirth) : null,
      notes:          d.notes ? encrypt(d.notes) : null,
      sex:            d.sex || null,
      cpf:            d.cpf ? encrypt(d.cpf) : null,
      addressLine1:   d.addressLine1 ? encrypt(d.addressLine1) : null,
      city:           d.city || null,
      state:          d.state || null,
      country:        d.country || null,
      zipCode:        d.zipCode ? encrypt(d.zipCode) : null,
      linkedUserId,
    },
  });

  let attachedDocumentId: string | null = null;
  if (d.attachDocumentId) {
    const attachResult = await attachSharedDocumentToChart({
      documentId: d.attachDocumentId,
      chartId: record.id,
      professionalId: professional.id,
    });
    if (attachResult) {
      attachedDocumentId = attachResult.recordId;
    }
  }

  return NextResponse.json({
    id:                record.id,
    firstName:         d.firstName,
    lastName:          d.lastName,
    email:             record.email,
    hasAccount:        !!linkedUserId,
    attachedDocumentId,
  }, { status: 201 });
}
