import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  approved: z.boolean(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { userId: string } },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date();
  const user = await db.user.update({
    where: { id: params.userId },
    data: parsed.data.approved
      ? {
          courseCreatorApproved: true,
          courseCreatorApprovedAt: now,
          courseCreatorApprovedBy: session.user.id,
        }
      : {
          courseCreatorApproved: false,
          courseCreatorApprovedAt: null,
          courseCreatorApprovedBy: null,
        },
    select: {
      id: true,
      email: true,
      courseCreatorApproved: true,
      courseCreatorApprovedAt: true,
    },
  });

  return NextResponse.json({ user });
}
