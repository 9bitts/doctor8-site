import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import {
  APP_BASE_URL,
  buildPublicProfilePath,
  buildPublicSearchPath,
  buildPublicSearchConvenioPath,
} from "@/lib/public-slugs";
import {
  SITEMAP_SPECIALTY_CITY_COMBOS,
  SITEMAP_CONVENIO_SLUGS,
} from "@/lib/seo-index";

export const dynamic = "force-dynamic";

const STATIC_PUBLIC_PATHS = [
  "/",
  "/privacy",
  "/terms",
  "/hipaa",
  "/cookies",
  "/tcle-telemedicina",
  "/acura-voluntariado",
  "/sos-venezuela",
  "/medicinaintegrativa",
  "/pacientes",
  "/hipertensao",
  "/diabetes",
  "/ansiedade",
  "/depressao",
  "/especialistas",
  "/marketing",
  "/marketing/estrategias",
  "/marketing/estrategias/paciente",
  "/marketing/estrategias/medico",
  "/marketing/estrategias/psicologo",
  "/marketing/estrategias/farmacia",
  "/marketing/estrategias/laboratorio",
  "/marketing/estrategias/empresa",
  "/marketing/estrategias/clinica",
  "/marketing/estrategias/verticais",
  "/marketing/estrategias/cursos",
  "/marketing/estrategias/humanitario",
  "/empresas",
  "/parceiros",
] as const;

function buildProgrammaticEntries(now: Date): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = STATIC_PUBLIC_PATHS.map((path) => ({
    url: `${APP_BASE_URL}${path === "/" ? "" : path}`,
    lastModified: now,
    changeFrequency: path === "/" ? ("weekly" as const) : ("monthly" as const),
    priority: path === "/" ? 1 : 0.5,
  }));

  for (const combo of SITEMAP_SPECIALTY_CITY_COMBOS) {
    entries.push({
      url: `${APP_BASE_URL}${buildPublicSearchPath(combo.especialidade, combo.cidade)}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    });
    for (const convenio of SITEMAP_CONVENIO_SLUGS) {
      entries.push({
        url: `${APP_BASE_URL}${buildPublicSearchConvenioPath(
          combo.especialidade,
          combo.cidade,
          convenio
        )}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  return entries;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries = buildProgrammaticEntries(now);

  try {
    const cards = await db.virtualCard.findMany({
      where: { isPublic: true },
      include: {
        professional: { select: { verified: true, updatedAt: true } },
        psychoanalyst: { select: { verified: true, updatedAt: true } },
      },
    });

    for (const card of cards) {
      const profile = card.professional ?? card.psychoanalyst;
      if (!profile?.verified) continue;

      entries.push({
        url: `${APP_BASE_URL}${buildPublicProfilePath(card)}`,
        lastModified: profile.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch (error) {
    console.error("[sitemap] profile lookup failed:", error);
  }

  return entries;
}
