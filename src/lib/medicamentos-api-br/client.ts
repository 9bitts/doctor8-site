import type {
  MedicamentosApiBrReference,
  MedicamentosApiBrSearchHit,
} from "./types";

const BASE_URL =
  process.env.MEDICAMENTOS_API_BR_BASE_URL?.trim() ||
  "https://medicamentos.api.br";

const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12h

type CacheEntry<T> = { expiresAt: number; value: T };
const listCache = new Map<string, CacheEntry<MedicamentosApiBrSearchHit[]>>();
const detailCache = new Map<string, CacheEntry<MedicamentosApiBrReference | null>>();

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseBrlToCents(value: string): number {
  const normalized = value.replace(/\./g, "").replace(",", ".").trim();
  const num = Number(normalized);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.round(num * 100);
}

function readCache<T>(map: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const hit = map.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) {
    map.delete(key);
    return undefined;
  }
  return hit.value;
}

function writeCache<T>(map: Map<string, CacheEntry<T>>, key: string, value: T) {
  map.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
}

async function fetchHtml(path: string): Promise<string | null> {
  try {
    const url = new URL(path, BASE_URL);
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "text/html",
        "User-Agent": "Doctor8/1.0 (health platform; CMED reference lookup)",
      },
      next: { revalidate: 60 * 60 * 12 },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function parseIngredientListing(html: string): MedicamentosApiBrSearchHit[] {
  const hits: MedicamentosApiBrSearchHit[] = [];
  const cardRegex =
    /href="(\/medicamento\/[^"]+)"[\s\S]*?<h3[^>]*>([^<]+)<\/h3>[\s\S]*?A partir de[\s\S]*?R\$\s*(?:<!--\s*-->)?([\d.,]+)/gi;

  let match: RegExpExecArray | null;
  while ((match = cardRegex.exec(html)) !== null) {
    const slug = match[1].replace("/medicamento/", "");
    const name = match[2].replace(/\s+/g, " ").trim();
    const priceCents = parseBrlToCents(match[3]);
    if (!slug || !name || !priceCents) continue;

    hits.push({
      slug,
      name,
      priceCents,
      sourceUrl: new URL(`/medicamento/${slug}`, BASE_URL).toString(),
      isGeneric: /classificacao\/generico/i.test(match[0]),
    });
  }

  return hits;
}

function parseMedicamentoDetail(html: string, slug: string): MedicamentosApiBrReference | null {
  const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const name = titleMatch?.[1]?.replace(/\s+/g, " ").trim();
  if (!name) return null;

  const priceMatch = html.match(
    /Pre?o m?ximo[\s\S]*?R\$\s*(?:<!--\s*-->)?([\d.,]+)[\s\S]*?PF CMED/i
  );
  const priceCents = priceMatch ? parseBrlToCents(priceMatch[1]) : 0;
  if (!priceCents) return null;

  const tableMatch = html.match(/Tabela CMED\s*?\s*([^<]+)/i);

  return {
    slug,
    name,
    priceCents,
    priceType: "PF_CMED",
    source: "medicamentos.api.br",
    sourceUrl: new URL(`/medicamento/${slug}`, BASE_URL).toString(),
    cmedTableLabel: tableMatch?.[1]?.trim(),
  };
}

function normName(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function scoreNameMatch(query: string, candidate: string): number {
  const q = normName(query);
  const c = normName(candidate);
  if (q === c) return 100;
  if (c.includes(q) || q.includes(c)) return 80;
  const qTokens = q.split(/\s+/).filter(Boolean);
  const matched = qTokens.filter((t) => c.includes(t)).length;
  return matched * 10;
}

export async function searchByActiveIngredient(
  activeIngredient: string
): Promise<MedicamentosApiBrSearchHit[]> {
  const slug = slugify(activeIngredient);
  if (!slug) return [];

  const cached = readCache(listCache, slug);
  if (cached) return cached;

  const html = await fetchHtml(`/principio-ativo/${slug}`);
  if (!html) return [];

  const hits = parseIngredientListing(html);
  writeCache(listCache, slug, hits);
  return hits;
}

export async function getReferenceBySlug(
  slug: string
): Promise<MedicamentosApiBrReference | null> {
  const key = slug.trim();
  if (!key) return null;

  const cached = readCache(detailCache, key);
  if (cached !== undefined) return cached;

  const html = await fetchHtml(`/medicamento/${key}`);
  if (!html) {
    writeCache(detailCache, key, null);
    return null;
  }

  const ref = parseMedicamentoDetail(html, key);
  writeCache(detailCache, key, ref);
  return ref;
}

export async function findBestReferenceMatch(opts: {
  name: string;
  activeIngredient: string;
}): Promise<MedicamentosApiBrReference | null> {
  const listing = await searchByActiveIngredient(opts.activeIngredient);
  if (!listing.length) return null;

  const ranked = [...listing].sort(
    (a, b) => scoreNameMatch(opts.name, b.name) - scoreNameMatch(opts.name, a.name)
  );

  const best = ranked[0];
  if (!best || scoreNameMatch(opts.name, best.name) < 20) {
    const lowest = [...listing].sort((a, b) => a.priceCents - b.priceCents)[0];
    if (!lowest) return null;
    return {
      slug: lowest.slug,
      name: lowest.name,
      priceCents: lowest.priceCents,
      priceType: "PF_CMED",
      source: "medicamentos.api.br",
      sourceUrl: lowest.sourceUrl,
    };
  }

  const detail = await getReferenceBySlug(best.slug);
  if (detail) return detail;

  return {
    slug: best.slug,
    name: best.name,
    priceCents: best.priceCents,
    priceType: "PF_CMED",
    source: "medicamentos.api.br",
    sourceUrl: best.sourceUrl,
  };
}
