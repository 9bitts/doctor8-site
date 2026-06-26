const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

function u(s) {
  return s;
}

const constants = [
  "// Default pool definitions for humanitarian campaigns.",
  "",
  'export const HUMANITARIAN_LANDING_URL = "https://acurabrasil.org/sos-venezuela.html";',
  "",
  "export type HumanitarianPoolSlug =",
  '  | "medico"',
  '  | "psicologo"',
  '  | "psicanalista"',
  '  | "terapeuta_integrativo";',
  "",
  'export const VENEZUELA_CAMPAIGN_SLUG = "venezuela-terremoto-2026";',
  "",
  "export const DEFAULT_VENEZUELA_POOLS: {",
  "  slug: HumanitarianPoolSlug;",
  "  labelEs: string;",
  "  labelPt: string;",
  "  labelEn: string;",
  "  maxWaiting: number;",
  "  sortOrder: number;",
  '  volunteerRoles: ("PROFESSIONAL" | "PSYCHOANALYST")[];',
  "  specialtyHints?: string[];",
  "}[] = [",
  "  {",
  '    slug: "medico",',
  '    labelEs: "M\u00e9dico general",',
  '    labelPt: "M\u00e9dico cl\u00ednico",',
  '    labelEn: "General physician",',
  "    maxWaiting: 500,",
  "    sortOrder: 1,",
  '    volunteerRoles: ["PROFESSIONAL"],',
  '    specialtyHints: ["general", "cl\u00ednica", "clinica", "medicina", "m\u00e9dico", "medico", "family"],',
  "  },",
  "  {",
  '    slug: "psicologo",',
  '    labelEs: "Psic\u00f3logo",',
  '    labelPt: "Psic\u00f3logo",',
  '    labelEn: "Psychologist",',
  "    maxWaiting: 200,",
  "    sortOrder: 2,",
  '    volunteerRoles: ["PROFESSIONAL"],',
  '    specialtyHints: ["psicolog", "psycholog", "mental health", "sa\u00fade mental", "salud mental"],',
  "  },",
  "  {",
  '    slug: "psicanalista",',
  '    labelEs: "Psicanalista",',
  '    labelPt: "Psicanalista",',
  '    labelEn: "Psychoanalyst",',
  "    maxWaiting: 100,",
  "    sortOrder: 3,",
  '    volunteerRoles: ["PSYCHOANALYST", "PROFESSIONAL"],',
  '    specialtyHints: ["psicanal", "psychoanal"],',
  "  },",
  "  {",
  '    slug: "terapeuta_integrativo",',
  '    labelEs: "Terapeuta integrativo",',
  '    labelPt: "Terapeuta integrativo",',
  '    labelEn: "Integrative therapist",',
  "    maxWaiting: 100,",
  "    sortOrder: 4,",
  '    volunteerRoles: ["PROFESSIONAL"],',
  '    specialtyHints: ["integrativ", "holistic", "terapia", "counsel", "terapeuta"],',
  "  },",
  "];",
  "",
  "export function poolLabel(",
  "  pool: { labelEs: string; labelPt: string; labelEn: string },",
  "  lang: string,",
  "): string {",
  '  if (lang.startsWith("pt")) return pool.labelPt;',
  '  if (lang.startsWith("en")) return pool.labelEn;',
  "  return pool.labelEs;",
  "}",
  "",
].join("\n");

fs.writeFileSync(path.join(root, "src/lib/humanitarian/constants.ts"), constants, "utf8");

const seedName = "Venezuela \u2014 Atenci\u00f3n humanitaria post-terremoto";
const seedDesc =
  "Atenci\u00f3n m\u00e9dica y de salud mental gratuita para personas afectadas por el terremoto. Sin costo. Voluntarios de Doctor8.";

