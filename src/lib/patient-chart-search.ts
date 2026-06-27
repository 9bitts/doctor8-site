export type PatientChartSearchable = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
};

function normText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** Filters patient charts by name or email (accent-insensitive). */
export function filterPatientCharts<T extends PatientChartSearchable>(
  charts: T[],
  query: string,
  limitWhenEmpty = 8,
): T[] {
  const q = normText(query.trim());
  if (!q) return charts.slice(0, limitWhenEmpty);
  return charts.filter((c) => {
    const first = normText(c.firstName || "");
    const last = normText(c.lastName || "");
    const full = `${first} ${last}`.trim();
    const email = normText(c.email || "");
    return (
      full.includes(q) ||
      first.includes(q) ||
      last.includes(q) ||
      email.includes(q)
    );
  });
}
