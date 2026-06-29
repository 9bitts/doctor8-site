import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireIntegrativeTherapist, safeDecrypt } from "@/lib/integrative-therapist-api";
import type { IntegrativeConsultContext } from "@/lib/integrative-consult-context";

export async function GET(req: NextRequest) {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const appointmentId = req.nextUrl.searchParams.get("appointmentId");
  const clientId = req.nextUrl.searchParams.get("clientId");

  if (!appointmentId && !clientId) {
    return NextResponse.json({ error: "appointmentId or clientId required" }, { status: 400 });
  }

  let record = null as Awaited<ReturnType<typeof db.integrativeClientRecord.findFirst>>;
  let appointment = null as Awaited<ReturnType<typeof db.appointment.findFirst>>;

  if (appointmentId) {
    appointment = await db.appointment.findFirst({
      where: {
        id: appointmentId,
        integrativeTherapistId: therapist.id,
        status: { in: ["CONFIRMED", "PENDING", "COMPLETED"] },
      },
      include: {
        patient: { select: { userId: true, firstName: true, lastName: true } },
      },
    });
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const { ensureIntegrativeClientForPatient } = await import("@/lib/providers");
    const patientUser = await db.user.findUnique({
      where: { id: appointment.patient.userId },
      select: { email: true },
    });
    if (patientUser) {
      record = await ensureIntegrativeClientForPatient({
        integrativeTherapistId: therapist.id,
        patientUserId: appointment.patient.userId,
        patientProfile: {
          firstName: safeDecrypt(appointment.patient.firstName),
          lastName: safeDecrypt(appointment.patient.lastName),
        },
        patientEmail: patientUser.email,
      });
    }
  } else if (clientId) {
    record = await db.integrativeClientRecord.findFirst({
      where: { id: clientId, integrativeTherapistId: therapist.id },
    });
    if (!record) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
  }

  if (!record) {
    return NextResponse.json({ error: "Client record not found" }, { status: 404 });
  }

  const priorSessionCount = await db.medicalDocument.count({
    where: {
      integrativeClientRecordId: record.id,
      integrativeTherapistId: therapist.id,
      type: "CLINICAL_NOTE",
    },
  });

  const context: IntegrativeConsultContext = {
    clientId: record.id,
    clientFirstName: safeDecrypt(record.firstName),
    clientLastName: safeDecrypt(record.lastName),
    mainPractice: record.mainPractice,
    chiefComplaint: record.chiefComplaint,
    treatmentGoals: record.treatmentGoals,
    picsPractices: therapist.picsPractices,
    priorSessionCount,
    defaultVisitType: priorSessionCount === 0 ? "first" : "return",
    appointment: appointment
      ? {
          id: appointment.id,
          scheduledAt: appointment.scheduledAt.toISOString(),
          type: appointment.type,
          durationMins: appointment.durationMins,
          status: appointment.status,
        }
      : null,
  };

  return NextResponse.json({ context });
}
