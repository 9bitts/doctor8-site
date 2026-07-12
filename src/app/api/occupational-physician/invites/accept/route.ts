import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import {
  buildRoleConflictMessage,
  canAcceptOccupationalPhysicianInvite,
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

  const link = await db.employerOccupationalPhysician.findUnique({
    where: { inviteToken: parsed.data.token },
    include: { employerCompany: true },
  });

  if (
    !link ||
    link.status === "DISABLED" ||
    (link.expiresAt && link.expiresAt < new Date())
  ) {
    return NextResponse.json({ error: "Convite inválido ou expirado" }, { status: 400 });
  }

  const email = link.email.toLowerCase();
  if (session.user.email.toLowerCase() !== email) {
    return NextResponse.json({ error: "Faça login com o e-mail do convite." }, { status: 403 });
  }

  if (!canAcceptOccupationalPhysicianInvite(session.user.role)) {
    return NextResponse.json(
      {
        error: buildRoleConflictMessage(session.user.role, "médico do trabalho"),
        code: ROLE_CONFLICT_CODE,
        currentRole: session.user.role,
      },
      { status: 409 },
    );
  }

  if (link.userId === session.user.id && link.status === "ACTIVE") {
    return NextResponse.json({ success: true, redirectTo: "/empresas/medico/painel" });
  }

  const existingActive = await db.employerOccupationalPhysician.findFirst({
    where: {
      employerCompanyId: link.employerCompanyId,
      userId: session.user.id,
      status: "ACTIVE",
    },
  });
  if (existingActive) {
    return NextResponse.json({ success: true, redirectTo: "/empresas/medico/painel" });
  }

  await db.$transaction(async (tx) => {
    await tx.employerOccupationalPhysician.update({
      where: { id: link.id },
      data: {
        userId: session.user.id,
        status: "ACTIVE",
        inviteToken: null,
        joinedAt: new Date(),
      },
    });
  });

  return NextResponse.json({ success: true, redirectTo: "/empresas/medico/painel" });
}
