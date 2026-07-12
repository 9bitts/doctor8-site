import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import {
  buildRoleConflictMessage,
  canAcceptEmployerInvite,
  ROLE_CONFLICT_CODE,
} from "@/lib/portal-invite-compat";

const schema = z.object({ token: z.string().min(16) });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const invite = await db.employerInvite.findUnique({
    where: { token: parsed.data.token },
    include: { employerCompany: true },
  });

  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Convite inválido ou expirado" }, { status: 400 });
  }

  const email = invite.email.toLowerCase();
  if (session.user.email.toLowerCase() !== email) {
    return NextResponse.json({ error: "Faça login com o e-mail do convite." }, { status: 403 });
  }

  if (!canAcceptEmployerInvite(session.user.role)) {
    return NextResponse.json(
      {
        error: buildRoleConflictMessage(session.user.role, "empresa"),
        code: ROLE_CONFLICT_CODE,
        currentRole: session.user.role,
      },
      { status: 409 },
    );
  }

  const existingMember = await db.employerMember.findUnique({
    where: {
      employerCompanyId_userId: {
        employerCompanyId: invite.employerCompanyId,
        userId: session.user.id,
      },
    },
  });
  if (existingMember) {
    return NextResponse.json({ success: true, redirectTo: "/empresas/painel" });
  }

  await db.$transaction(async (tx) => {
    await tx.employerMember.create({
      data: {
        employerCompanyId: invite.employerCompanyId,
        userId: session.user.id,
        role: invite.role,
        status: "ACTIVE",
        invitedAt: invite.createdAt,
      },
    });

    await tx.employerInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
  });

  return NextResponse.json({ success: true, redirectTo: "/empresas/painel" });
}
