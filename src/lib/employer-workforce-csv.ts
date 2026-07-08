export type WorkforceCsvRow = {
  email: string;
  firstName: string;
  lastName: string;
  department?: string;
  jobTitle?: string;
};

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

export function parseWorkforceCsv(text: string): { rows: WorkforceCsvRow[]; errors: string[] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { rows: [], errors: ["Arquivo vazio."] };
  }

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const hasHeader = header.some((h) =>
    ["email", "e-mail", "nome", "first_name", "firstname"].includes(h),
  );

  const startIdx = hasHeader ? 1 : 0;
  const emailIdx = hasHeader ? header.findIndex((h) => ["email", "e-mail"].includes(h)) : 0;
  const firstIdx = hasHeader
    ? header.findIndex((h) => ["nome", "first_name", "firstname", "primeiro nome"].includes(h))
    : 1;
  const lastIdx = hasHeader
    ? header.findIndex((h) => ["sobrenome", "last_name", "lastname", "ultimo nome"].includes(h))
    : 2;
  const deptIdx = hasHeader
    ? header.findIndex((h) => ["setor", "department", "departamento"].includes(h))
    : 3;
  const jobIdx = hasHeader
    ? header.findIndex((h) => ["cargo", "job_title", "jobtitle", "funcao"].includes(h))
    : 4;

  const rows: WorkforceCsvRow[] = [];
  const errors: string[] = [];

  for (let i = startIdx; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const lineNo = i + 1;
    const email = (emailIdx >= 0 ? cells[emailIdx] : cells[0])?.toLowerCase().trim();
    const firstName = (firstIdx >= 0 ? cells[firstIdx] : cells[1])?.trim();
    const lastName = (lastIdx >= 0 ? cells[lastIdx] : cells[2])?.trim();

    if (!email || !email.includes("@")) {
      errors.push(`Linha ${lineNo}: e-mail inválido.`);
      continue;
    }
    if (!firstName || !lastName) {
      errors.push(`Linha ${lineNo}: nome e sobrenome obrigatórios.`);
      continue;
    }

    rows.push({
      email,
      firstName,
      lastName,
      department: deptIdx >= 0 ? cells[deptIdx]?.trim() || undefined : undefined,
      jobTitle: jobIdx >= 0 ? cells[jobIdx]?.trim() || undefined : undefined,
    });
  }

  return { rows, errors };
}
