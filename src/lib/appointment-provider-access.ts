/** Psychoanalysts must never receive pre-consult intake / shared history via appointment APIs. */
export function isPsychoanalystAppointmentRequest(role: string | undefined): boolean {
  return role === "PSYCHOANALYST";
}

export function stripPsychoanalystAppointmentFields<T extends Record<string, unknown>>(row: T): T {
  const { chiefComplaint: _c, notes: _n, ...rest } = row;
  return rest as T;
}