const seed = `import { db } from "@/lib/db";
import {
  DEFAULT_VENEZUELA_POOLS,
  VENEZUELA_CAMPAIGN_SLUG,
} from "@/lib/humanitarian/constants";

export async function seedVenezuelaCampaign() {
  const existing = await db.humanitarianCampaign.findUnique({
    where: { slug: VENEZUELA_CAMPAIGN_SLUG },
    include: { pools: true },
  });

  const campaignData = {
    name: "${seedName}",
    description: "${seedDesc}",
    region: "VE" as const,
    active: true,
    endAt: null as Date | null,
  };

  if (existing) {
    await db.humanitarianCampaign.update({
      where: { id: existing.id },
      data: campaignData,
    });

    for (const p of DEFAULT_VENEZUELA_POOLS) {
      await db.humanitarianPool.upsert({
        where: {
          campaignId_slug: {
            campaignId: existing.id,
            slug: p.slug,
          },
        },
        create: {
          campaignId: existing.id,
          slug: p.slug,
          labelEs: p.labelEs,
          labelPt: p.labelPt,
          labelEn: p.labelEn,
          maxWaiting: p.maxWaiting,
          sortOrder: p.sortOrder,
        },
        update: {
          labelEs: p.labelEs,
          labelPt: p.labelPt,
          labelEn: p.labelEn,
          maxWaiting: p.maxWaiting,
          sortOrder: p.sortOrder,
        },
      });
    }

    return db.humanitarianCampaign.findUnique({
      where: { id: existing.id },
      include: { pools: { orderBy: { sortOrder: "asc" } } },
    });
  }

  return db.humanitarianCampaign.create({
    data: {
      slug: VENEZUELA_CAMPAIGN_SLUG,
      ...campaignData,
      noShowTimeoutSeconds: 180,
      estimatedMinutesPerPatient: 15,
      pools: {
        create: DEFAULT_VENEZUELA_POOLS.map((p) => ({
          slug: p.slug,
          labelEs: p.labelEs,
          labelPt: p.labelPt,
          labelEn: p.labelEn,
          maxWaiting: p.maxWaiting,
          sortOrder: p.sortOrder,
        })),
      },
    },
    include: { pools: { orderBy: { sortOrder: "asc" } } },
  });
}
`;

fs.writeFileSync(path.join(root, "src/lib/humanitarian/seed-venezuela.ts"), seed, "utf8");

const notifyPath = path.join(root, "src/lib/humanitarian/notify.ts");
let notify = fs.readFileSync(notifyPath, "utf8");
notify = notify.replace(/Est\?s en la fila humanitaria/g, "Est\u00e1s en la fila humanitaria");
notify = notify.replace(
  /\$\{opts\.poolLabel\} \? posici\?n \$\{opts\.position\}/g,
  "${opts.poolLabel} \u2014 posici\u00f3n ${opts.position}",
);
notify = notify.replace(/atenci\?n humanitaria/g, "atenci\u00f3n humanitaria");
notify = notify.replace(/est\? listo/g, "est\u00e1 listo");
notify = notify.replace(/Entra aqu\?:/g, "Entra aqu\u00ed:");
notify = notify.replace(/entryUrl\} \? Tienes/g, "entryUrl} \u2014 Tienes");
notify = notify.replace(/\?Es tu turno!/g, "\u00a1Es tu turno!");
notify = notify.replace(/Si a\?n necesitas atenci\?n/g, "Si a\u00fan necesitas atenci\u00f3n");
fs.writeFileSync(notifyPath, notify, "utf8");

const dispPath = path.join(root, "src/lib/humanitarian/dispatcher.ts");
let disp = fs.readFileSync(dispPath, "utf8");
disp = disp.replace(/Psican\?lise/g, "Psican\u00e1lise");
fs.writeFileSync(dispPath, disp, "utf8");

const indexPath = path.join(root, "src/lib/humanitarian/index.ts");
let index = fs.readFileSync(indexPath, "utf8");
index = index.replace(/orientaci\?n/g, "orientaci\u00f3n");
index = index.replace(/emerg\?ncia/g, "emerg\u00eancia");
index = index.replace(/p\?nico/g, "p\u00e2nico");
fs.writeFileSync(indexPath, index, "utf8");

console.log("done", fs.readFileSync(path.join(root, "src/lib/humanitarian/constants.ts"), "utf8").includes("M?dico") ? "ok" : "check");
