// Appointment statuses that let a patient share documents with that doctor.
// CONFIRMED = paid + scheduled; COMPLETED = consult already happened (same as messaging).
export const PATIENT_DOCTOR_ELIGIBLE_STATUSES = ["CONFIRMED", "COMPLETED"] as const;
