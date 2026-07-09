import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

const patchSchema = z.object({
  status: z.enum(["PENDING_REVIEW", "ACTIVE", "SUSPENDED"]).optional(),
  platformFeeCents: z.number().int().min(0).optional(),
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

  const laboratory = await db.laboratory.update({
    where: { id },
    data: parsed.data,
  });

  if (parsed.data.status === "ACTIVE") {
    const owner = await db.laboratoryMember.findFirst({
      where: { laboratoryId: id, role: "OWNER" },
      select: {
        userId: true,
        user: { select: { email: true, emailVerified: true, phoneVerified: true } },
      },
    });
    if (owner?.user && !owner.user.emailVerified && !owner.user.phoneVerified) {
      await db.user.update({
        where: { id: owner.userId },
        data: { emailVerified: new Date(), failedLoginAttempts: 0, lockedUntil: null },
      });
      if (owner.user.email) {
        await db.verificationToken.deleteMany({ where: { identifier: owner.user.email } });
      }
    }
  }

  return NextResponse.json({ laboratory });
}
