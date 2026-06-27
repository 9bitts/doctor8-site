import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { PICS_SLUGS } from "@/lib/pics/practices";
import { requireIntegrativeTherapist, safeDecrypt } from "@/lib/integrative-therapist-api";

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  mainPractice: z.string().optional(),
  chiefComplaint: z.string().optional(),
  treatmentGoals: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const records = await db.integrativeClientRecord.findMany({
    where: { integrativeTherapistId: therapist.id },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return NextResponse.json({
    clients: records.map((r) => ({
      id: r.id,
      firstName: safeDecrypt(r.firstName),
      lastName: safeDecrypt(r.lastName),
      email: r.email,
      mainPractice: r.mainPractice,
      hasAccount: !!r.linkedUserId,
      processStartDate: r.processStartDate?.toISOString() ?? null,
      updatedAt: r.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  if (d.mainPractice && !PICS_SLUGS.includes(d.mainPractice)) {
    return NextResponse.json({ error: "Invalid PICS practice" }, { status: 400 });
  }

  let linkedUserId: string | null = null;
  if (d.email) {
    const existing = await db.user.findUnique({ where: { email: d.email.toLowerCase() } });
    if (existing) linkedUserId = existing.id;
  }

  const record = await db.integrativeClientRecord.create({
    data: {
      integrativeTherapistId: therapist.id,
      firstName: encrypt(d.firstName),
      lastName: encrypt(d.lastName),
      email: d.email ? d.email.toLowerCase() : null,
      phone: d.phone ? encrypt(d.phone) : null,
      mainPractice: d.mainPractice || null,
      chiefComplaint: d.chiefComplaint ? encrypt(d.chiefComplaint) : null,
      treatmentGoals: d.treatmentGoals ? encrypt(d.treatmentGoals) : null,
      notes: d.notes ? encrypt(d.notes) : null,
      processStartDate: new Date(),
      linkedUserId,
    },
  });

  return NextResponse.json(
    {
      id: record.id,
      firstName: d.firstName,
      lastName: d.lastName,
      email: record.email,
      mainPractice: record.mainPractice,
      hasAccount: !!linkedUserId,
    },
    { status: 201 },
  );
}
