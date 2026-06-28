export type FinanceTxType = "TELECONSULT" | "IN_PERSON" | "JIT";

export function financeTypeLabel(type: string, t: (key: string) => string): string {
  switch (type) {
    case "TELECONSULT": return t("fin.typeTeleconsult");
    case "IN_PERSON": return t("fin.typeInPerson");
    case "JIT": return t("fin.typeJit");
    default: return type;
  }
}

export const FINANCE_TYPE_COLORS: Record<string, string> = {
  TELECONSULT: "bg-brand-100 text-brand-600",
  IN_PERSON: "bg-purple-100 text-purple-700",
  JIT: "bg-brand-100 text-brand-600",
};
