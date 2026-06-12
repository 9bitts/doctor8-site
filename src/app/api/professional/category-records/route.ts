// src/app/api/professional/category-records/route.ts
// GET ?categoryId=... — list this professional's chart records in one category,
// across all patients. Each card shows the patient (chart) it belongs to.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!professional) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");
  if (!categoryId) return NextResponse.json({ error: "Missing categoryId" }, { status: 400 });

  const category = await db.category.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true, groupName: true },
  });
  if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  const docs = await db.medicalDocument.findMany({
    where: {
      professionalId: professional.id,
      patientRecordId: { not: null },
      categoryId,
    },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      patientRecord: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  const records = docs.map((d) => ({
    id: d.id,
    title: safeDecrypt(d.title),
    content: d.content ? safeDecrypt(d.content) : null,
    hasFile: !!d.fileUrl,
    createdAt: d.createdAt.toISOString(),
    chartId: d.patientRecord?.id ?? null,
    patientName: d.patientRecord
      ? `${safeDecrypt(d.patientRecord.firstName)} ${safeDecrypt(d.patientRecord.lastName)}`.trim()
      : "—",
  }));

  return NextResponse.json({
    category: { id: category.id, name: category.name, groupName: category.groupName },
    records,
  });
}
