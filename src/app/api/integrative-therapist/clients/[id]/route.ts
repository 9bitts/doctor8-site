import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { encrypt } from "@/lib/encryption";
import { PICS_SLUGS } from "@/lib/pics/practices";
import { requireIntegrativeTherapist, safeDecrypt } from "@/lib/integrative-therapist-api";

const patchSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  mainPractice: z.string().optional(),
  chiefComplaint: z.string().optional(),
  treatmentGoals: z.string().optional(),
  notes: z.string().optional(),
  phone: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const record = await db.integrativeClientRecord.findFirst({
    where: { id: params.id, integrativeTherapistId: therapist.id },
  });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sessionCount = await db.medicalDocument.count({
    where: {
      integrativeClientRecordId: record.id,
      integrativeTherapistId: therapist.id,
      type: "CLINICAL_NOTE",
    },
  });

  return NextResponse.json({
    client: {
      id: record.id,
      firstName: safeDecrypt(record.firstName),
      lastName: safeDecrypt(record.lastName),
      email: record.email,
      phone: record.phone ? safeDecrypt(record.phone) : null,
      mainPractice: record.mainPractice,
      chiefComplaint: record.chiefComplaint ? safeDecrypt(record.chiefComplaint) : null,
      treatmentGoals: record.treatmentGoals ? safeDecrypt(record.treatmentGoals) : null,
      notes: record.notes ? safeDecrypt(record.notes) : null,
      processStartDate: record.processStartDate?.toISOString() ?? null,
      hasAccount: !!record.linkedUserId,
      sessionCount,
      defaultVisitType: sessionCount === 0 ? "first" : "return",
      archivedAt: record.archivedAt?.toISOString() ?? null,
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { session, therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const existing = await db.integrativeClientRecord.findFirst({
    where: { id: params.id, integrativeTherapistId: therapist.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.integrativeClientRecord.update({
    where: { id: existing.id },
    data: { archivedAt: new Date() },
  });

  await audit.deleteRecord(session.user.id, "IntegrativeClientRecord", existing.id);

  return NextResponse.json({ archived: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const existing = await db.integrativeClientRecord.findFirst({
    where: { id: params.id, integrativeTherapistId: therapist.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  if (d.mainPractice && !PICS_SLUGS.includes(d.mainPractice)) {
    return NextResponse.json({ error: "Invalid PICS practice" }, { status: 400 });
  }

  if (d.email !== undefined && existing.linkedUserId) {
    const newEmail = d.email ? d.email.toLowerCase() : null;
    if (newEmail !== existing.email) {
      return NextResponse.json(
        { error: "Cannot change email for a client linked to an account." },
        { status: 409 },
      );
    }
  }

  let linkedUserId = existing.linkedUserId;
  if (d.email !== undefined && !existing.linkedUserId) {
    const newEmail = d.email ? d.email.toLowerCase() : null;
    if (newEmail) {
      const user = await db.user.findUnique({ where: { email: newEmail } });
      if (user) linkedUserId = user.id;
    } else {
      linkedUserId = null;
    }
  }

  const record = await db.integrativeClientRecord.update({
    where: { id: existing.id },
    data: {
      ...(d.firstName !== undefined ? { firstName: encrypt(d.firstName) } : {}),
      ...(d.lastName !== undefined ? { lastName: encrypt(d.lastName) } : {}),
      ...(d.email !== undefined
        ? { email: d.email ? d.email.toLowerCase() : null, linkedUserId }
        : {}),
      ...(d.mainPractice !== undefined ? { mainPractice: d.mainPractice || null } : {}),
      ...(d.chiefComplaint !== undefined
        ? { chiefComplaint: d.chiefComplaint ? encrypt(d.chiefComplaint) : null }
        : {}),
      ...(d.treatmentGoals !== undefined
        ? { treatmentGoals: d.treatmentGoals ? encrypt(d.treatmentGoals) : null }
        : {}),
      ...(d.notes !== undefined ? { notes: d.notes ? encrypt(d.notes) : null } : {}),
      ...(d.phone !== undefined ? { phone: d.phone ? encrypt(d.phone) : null } : {}),
    },
  });

  return NextResponse.json({
    client: {
      id: record.id,
      firstName: safeDecrypt(record.firstName),
      lastName: safeDecrypt(record.lastName),
      email: record.email,
      mainPractice: record.mainPractice,
      chiefComplaint: record.chiefComplaint ? safeDecrypt(record.chiefComplaint) : null,
      treatmentGoals: record.treatmentGoals ? safeDecrypt(record.treatmentGoals) : null,
      notes: record.notes ? safeDecrypt(record.notes) : null,
      phone: record.phone ? safeDecrypt(record.phone) : null,
    },
  });
}
