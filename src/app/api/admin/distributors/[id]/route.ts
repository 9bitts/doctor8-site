import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { verifyB2BOwnerEmail } from "@/lib/b2b-admin";

const patchSchema = z.object({
  status: z.enum(["PENDING_REVIEW", "ACTIVE", "SUSPENDED"]).optional(),
  platformFeePercent: z.number().int().min(0).max(100).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const distributor = await db.distributor.update({
    where: { id },
    data: parsed.data,
  });

  if (parsed.data.status === "ACTIVE") {
    const owner = await db.distributorMember.findFirst({
      where: { distributorId: id, role: "OWNER" },
      select: {
        userId: true,
        user: { select: { email: true } },
      },
    });
    if (owner) {
      await verifyB2BOwnerEmail(owner.userId, owner.user.email);
    }
  }

  return NextResponse.json({ distributor });
}
