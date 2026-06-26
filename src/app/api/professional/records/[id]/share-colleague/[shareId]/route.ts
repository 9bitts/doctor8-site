import { NextRequest, NextResponse } from "next/server";
import { requireProfessional } from "@/lib/psychology-api";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; shareId: string } },
) {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional } = ctx;

  const share = await db.patientRecordShare.findFirst({
    where: {
      id: params.shareId,
      patientRecordId: params.id,
      sharedByProfessionalId: professional.id,
      revokedAt: null,
    },
  });
  if (!share) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.patientRecordShare.update({
    where: { id: share.id },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
