// src/app/api/patient/doctors/route.ts
// GET — list the doctors this patient is allowed to share documents with.
// Eligibility: CONFIRMED/COMPLETED appointment, or CANCELLED within the grace period.
import { NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { patientDoctorEligibleAppointmentWhere } from "@/lib/patient-doctor-eligibility";

export async function GET() {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;
  const { patientProfileId } = ctx;

  const appts = await db.appointment.findMany({
    where: patientDoctorEligibleAppointmentWhere(patientProfileId),
    select: {
      professional: {
        select: {
          id: true,
          userId: true,
          firstName: true,
          lastName: true,
          specialty: true,
        },
      },
    },
  });

  const map = new Map<string, { professionalId: string; userId: string; name: string; specialty: string }>();
  for (const a of appts) {
    const p = a.professional;
    if (!p) continue;
    if (!map.has(p.id)) {
      map.set(p.id, {
        professionalId: p.id,
        userId: p.userId,
        name: `Dr. ${p.firstName} ${p.lastName}`,
        specialty: p.specialty,
      });
    }
  }

  return NextResponse.json({ doctors: Array.from(map.values()) });
}
