/**
 * Optional ANVISA bulário fetch for batch import scripts.
 * The public API may block server requests (403); this module fails gracefully.
 */
const ANVISA_SEARCH_URL =
  "https://consultas.anvisa.gov.br/api/documento/bulario";

export type AnvisaBularioHit = {
  processNumber: string;
  productName: string;
  activeIngredient: string;
  manufacturer?: string;
  professionalLeafletId?: string;
  patientLeafletId?: string;
};

export async function searchAnvisaBulario(
  name: string,
  page = 1,
): Promise<AnvisaBularioHit[]> {
  const url = `${ANVISA_SEARCH_URL}?nome=${encodeURIComponent(name.trim())}&pagina=${page}`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent":
          "Mozilla/5.0 (compatible; Doctor8/1.0; +https://doctor8.com.br) health-platform",
        Referer: "https://consultas.anvisa.gov.br/",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const list = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
    return list
      .map((row: Record<string, unknown>) => {
        const med = (row.medicamento || row) as Record<string, unknown>;
        return {
          processNumber: String(med.numeroProcesso || med.numeroRegistro || row.numero || ""),
          productName: String(med.nome || med.nomeProduto || name),
          activeIngredient: String(med.principioAtivo || med.substancia || ""),
          manufacturer: String(
            (row.empresaFarmaceutica as Record<string, unknown> | undefined)?.razaoSocial || "",
          ) || undefined,
          professionalLeafletId: String(
            row.idBulaProfissionalProtegido || row.idBulaProfissional || "",
          ) || undefined,
        } satisfies AnvisaBularioHit;
      })
      .filter((h: AnvisaBularioHit) => h.processNumber || h.productName);
  } catch {
    return [];
  }
}

export function anvisaProfessionalPdfUrl(leafletId: string): string {
  return `https://consultas.anvisa.gov.br/api/documento/bula/pdf/${encodeURIComponent(leafletId)}`;
}
