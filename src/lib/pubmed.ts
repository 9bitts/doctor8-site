// PubMed E-utilities client — live search over NCBI Entrez (no local index).

const EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const REQUEST_TIMEOUT_MS = 15_000;

export type PubMedArticleSummary = {
  pmid: string;
  title: string;
  authors: string[];
  journal: string;
  year: string;
  pubDate?: string;
  abstract?: string;
};

function eutilsParams(extra: Record<string, string>): URLSearchParams {
  const params = new URLSearchParams({
    tool: "doctor8",
    email: process.env.NCBI_TOOL_EMAIL || "support@doctor8.org",
    ...extra,
  });
  const apiKey = process.env.NCBI_API_KEY?.trim();
  if (apiKey) params.set("api_key", apiKey);
  return params;
}

async function eutilsFetch(path: string, params: Record<string, string>): Promise<Response> {
  const url = `${EUTILS_BASE}/${path}?${eutilsParams(params).toString()}`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { Accept: "application/json, text/plain, */*" },
  });
  if (!response.ok) {
    console.error("[PUBMED]", path, response.status, await response.text().catch(() => ""));
    throw new Error("PUBMED_FAILED");
  }
  return response;
}

export async function searchPubMed(
  query: string,
  opts?: { retmax?: number },
): Promise<string[]> {
  const retmax = String(opts?.retmax ?? 20);
  const response = await eutilsFetch("esearch.fcgi", {
    db: "pubmed",
    term: query,
    retmode: "json",
    retmax,
  });
  const data = await response.json();
  const idlist: string[] = data?.esearchresult?.idlist ?? [];
  return idlist.filter(Boolean);
}

function extractYear(pubdate: string | undefined): string {
  if (!pubdate) return "";
  const match = pubdate.match(/\b(19|20)\d{2}\b/);
  return match?.[0] ?? pubdate.slice(0, 4);
}

export async function fetchSummaries(pmids: string[]): Promise<PubMedArticleSummary[]> {
  if (pmids.length === 0) return [];

  const response = await eutilsFetch("esummary.fcgi", {
    db: "pubmed",
    id: pmids.join(","),
    retmode: "json",
  });
  const data = await response.json();
  const result = data?.result;
  if (!result) throw new Error("PUBMED_FAILED");

  return pmids.reduce<PubMedArticleSummary[]>((acc, pmid) => {
    const item = result[pmid];
    if (!item || item.error) return acc;
    const authors: string[] = Array.isArray(item.authors)
      ? item.authors.map((a: { name?: string }) => a.name).filter(Boolean)
      : [];
    const pubDate = item.pubdate as string | undefined;
    acc.push({
      pmid,
      title: (item.title as string | undefined)?.replace(/\.$/, "") || "Untitled",
      authors,
      journal: (item.fulljournalname as string) || (item.source as string) || "",
      year: extractYear(pubDate),
      pubDate,
    });
    return acc;
  }, []);
}

/** Parse efetch abstract text blocks keyed by PMID. */
export async function fetchAbstracts(pmids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (pmids.length === 0) return map;

  const response = await eutilsFetch("efetch.fcgi", {
    db: "pubmed",
    id: pmids.join(","),
    rettype: "abstract",
    retmode: "text",
  });
  const text = await response.text();
  if (!text.trim()) return map;

  const blocks = text.split(/\n(?=PMID-\s)/);
  for (const block of blocks) {
    const pmidMatch = block.match(/^PMID-\s*(\d+)/m);
    if (!pmidMatch) continue;
    const pmid = pmidMatch[1];
    const abstractMatch = block.match(/\nAB\s*-\s*([\s\S]*?)(?=\n[A-Z]{2,}\s*-|\n*$)/);
    if (abstractMatch) {
      const abstract = abstractMatch[1]
        .replace(/\n\s+/g, " ")
        .trim();
      if (abstract) map.set(pmid, abstract);
    }
  }

  return map;
}

export function pubmedArticleUrl(pmid: string): string {
  return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
}
