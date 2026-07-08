// Appointment statuses that let a patient share documents with that doctor.
// CONFIRMED = paid + scheduled; COMPLETED = consult already happened (same as messaging).
export const PATIENT_DOCTOR_ELIGIBLE_STATUSES = ["CONFIRMED", "COMPLETED"] as const;

/** Days after cancellation during which the patient may still share documents with that doctor. */
export const PATIENT_DOCTOR_CANCEL_GRACE_DAYS = 30;

export function patientDoctorCancelGraceCutoff(now = new Date()): Date {
  return new Date(now.getTime() - PATIENT_DOCTOR_CANCEL_GRACE_DAYS * 24 * 60 * 60 * 1000);
}

/** Prisma `where` clause: patient has share eligibility with an optional professional filter. */
export function patientDoctorEligibleAppointmentWhere(
  patientProfileId: string,
  professionalId?: string,
) {
  const graceCutoff = patientDoctorCancelGraceCutoff();
  return {
    patientId: patientProfileId,
    ...(professionalId ? { professionalId } : {}),
    OR: [
      { status: { in: [...PATIENT_DOCTOR_ELIGIBLE_STATUSES] } },
      {
        status: "CANCELLED" as const,
        cancelledAt: { gte: graceCutoff },
      },
    ],
  };
}
