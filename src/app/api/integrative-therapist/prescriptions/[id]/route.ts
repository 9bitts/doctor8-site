import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { requireIntegrativeTherapist } from "@/lib/integrative-therapist-api";
import { integrativeMedicationItemSchema } from "@/lib/prescription-medication-schema";

const patchSchema = z.object({
  medications: z.array(integrativeMedicationItemSchema()).min(1),
  instructions: z.string().optional(),
  validDays: z.number().min(1).max(365).default(30),
});

/** PATCH — update an unsigned prescription before deliver. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const prescription = await db.prescription.findFirst({
    where: {
      id: params.id,
      integrativeTherapistId: therapist.id,
    },
  });

  if (!prescription) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (prescription.signatureStatus === "SIGNED") {
    return NextResponse.json({ error: "Signed prescriptions cannot be edited" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { medications, instructions, validDays } = parsed.data;
  const validUntil = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000);

  await db.prescription.update({
    where: { id: prescription.id },
    data: {
      medications: medications as Prisma.InputJsonValue,
      instructions: instructions?.trim() ? encrypt(instructions.trim()) : null,
      validUntil,
    },
  });

  return NextResponse.json({ success: true, prescriptionId: prescription.id });
}
