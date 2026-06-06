// src/app/api/patient/history/route.ts
// GET and PUT medical history

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { encrypt, decrypt } from "@/lib/encryption";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const patient = await db.patientProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await audit.viewRecord(session.user.id, "PatientProfile", patient.id);

  return NextResponse.json({
    history: {
      bloodType: patient.bloodType || "",
      allergies: patient.allergies ? decrypt(patient.allergies) : "",
      chronicConditions: patient.chronicConditions ? decrypt(patient.chronicConditions) : "",
      notes: patient.notes ? decrypt(patient.notes) : "",
      // Extended fields stored in notes JSON in real implementation
    },
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const patient = await db.patientProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.patientProfile.update({
    where: { id: patient.id },
    data: {
      bloodType: body.bloodType || null,
      allergies: body.allergies ? encrypt(body.allergies) : null,
      chronicConditions: body.chronicConditions ? encrypt(body.chronicConditions) : null,
      notes: body.notes ? encrypt(JSON.stringify(body)) : null,
    },
  });

  await audit.updateRecord(session.user.id, "PatientProfile", patient.id);
  return NextResponse.json({ success: true });
}
