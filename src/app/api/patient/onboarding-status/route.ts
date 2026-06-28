import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { hasTelemedicineTcle } from "@/lib/consent/telemedicine-tcle";
import { isPatientHistoryFilled } from "@/lib/patient-history-status";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return String(v ?? ""); }
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const patient = await db.patientProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      addressLine1: true,
      city: true,
      notes: true,
    },
  });
  if (!patient) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const firstName = safeDecrypt(patient.firstName);
  const lastName = safeDecrypt(patient.lastName);
  const address = safeDecrypt(patient.addressLine1) || patient.city || "";

  const [appointmentCount, documentCount, tcleGranted, subscription] = await Promise.all([
    db.appointment.count({ where: { patientId: patient.id } }),
    db.medicalDocument.count({ where: { patientId: patient.id } }),
    hasTelemedicineTcle(session.user.id),
    db.subscription.findUnique({
      where: { userId: session.user.id },
      select: { status: true },
    }),
  ]);

  return NextResponse.json({
    hasProfile: !!(firstName && lastName && patient.dateOfBirth && address),
    hasHistory: isPatientHistoryFilled(patient.notes),
    hasTcle: tcleGranted,
    hasAppointment: appointmentCount > 0,
    hasDocument: documentCount > 0,
    hasClub: !!subscription && ["active", "trialing"].includes(subscription.status),
  });
}
