import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { z } from "zod";
import { notifyProviderVerifiedApproved } from "@/lib/provider-verification-notify";

const patchSchema = z.object({
  verified: z.boolean(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await db.psychoanalystProfile.findUnique({
    where: { id: params.id },
    select: { verified: true, userId: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await db.psychoanalystProfile.update({
    where: { id: params.id },
    data: {
      verified: parsed.data.verified,
      verifiedAt: parsed.data.verified ? new Date() : null,
      verifiedBy: parsed.data.verified ? session.user.id : null,
    },
  });

  if (parsed.data.verified && !existing.verified) {
    notifyProviderVerifiedApproved(existing.userId, "PSYCHOANALYST").catch((err) =>
      console.error("[verify] psychoanalyst email failed:", err),
    );
  }

  return NextResponse.json({ id: updated.id, verified: updated.verified });
}
