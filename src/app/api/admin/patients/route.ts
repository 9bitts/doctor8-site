// src/app/api/admin/patients/route.ts
// ADMIN ONLY — list all patients (minimum necessary: name, email, region, counts).
// Does NOT expose clinical data (history, documents content, etc.).
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const profiles = await db.patientProfile.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { email: true, region: true, createdAt: true } },
      _count: { select: { appointments: true, medicalDocuments: true } },
    },
  });

  const patients = profiles.map((p) => ({
    id: p.id,
    userId: p.userId,
    name: `${safeDecrypt(p.firstName)} ${safeDecrypt(p.lastName)}`.trim() || "—",
    email: p.user?.email ?? null,
    region: p.user?.region ?? null,
    appointments: p._count.appointments,
    documents: p._count.medicalDocuments,
    createdAt: p.createdAt.toISOString(),
  }));

  return NextResponse.json({ patients });
}
