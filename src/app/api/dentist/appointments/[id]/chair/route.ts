import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireDentistProfessional } from "@/lib/dentistry/dentistry-api";

const patchSchema = z.object({
  dentalChairId: z.string().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireDentistProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional } = ctx;

  const appointment = await db.appointment.findFirst({
    where: { id: params.id, professionalId: professional.id },
    select: { id: true },
  });
  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.dentalChairId) {
    const chair = await db.dentalChair.findFirst({
      where: {
        id: parsed.data.dentalChairId,
        professionalId: professional.id,
        active: true,
      },
    });
    if (!chair) {
      return NextResponse.json({ error: "Chair not found" }, { status: 404 });
    }
  }

  const updated = await db.appointment.update({
    where: { id: params.id },
    data: { dentalChairId: parsed.data.dentalChairId },
    select: {
      id: true,
      dentalChairId: true,
      dentalChair: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    id: updated.id,
    dentalChairId: updated.dentalChairId,
    dentalChairName: updated.dentalChair?.name ?? null,
  });
}
