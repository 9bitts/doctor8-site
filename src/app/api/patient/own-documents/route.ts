// GET — list patient's own documents (for share picker after connection request).
import { NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try {
    return decrypt(v);
  } catch {
    return v;
  }
}

export async function GET() {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const docs = await db.medicalDocument.findMany({
    where: { patientId: ctx.patientProfileId, professionalId: null },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      type: true,
      createdAt: true,
      category: { select: { name: true } },
    },
  });

  return NextResponse.json({
    documents: docs.map((d) => ({
      id: d.id,
      title: safeDecrypt(d.title) || d.type,
      type: d.type,
      categoryName: d.category?.name ?? null,
      createdAt: d.createdAt.toISOString(),
    })),
  });
}
