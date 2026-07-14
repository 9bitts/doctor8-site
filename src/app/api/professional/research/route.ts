// POST — clinical literature search (PubMed + AI summary) for provider portals.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isApiError } from "@/lib/api-auth";
import { requireLiteratureSearchApi } from "@/lib/literature-search-auth";
import { buildQueryFromCase, emptyPubMedSummary, generateClinicalSummary, rankAndSummarize } from "@/lib/ai-literature-search";
import {
  searchPubMed,
  fetchSummaries,
  fetchAbstracts,
  pubmedArticleUrl,
} from "@/lib/pubmed";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { normalizeLang, type Lang } from "@/lib/i18n/translations";
import { db } from "@/lib/db";

const schema = z.object({
  caseText: z.string().min(20).max(4000),
  lang: z.enum(["pt", "en", "es"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireLiteratureSearchApi();
    if (isApiError(ctx)) return ctx.error;

    const rate = await checkRateLimit({
      namespace: "literature-search",
      key: ctx.userId,
      ...RATE_LIMITS.literatureSearch,
    });
    if (!rate.allowed) {
      return rateLimitResponse(rate.retryAfterSec);
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: ctx.userId },
      select: { language: true },
    });
    const lang: Lang = normalizeLang(parsed.data.lang || user?.language);
    const caseText = parsed.data.caseText.trim();

    const [clinicalSummary, pubmed] = await Promise.all([
      generateClinicalSummary(caseText, lang),
      (async () => {
        try {
          const { query, keywords } = await buildQueryFromCase(caseText, lang);
          const pmids = await searchPubMed(query, { retmax: 20 });

          let articles = await fetchSummaries(pmids);
          try {
            const abstractMap = await fetchAbstracts(pmids);
            articles = articles.map((a) => ({
              ...a,
              abstract: abstractMap.get(a.pmid) ?? a.abstract,
            }));
          } catch (e) {
            console.error("[RESEARCH] abstract fetch:", e);
          }

          const summary = await rankAndSummarize({ caseText, articles, lang });
          return { query, keywords, summary, articles, pubmedFailed: false as const };
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg === "PUBMED_FAILED") {
            return {
              query: "",
              keywords: [] as string[],
              summary: emptyPubMedSummary(lang),
              articles: [] as Awaited<ReturnType<typeof fetchSummaries>>,
              pubmedFailed: true as const,
            };
          }
          throw e;
        }
      })(),
    ]);

    return NextResponse.json({
      clinicalSummary,
      pubmedFailed: pubmed.pubmedFailed,
      query: pubmed.query,
      keywords: pubmed.keywords,
      summary: pubmed.summary,
      articles: pubmed.articles.map((a) => ({
        pmid: a.pmid,
        title: a.title,
        authors: a.authors,
        journal: a.journal,
        year: a.year,
        abstract: a.abstract ?? null,
        pubmedUrl: pubmedArticleUrl(a.pmid),
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "AI_NOT_CONFIGURED") {
      return NextResponse.json({ error: "AI_NOT_CONFIGURED" }, { status: 503 });
    }
    if (msg === "PUBMED_FAILED") {
      return NextResponse.json({ error: "PUBMED_FAILED" }, { status: 502 });
    }
    console.error("[RESEARCH]", e);
    return NextResponse.json({ error: "AI_FAILED" }, { status: 500 });
  }
}
