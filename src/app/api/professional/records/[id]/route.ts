// src/app/api/professional/records/[id]/route.ts
// GET — fetch one patient chart (PatientRecord) + its clinical documents
// PATCH — update chart notes (optional, simple)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!professional) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const record = await db.patientRecord.findUnique({
    where: { id: params.id },
    include: {
      medicalDocuments: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!record || record.professionalId !== professional.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    record: {
      id: record.id,
      firstName: safeDecrypt(record.firstName),
      lastName: safeDecrypt(record.lastName),
      email: record.email,
      phone: record.phone ? safeDecrypt(record.phone) : null,
      notes: record.notes ? safeDecrypt(record.notes) : null,
      hasAccount: !!record.linkedUserId,
      linkedUserId: record.linkedUserId,
    },
    documents: record.medicalDocuments.map((d) => ({
      id: d.id,
      type: d.type,
      title: safeDecrypt(d.title),
      content: d.content ? safeDecrypt(d.content) : null,
      fileUrl: d.fileUrl ? safeDecrypt(d.fileUrl) : null,
      createdAt: d.createdAt,
    })),
  });
}
