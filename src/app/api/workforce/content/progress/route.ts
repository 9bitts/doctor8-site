import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWorkforceMembershipForUser } from "@/lib/employer-workforce";
import { getContentAsset } from "@/lib/employer-content-assets";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const contentId = body?.contentId as string | undefined;
  const progressSecs = typeof body?.progressSecs === "number" ? body.progressSecs : 0;
  const completed = Boolean(body?.completed);

  if (!contentId) {
    return NextResponse.json({ error: "Missing contentId" }, { status: 400 });
  }

  const membership = await getWorkforceMembershipForUser(session.user.id, session.user.email);
  if (!membership) {
    return NextResponse.json({ error: "No active benefit" }, { status: 404 });
  }

  const asset = await getContentAsset(contentId);
  const format = asset?.format ?? "text";

  const existing = await db.employerContentProgress.findFirst({
    where: {
      employerCompanyId: membership.employerCompanyId,
      workforceMemberId: membership.id,
      contentId,
    },
  });

  if (existing) {
    await db.employerContentProgress.update({
      where: { id: existing.id },
      data: {
        progressSecs: Math.max(existing.progressSecs, progressSecs),
        format,
        ...(completed ? { completedAt: new Date() } : {}),
      },
    });
  } else {
    await db.employerContentProgress.create({
      data: {
        employerCompanyId: membership.employerCompanyId,
        workforceMemberId: membership.id,
        contentId,
        progressSecs,
        format,
        completedAt: completed ? new Date() : undefined,
      },
    });
  }

  return NextResponse.json({ success: true });
}
