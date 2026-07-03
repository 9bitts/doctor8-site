import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseAvailabilityJson } from "@/lib/availability-exceptions";
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

  const professional = await db.professionalProfile.findUnique({
    where: { id: params.id },
    select: { id: true, verified: true, availability: true } as never,
  });
  if (!professional) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const row = professional as {
    id: string;
    verified: boolean;
    availability?: unknown;
  };

  const volunteerBlocks = parseAvailabilityJson(row.availability).volunteerBlocks ?? [];
  if (volunteerBlocks.length === 0 && parsed.data.approved) {
    return NextResponse.json(
      { error: "NO_VOLUNTEER_BLOCKS", code: "no_volunteer_blocks" },
      { status: 400 },
    );
  }

  const now = new Date();
  const updated = await db.professionalProfile.update({
    where: { id: row.id },
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

  return NextResponse.json({ professional: updated });
}
