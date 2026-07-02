// src/app/api/patient/medications/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { encrypt, decrypt } from "@/lib/encryption";
import { z } from "zod";

const medicationSchema = z.object({
  name: z.string().min(1).max(200),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  prescribedBy: z.string().optional(),
  notes: z.string().optional(),
  flow: z.enum(["CLINICAL", "PURCHASE"]),
  drugCatalogId: z.string().optional(),
  referencePriceCents: z.number().int().positive().optional(),
}).superRefine((data, ctx) => {
  if (data.flow === "PURCHASE" && !data.drugCatalogId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "PURCHASE medications must be selected from the drug catalog",
      path: ["drugCatalogId"],
    });
  }
});

// GET — list all medications for the logged-in patient
export async function GET() {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;
  const { userId, patientProfileId } = ctx;

  const medications = await db.medication.findMany({
    where: { patientId: patientProfileId, active: true },
    orderBy: [{ flow: "asc" }, { createdAt: "desc" }],
  });

  // HIPAA: audit log
  await audit.viewRecord(userId, "Medication", patientProfileId);

  // Decrypt PHI fields before returning
  const decrypted = medications.map((m) => ({
    ...m,
    name: decrypt(m.name),
    dosage: m.dosage ? decrypt(m.dosage) : null,
    frequency: m.frequency ? decrypt(m.frequency) : null,
    notes: m.notes ? decrypt(m.notes) : null,
    drugCatalogId: m.drugCatalogId,
    referencePriceCents: m.referencePriceCents,
  }));

  return NextResponse.json({ medications: decrypted });
}

// POST — add a new medication
export async function POST(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;
  const { userId, patientProfileId } = ctx;

  const body = await req.json();
  const parsed = medicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, dosage, frequency, prescribedBy, notes, flow, drugCatalogId, referencePriceCents } = parsed.data;

  // Encrypt PHI fields before storing — HIPAA
  const medication = await db.medication.create({
    data: {
      patientId: patientProfileId,
      name: encrypt(name),
      dosage: dosage ? encrypt(dosage) : null,
      frequency: frequency ? encrypt(frequency) : null,
      prescribedBy: prescribedBy || null,
      notes: notes ? encrypt(notes) : null,
      flow,
      drugCatalogId: drugCatalogId || null,
      referencePriceCents: referencePriceCents ?? null,
    },
  });

  await audit.createRecord(userId, "Medication", medication.id);

  return NextResponse.json({ success: true, id: medication.id }, { status: 201 });
}
