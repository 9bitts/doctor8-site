// scripts/seed-categories.js
// Seeds the initial category catalog (grouped). Run once in the Railway Console:
//   cd /app && node scripts/seed-categories.js
// Safe to run more than once: it upserts by slug (won't duplicate).

const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

// slug helper
function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// [groupName, groupOrder, [ [name, icon, legacyType?], ... ]]
const CATALOG = [
  ["Exames", 1, [
    ["Exame de sangue / laboratorial", "FlaskConical", null],
    ["Exame de imagem (radiológico, ultrassom)", "ScanLine", null],
    ["Exame cardiológico (ECG, etc.)", "HeartPulse", null],
    ["Resultado de exame", "FlaskConical", "EXAM_RESULT"],
    ["Solicitação / pedido de exame", "ClipboardList", "EXAM_REQUEST"],
  ]],
  ["Documentos médico-legais", 2, [
    ["Atestado", "FileCheck", "CERTIFICATE"],
    ["Laudo", "FileText", null],
    ["Relatório médico", "FileText", null],
    ["Parecer", "FileText", null],
    ["Encaminhamento / referência", "Send", "REFERRAL"],
    ["Termo de consentimento", "FileSignature", null],
  ]],
  ["Registros clínicos", 3, [
    ["Anamnese", "ClipboardList", null],
    ["Evolução clínica", "Activity", null],
    ["Sinais vitais", "HeartPulse", null],
    ["Nota clínica / observação", "StickyNote", "CLINICAL_NOTE"],
    ["Diagnóstico", "Stethoscope", null],
    ["Plano terapêutico", "ListChecks", null],
  ]],
  ["Prescrição", 4, [
    ["Prescrição / receita médica", "Pill", "PRESCRIPTION"],
  ]],
  ["Nutrição", 5, [
    ["Avaliação antropométrica", "Ruler", null],
    ["Plano alimentar", "Salad", null],
    ["Recordatório alimentar (R24h)", "Utensils", null],
    ["Anamnese nutricional", "ClipboardList", null],
  ]],
  ["Psicologia", 6, [
    ["Avaliação psicológica", "Brain", null],
    ["Evolução de sessão", "MessageSquare", null],
    ["Anamnese psicológica", "ClipboardList", null],
    ["Relatório psicológico", "FileText", null],
  ]],
  ["Outros", 7, [
    ["Imagem / foto clínica", "Image", null],
    ["Documento diverso", "File", "OTHER"],
  ]],
];

async function main() {
  let created = 0, updated = 0;
  for (const [groupName, groupOrder, items] of CATALOG) {
    let itemOrder = 0;
    for (const [name, icon, legacyType] of items) {
      itemOrder++;
      const slug = slugify(name);
      const existing = await db.category.findUnique({ where: { slug } });
      if (existing) {
        await db.category.update({
          where: { slug },
          data: { name, groupName, groupOrder, itemOrder, icon, legacyType, isSystem: true, active: true },
        });
        updated++;
      } else {
        await db.category.create({
          data: { name, slug, groupName, groupOrder, itemOrder, icon, legacyType, isSystem: true, active: true },
        });
        created++;
      }
    }
  }
  const total = await db.category.count();
  console.log(`Seed done. Created: ${created}, Updated: ${updated}. Total categories now: ${total}`);
}

main()
  .catch((e) => { console.error("SEED ERROR:", e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
