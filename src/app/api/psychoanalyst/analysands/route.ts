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
});

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
  let linkedUserId: string | null = null;
  if (d.email) {
    const existing = await db.user.findUnique({ where: { email: d.email.toLowerCase() } });
    if (existing) linkedUserId = existing.id;
  }

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
