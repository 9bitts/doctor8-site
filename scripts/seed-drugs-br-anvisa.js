// scripts/seed-drugs-br-anvisa.js
// Importa ~7.000 medicamentos brasileiros (base aberta da Anvisa) no DrugCatalog.
// Roda no Railway Console:  cd /app && node scripts/seed-drugs-br-anvisa.js
//
// Seguro para rodar mais de uma vez (idempotente): pula medicamentos que ja
// existem no catalogo pelo par (searchName + country). Nao apaga nada.
//
// Esta e a Etapa 4a: nome + principio ativo + categoria + fabricante + pais BR.
// A apresentacao ("presentation") e obrigatoria no schema, entao usamos um texto
// generico nesta etapa. A dosagem/apresentacao real entra na Etapa 4b.

const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

const DRUGS = require("./drug-catalog-br-anvisa.js");

const COUNTRY = "BR";
const GENERIC_PRESENTATION = "Diversas apresentações";
const BATCH = 500;

function norm(s) {
  return (s || "").toString().trim().toLowerCase();
}

async function main() {
  console.log(`Iniciando import de ${DRUGS.length} medicamentos (pais ${COUNTRY})...`);

  // 1) Carrega os nomes ja existentes nesse pais, para nao duplicar.
  const existing = await db.drugCatalog.findMany({
    where: { country: COUNTRY },
    select: { searchName: true },
  });
  const existingSet = new Set(existing.map((e) => e.searchName));
  console.log(`Ja existem ${existingSet.size} medicamentos ${COUNTRY} no catalogo.`);

  // 2) Monta a lista a inserir, pulando duplicatas (inclusive duplicatas
  //    dentro do proprio arquivo).
  const toInsert = [];
  const seenInThisRun = new Set(existingSet);
  let skippedDup = 0;

  for (const d of DRUGS) {
    const searchName = norm(d.name);
    if (!searchName) continue;
    if (seenInThisRun.has(searchName)) {
      skippedDup++;
      continue;
    }
    seenInThisRun.add(searchName);
    toInsert.push({
      name: d.name,
      activeIngredient: d.activeIngredient || d.name,
      presentation: GENERIC_PRESENTATION,
      manufacturer: d.manufacturer || null,
      country: COUNTRY,
      category: d.category || null,
      controlled: false,
      prescriptionType: null,
      searchName,
      searchIngredient: norm(d.activeIngredient || d.name),
      active: true,
    });
  }

  console.log(`A inserir: ${toInsert.length} | pulados (ja existiam/duplicados): ${skippedDup}`);

  // 3) Insere em lotes com createMany.
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const slice = toInsert.slice(i, i + BATCH);
    const res = await db.drugCatalog.createMany({ data: slice });
    inserted += res.count;
    console.log(`  lote ${Math.floor(i / BATCH) + 1}: +${res.count} (total ${inserted})`);
  }

  const totalBR = await db.drugCatalog.count({ where: { country: COUNTRY } });
  console.log(`\nConcluido. Inseridos agora: ${inserted}. Total ${COUNTRY} no catalogo: ${totalBR}.`);
  process.exit(0);
}

main().catch((e) => {
  console.error("ERRO no import:", e.message);
  process.exit(1);
});
