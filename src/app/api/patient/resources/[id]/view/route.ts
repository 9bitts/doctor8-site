import { NextRequest, NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { getSignedReadUrl } from "@/lib/s3";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try {
    return decrypt(v);
  } catch {
    return v ?? "";
  }
}

/** Mark a shared resource as viewed by the patient. */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const share = await db.resourceShare.findFirst({
    where: {
      id: params.id,
      patientRecord: { linkedUserId: ctx.userId },
    },
  });

  if (share) {
    await db.resourceShare.update({
      where: { id: share.id },
      data: {
        viewedAt: share.viewedAt ?? new Date(),
        viewCount: { increment: 1 },
      },
    });
    return NextResponse.json({ ok: true });
  }

  const analysandShare = await db.analysandResourceShare.findFirst({
    where: {
      id: params.id,
      analysandRecord: { linkedUserId: ctx.userId },
    },
  });

  if (analysandShare) {
    await db.analysandResourceShare.update({
      where: { id: analysandShare.id },
      data: {
        viewedAt: analysandShare.viewedAt ?? new Date(),
        viewCount: { increment: 1 },
      },
    });
    return NextResponse.json({ ok: true });
  }

  const integrativeShare = await db.integrativeResourceShare.findFirst({
    where: {
      id: params.id,
      integrativeClientRecord: { linkedUserId: ctx.userId },
    },
  });

  if (integrativeShare) {
    await db.integrativeResourceShare.update({
      where: { id: integrativeShare.id },
      data: {
        viewedAt: integrativeShare.viewedAt ?? new Date(),
        viewCount: { increment: 1 },
      },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
