/** Fields required on a patient chart before issuing a prescription. */

export function computeMissingForRx(r: {
  firstName: string | null;
  lastName: string | null;
  dobDecrypted: string | null;
  addressLine1: string | null;
  city: string | null;
}): string[] {
  const missing: string[] = [];
  if (!(r.firstName && r.lastName)) missing.push("name");
  if (!(r.addressLine1 || r.city)) missing.push("address");
  if (!r.dobDecrypted) missing.push("dob");
  return missing;
}
