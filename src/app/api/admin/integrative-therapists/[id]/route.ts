import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { z } from "zod";
import { notifyProviderVerifiedApproved, notifyProviderVerifiedRejected } from "@/lib/provider-verification-notify";
import { acuraVolunteerWriteData } from "@/lib/acura-volunteer";

const patchSchema = z.object({
  verified: z.boolean(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await db.integrativeTherapistProfile.findUnique({
    where: { id: params.id },
    select: { verified: true, userId: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const acura = parsed.data.verified
    ? acuraVolunteerWriteData("ACTIVE", { adminUserId: session.user.id })
    : acuraVolunteerWriteData("REVOKED");

  const updated = await db.integrativeTherapistProfile.update({
    where: { id: params.id },
    data: {
      verified: parsed.data.verified,
      verifiedAt: parsed.data.verified ? new Date() : null,
      verifiedBy: parsed.data.verified ? session.user.id : null,
      ...acura,
    },
  });

  if (parsed.data.verified && !existing.verified) {
    notifyProviderVerifiedApproved(existing.userId, "INTEGRATIVE_THERAPIST").catch((err) =>
      console.error("[verify] integrative therapist email failed:", err),
    );
  } else if (!parsed.data.verified && existing.verified) {
    notifyProviderVerifiedRejected(existing.userId, "INTEGRATIVE_THERAPIST").catch((err) =>
      console.error("[verify] integrative rejection email failed:", err),
    );
  }

  return NextResponse.json({ id: updated.id, verified: updated.verified });
}
