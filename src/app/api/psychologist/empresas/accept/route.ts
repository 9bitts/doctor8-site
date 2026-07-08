import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({ token: z.string().min(16) });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const link = await db.employerLinkedPsychologist.findUnique({
    where: { inviteToken: parsed.data.token },
    include: {
      employerCompany: { select: { nomeFantasia: true } },
      professional: { select: { id: true, userId: true } },
    },
  });

  if (!link || link.status === "INACTIVE" || (link.expiresAt && link.expiresAt < new Date())) {
    return NextResponse.json({ error: "Convite inválido ou expirado" }, { status: 400 });
  }

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!professional || professional.id !== link.professionalId) {
    return NextResponse.json(
      { error: "Faça login como o psicólogo credenciado." },
      { status: 403 },
    );
  }

  if (link.status === "ACTIVE") {
    return NextResponse.json({ success: true, redirectTo: "/psychologist/empresas" });
  }

  await db.employerLinkedPsychologist.update({
    where: { id: link.id },
    data: {
      status: "ACTIVE",
      inviteToken: null,
      expiresAt: null,
      joinedAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    companyName: link.employerCompany.nomeFantasia,
    redirectTo: "/psychologist/empresas",
  });
}
