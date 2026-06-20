// src/app/api/professional/records/route.ts
// Patient charts (PatientRecord) created by a professional.
// GET  — list this professional's patient charts
// POST — create a new patient chart (optionally attaching a shared document)
//
// dateOfBirth is now stored as encrypted string (ISO YYYY-MM-DD) — PHI/HIPAA.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { z } from "zod";

const createSchema = z.object({
  firstName:        z.string().min(1).max(100),
  lastName:         z.string().min(1).max(100),
  email:            z.string().email().optional().or(z.literal("")),
  phone:            z.string().max(40).optional().or(z.literal("")),
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
});

async function getProfessional(userId: string) {
  return db.professionalProfile.findUnique({ where: { userId } });
}

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

  let linkedUserId: string | null = null;
  if (d.email) {
    const existing = await db.user.findUnique({ where: { email: d.email.toLowerCase() } });
    if (existing) linkedUserId = existing.id;
  }

  const record = await db.patientRecord.create({
    data: {
      professionalId: professional.id,
      firstName:      encrypt(d.firstName),
      lastName:       encrypt(d.lastName),
      email:          d.email ? d.email.toLowerCase() : null,
      phone:          d.phone ? encrypt(d.phone) : null,
      // dateOfBirth: store as encrypted ISO string
      dateOfBirth:    d.dateOfBirth ? encrypt(d.dateOfBirth) as unknown as Date : null,
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
    const share = await db.sharedRecord.findFirst({
      where: { documentId: d.attachDocumentId, sharedWithProfessionalId: professional.id },
      select: { id: true },
    });
    if (share) {
      const original = await db.medicalDocument.findUnique({
        where: { id: d.attachDocumentId },
        select: { type: true, categoryId: true, title: true, content: true, fileUrl: true },
      });
      if (original) {
        const copy = await db.medicalDocument.create({
          data: {
            patientRecordId:  record.id,
            professionalId:   professional.id,
            type:             original.type,
            categoryId:       original.categoryId,
            title:            original.title,
            content:          original.content,
            fileUrl:          original.fileUrl,
            sourceDocumentId: d.attachDocumentId,
          },
        });
        attachedDocumentId = copy.id;
      }
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
