export const MAX_CSV_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_CSV_IMPORT_ROWS = 10_000;

export function assertCsvImportSize(byteLength: number): string | null {
  if (byteLength > MAX_CSV_IMPORT_BYTES) {
    return `Arquivo excede o limite de ${MAX_CSV_IMPORT_BYTES / (1024 * 1024)}MB`;
  }
  return null;
}

export function assertCsvRowCount(rows: number): string | null {
  if (rows > MAX_CSV_IMPORT_ROWS) {
    return `Importação excede o limite de ${MAX_CSV_IMPORT_ROWS} linhas`;
  }
  return null;
}
