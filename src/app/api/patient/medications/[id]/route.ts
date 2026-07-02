// src/app/api/patient/medications/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { encrypt, decrypt } from "@/lib/encryption";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(200),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  prescribedBy: z.string().optional(),
  notes: z.string().optional(),
  flow: z.enum(["CLINICAL", "PURCHASE"]),
});

async function getOwnedMedication(patientProfileId: string, id: string) {
  const medication = await db.medication.findFirst({
    where: { id, patientId: patientProfileId, active: true },
  });
  if (!medication) return null;
  return { medication };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;
  const { userId, patientProfileId } = ctx;

  const owned = await getOwnedMedication(patientProfileId, params.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, dosage, frequency, prescribedBy, notes, flow } = parsed.data;

  await db.medication.update({
    where: { id: params.id },
    data: {
      name: encrypt(name),
      dosage: dosage ? encrypt(dosage) : null,
      frequency: frequency ? encrypt(frequency) : null,
      prescribedBy: prescribedBy || null,
      notes: notes ? encrypt(notes) : null,
      flow,
    },
  });

  await audit.updateRecord(userId, "Medication", params.id);

  return NextResponse.json({
    medication: {
      id: params.id,
      name,
      dosage: dosage || null,
      frequency: frequency || null,
      prescribedBy: prescribedBy || null,
      notes: notes || null,
      flow,
      active: true,
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;
  const { userId, patientProfileId } = ctx;

  const owned = await getOwnedMedication(patientProfileId, params.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.medication.update({
    where: { id: params.id },
    data: { active: false },
  });

  await audit.deleteRecord(userId, "Medication", params.id);

  return NextResponse.json({ success: true });
}
