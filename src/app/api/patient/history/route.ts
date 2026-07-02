// src/app/api/patient/history/route.ts
// GET and PUT the complete medical history (anamnesis).
// Strategy: dedicated columns (bloodType, allergies, chronicConditions) are kept
// for quick access, and the FULL structured questionnaire is stored as encrypted
// JSON in `notes`. This lets us add as many fields as we want without DB changes.

import { NextRequest, NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { encrypt, decrypt } from "@/lib/encryption";

export async function GET() {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const patient = await db.patientProfile.findUnique({
    where: { userId: ctx.userId },
  });
  if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await audit.viewRecord(ctx.userId, "PatientProfile", patient.id);

  // The full questionnaire lives as JSON inside `notes`.
  let full: Record<string, unknown> = {};
  if (patient.notes) {
    try {
      full = JSON.parse(decrypt(patient.notes));
    } catch {
      full = {};
    }
  }

  // Make sure the quick-access columns win if present
  const history = {
    ...full,
    bloodType: patient.bloodType || (full.bloodType as string) || "",
    allergies: patient.allergies ? decrypt(patient.allergies) : (full.allergies as string) || "",
    chronicConditions:
      Array.isArray(full.chronicConditions)
        ? full.chronicConditions
        : patient.chronicConditions
        ? decrypt(patient.chronicConditions)
        : [],
  };

  return NextResponse.json({ history });
}

export async function PUT(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const body = await req.json();

  const patient = await db.patientProfile.findUnique({
    where: { userId: ctx.userId },
  });
  if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // chronicConditions may come as an array (chips) — normalize for the column
  const chronicForColumn = Array.isArray(body.chronicConditions)
    ? body.chronicConditions.join(", ")
    : body.chronicConditions || "";

  await db.patientProfile.update({
    where: { id: patient.id },
    data: {
      bloodType: body.bloodType || null,
      allergies: body.allergies ? encrypt(body.allergies) : null,
      chronicConditions: chronicForColumn ? encrypt(chronicForColumn) : null,
      // Full structured questionnaire (everything) as encrypted JSON
      notes: encrypt(JSON.stringify(body)),
    },
  });

  await audit.updateRecord(ctx.userId, "PatientProfile", patient.id);
  return NextResponse.json({ success: true });
}
