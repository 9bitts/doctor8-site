import { NextRequest, NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";

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

  const integrativeShare = await db.integrativeResourceShare.findFirst({
    where: {
      id: params.id,
      integrativeClientRecord: { linkedUserId: ctx.userId },
    },
  });
  if (!integrativeShare) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.integrativeResourceShare.update({
    where: { id: integrativeShare.id },
    data: {
      viewedAt: integrativeShare.viewedAt ?? new Date(),
      viewCount: { increment: 1 },
    },
  });

  return NextResponse.json({ ok: true });
}
