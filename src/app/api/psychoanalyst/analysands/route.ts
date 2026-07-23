import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { requirePsychoanalyst, safeDecrypt } from "@/lib/psychoanalyst-api";

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
  sessionFrequency: z.string().optional(),
  linkedUserId: z.string().optional(),
});

async function resolveLinkablePatientUserId(opts: {
  psychoanalystId: string;
  linkedUserId?: string;
  email?: string;
}): Promise<
  | { linkedUserId: string | null }
  | { error: string; status: number }
> {
  async function isLinkablePatient(userId: string): Promise<boolean> {
    const patient = await db.patientProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!patient) return false;

    const appointment = await db.appointment.findFirst({
      where: {
        psychoanalystId: opts.psychoanalystId,
        patientId: patient.id,
        status: { in: ["CONFIRMED", "PENDING", "COMPLETED"] },
      },
      select: { id: true },
    });
    return Boolean(appointment);
  }

  if (opts.linkedUserId) {
    const ok = await isLinkablePatient(opts.linkedUserId);
    if (!ok) {
      return {
        error:
          "Can only link a patient account that already has an appointment with this psychoanalyst.",
        status: 400,
      };
    }
    const dup = await db.analysandRecord.findFirst({
      where: {
        psychoanalystId: opts.psychoanalystId,
        linkedUserId: opts.linkedUserId,
      },
      select: { id: true },
    });
    if (dup) {
      return { error: "An analysand chart already exists for this patient.", status: 409 };
    }
    return { linkedUserId: opts.linkedUserId };
  }

  if (opts.email) {
    const existing = await db.user.findUnique({
      where: { email: opts.email.toLowerCase() },
      select: { id: true },
    });
    if (existing && (await isLinkablePatient(existing.id))) {
      const dup = await db.analysandRecord.findFirst({
        where: {
          psychoanalystId: opts.psychoanalystId,
          linkedUserId: existing.id,
        },
        select: { id: true },
      });
      if (dup) {
        return { error: "An analysand chart already exists for this patient.", status: 409 };
      }
      return { linkedUserId: existing.id };
    }
  }

  return { linkedUserId: null };
}

export async function GET() {
  const ctx = await requirePsychoanalyst();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { psychoanalyst } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const records = await db.analysandRecord.findMany({
    where: { psychoanalystId: psychoanalyst.id },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return NextResponse.json({
    analysands: records.map((r) => ({
      id: r.id,
      firstName: safeDecrypt(r.firstName),
      lastName: safeDecrypt(r.lastName),
      email: r.email,
      hasAccount: !!r.linkedUserId,
      linkedUserId: r.linkedUserId,
      processStartDate: r.processStartDate?.toISOString() ?? null,
      updatedAt: r.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const ctx = await requirePsychoanalyst();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { psychoanalyst } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  const linkResult = await resolveLinkablePatientUserId({
    psychoanalystId: psychoanalyst.id,
    linkedUserId: d.linkedUserId,
    email: d.email || undefined,
  });
  if ("error" in linkResult) {
    return NextResponse.json({ error: linkResult.error }, { status: linkResult.status });
  }
  const linkedUserId = linkResult.linkedUserId;

  const record = await db.analysandRecord.create({
    data: {
      psychoanalystId: psychoanalyst.id,
      firstName: encrypt(d.firstName),
      lastName: encrypt(d.lastName),
      email: d.email ? d.email.toLowerCase() : null,
      phone: d.phone ? encrypt(d.phone) : null,
      notes: d.notes ? encrypt(d.notes) : null,
      sessionFrequency: d.sessionFrequency || null,
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
      hasAccount: !!linkedUserId,
    },
    { status: 201 }
  );
}
