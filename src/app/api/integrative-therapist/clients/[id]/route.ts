import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { PICS_SLUGS } from "@/lib/pics/practices";
import { requireIntegrativeTherapist, safeDecrypt } from "@/lib/integrative-therapist-api";

const patchSchema = z.object({
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
    },
  });
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

  const record = await db.integrativeClientRecord.update({
    where: { id: existing.id },
    data: {
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
      mainPractice: record.mainPractice,
      chiefComplaint: record.chiefComplaint ? safeDecrypt(record.chiefComplaint) : null,
      treatmentGoals: record.treatmentGoals ? safeDecrypt(record.treatmentGoals) : null,
      notes: record.notes ? safeDecrypt(record.notes) : null,
      phone: record.phone ? safeDecrypt(record.phone) : null,
    },
  });
}
