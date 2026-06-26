import { NextRequest, NextResponse } from "next/server";
import { requireProfessional } from "@/lib/psychology-api";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  inviteCode: z.string().min(6).max(40),
});

export async function POST(req: NextRequest) {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional } = ctx;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const already = await db.clinicMember.findFirst({
    where: { professionalId: professional.id },
  });
  if (already) {
    return NextResponse.json({ error: "ALREADY_IN_CLINIC" }, { status: 400 });
  }

  const clinic = await db.clinic.findUnique({
    where: { inviteCode: parsed.data.inviteCode.trim() },
  });
  if (!clinic) {
    return NextResponse.json({ error: "CLINIC_NOT_FOUND" }, { status: 404 });
  }

  await db.clinicMember.create({
    data: {
      clinicId: clinic.id,
      professionalId: professional.id,
      role: "MEMBER",
    },
  });

  return NextResponse.json({
    clinic: { id: clinic.id, name: clinic.name, role: "MEMBER" },
  });
}
