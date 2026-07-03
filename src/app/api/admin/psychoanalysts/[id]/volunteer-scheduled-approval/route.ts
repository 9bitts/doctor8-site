import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  approved: z.boolean(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const psychoanalyst = await db.psychoanalystProfile.findUnique({
    where: { id: params.id },
    select: { id: true, verified: true },
  });
  if (!psychoanalyst) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (parsed.data.approved) {
    const volunteerSlot = await db.psychoanalystAvailabilitySlot.findFirst({
      where: { psychoanalystId: params.id, isActive: true, volunteerOnly: true },
      select: { id: true },
    });
    if (!volunteerSlot) {
      return NextResponse.json(
        { error: "NO_VOLUNTEER_BLOCKS", code: "no_volunteer_blocks" },
        { status: 400 },
      );
    }
  }

  const now = new Date();
  const updated = await db.psychoanalystProfile.update({
    where: { id: psychoanalyst.id },
    data: parsed.data.approved
      ? {
          volunteerScheduledApproved: true,
          volunteerScheduledApprovedAt: now,
          volunteerScheduledApprovedBy: session.user.id,
        }
      : {
          volunteerScheduledApproved: false,
          volunteerScheduledApprovedAt: null,
          volunteerScheduledApprovedBy: null,
        },
    select: {
      id: true,
      volunteerScheduledApproved: true,
      volunteerScheduledApprovedAt: true,
      volunteerScheduledApprovedBy: true,
    } as never,
  });

  return NextResponse.json({ psychoanalyst: updated });
}
