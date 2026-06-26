import { NextRequest, NextResponse } from "next/server";
import { requireProfessional } from "@/lib/psychology-api";
import { db } from "@/lib/db";
import { getClinicForProfessional } from "@/lib/chart-access";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(2).max(120),
});

export async function GET() {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional } = ctx;

  const membership = await getClinicForProfessional(professional.id);
  if (!membership) {
    return NextResponse.json({ clinic: null });
  }

  return NextResponse.json({
    clinic: {
      id: membership.clinic.id,
      name: membership.clinic.name,
      inviteCode: membership.clinic.inviteCode,
      role: membership.role,
      members: membership.clinic.members.map((m) => ({
        id: m.id,
        professionalId: m.professional.id,
        name: `Dr. ${m.professional.firstName} ${m.professional.lastName}`,
        specialty: m.professional.specialty,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      })),
    },
  });
}

export async function POST(req: NextRequest) {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const existing = await db.clinicMember.findFirst({
    where: { professionalId: professional.id },
  });
  if (existing) {
    return NextResponse.json({ error: "ALREADY_IN_CLINIC" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const clinic = await db.clinic.create({
    data: {
      name: parsed.data.name,
      members: {
        create: {
          professionalId: professional.id,
          role: "OWNER",
        },
      },
    },
  });

  return NextResponse.json({
    clinic: {
      id: clinic.id,
      name: clinic.name,
      inviteCode: clinic.inviteCode,
      role: "OWNER",
    },
  }, { status: 201 });
}
