/** US EIN (Employer Identification Number) helpers — XX-XXXXXXX */

export function stripEin(value: string): string {
  return value.replace(/\D/g, "").slice(0, 9);
}

export function formatEin(value: string): string {
  const digits = stripEin(value);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

export function isValidEin(value: string): boolean {
  const digits = stripEin(value);
  return digits.length === 9;
}
