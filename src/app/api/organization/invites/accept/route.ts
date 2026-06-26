import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const acceptSchema = z.object({ token: z.string().min(16) });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = acceptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const invite = await db.organizationInvite.findUnique({
    where: { token: parsed.data.token },
  });

  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "INVALID_OR_EXPIRED" }, { status: 400 });
  }

  if (invite.email.toLowerCase() !== session.user.email?.toLowerCase()) {
    return NextResponse.json({ error: "EMAIL_MISMATCH" }, { status: 403 });
  }

  if (session.user.role !== "ORGANIZATION" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "WRONG_ROLE" }, { status: 403 });
  }

  const existing = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: invite.organizationId,
        userId: session.user.id,
      },
    },
  });
  if (existing) {
    return NextResponse.json({ error: "ALREADY_MEMBER" }, { status: 400 });
  }

  await db.$transaction([
    db.organizationMember.create({
      data: {
        organizationId: invite.organizationId,
        userId: session.user.id,
        role: invite.role,
        status: "ACTIVE",
        invitedAt: invite.createdAt,
      },
    }),
    db.organizationInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ success: true });
}
