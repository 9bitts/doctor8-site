// src/app/api/professional/records/route.ts
// Patient charts (PatientRecord) created by a professional.
// GET  — list this professional's patient charts
// POST — create a new patient chart
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { z } from "zod";

const createSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  notes: z.string().max(5000).optional().or(z.literal("")),
});

async function getProfessional(userId: string) {
  return db.professionalProfile.findUnique({ where: { userId } });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const professional = await getProfessional(session.user.id);
  if (!professional) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const records = await db.patientRecord.findMany({
    where: { professionalId: professional.id },
    orderBy: { updatedAt: "desc" },
  });

  // Decrypt PHI for display
  const decoded = records.map((r) => ({
    id: r.id,
    firstName: safeDecrypt(r.firstName),
    lastName: safeDecrypt(r.lastName),
    email: r.email || null,
    phone: r.phone ? safeDecrypt(r.phone) : null,
    linkedUserId: r.linkedUserId,
    hasAccount: !!r.linkedUserId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));

  return NextResponse.json({ records: decoded });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const professional = await getProfessional(session.user.id);
  if (!professional) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;

  // If an email was given, try to link to an existing patient account.
  let linkedUserId: string | null = null;
  if (d.email) {
    const existing = await db.user.findUnique({ where: { email: d.email.toLowerCase() } });
    if (existing) linkedUserId = existing.id;
  }

  const record = await db.patientRecord.create({
    data: {
      professionalId: professional.id,
      firstName: encrypt(d.firstName),
      lastName: encrypt(d.lastName),
      email: d.email ? d.email.toLowerCase() : null,
      phone: d.phone ? encrypt(d.phone) : null,
      dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth) : null,
      notes: d.notes ? encrypt(d.notes) : null,
      linkedUserId,
    },
  });

  return NextResponse.json({
    id: record.id,
    firstName: d.firstName,
    lastName: d.lastName,
    email: record.email,
    hasAccount: !!linkedUserId,
  }, { status: 201 });
}

// decrypt that won't crash if a value somehow isn't encrypted
function safeDecrypt(v: string): string {
  try {
    return decrypt(v);
  } catch {
    return v;
  }
}
