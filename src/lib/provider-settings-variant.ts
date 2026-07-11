/** Portal-specific copy for shared provider settings components. Only psychoanalyst today. */
export type ProviderSettingsVariant = "psychoanalyst";

export function isPsychoanalystVariant(
  variant?: ProviderSettingsVariant,
): variant is "psychoanalyst" {
  return variant === "psychoanalyst";
}

export function variantI18nKey(
  variant: ProviderSettingsVariant | undefined,
  defaultKey: string,
  psychoanalystKey: string,
): string {
  return variant === "psychoanalyst" ? psychoanalystKey : defaultKey;
}
