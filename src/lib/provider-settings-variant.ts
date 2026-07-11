/** Portal-specific copy for shared provider settings components. */
export type ProviderSettingsVariant = "psychoanalyst" | "integrative_therapist";

export function isPsychoanalystVariant(
  variant?: ProviderSettingsVariant,
): variant is "psychoanalyst" {
  return variant === "psychoanalyst";
}

export function isIntegrativeTherapistVariant(
  variant?: ProviderSettingsVariant,
): variant is "integrative_therapist" {
  return variant === "integrative_therapist";
}

export function variantI18nKey(
  variant: ProviderSettingsVariant | undefined,
  defaultKey: string,
  psychoanalystKey: string,
  integrativeKey?: string,
): string {
  if (variant === "psychoanalyst") return psychoanalystKey;
  if (variant === "integrative_therapist" && integrativeKey) return integrativeKey;
  return defaultKey;
}
