// scripts/update-drug-presentations.js
// Etapa 4b: atualiza o campo "presentation" dos medicamentos BR do catalogo
// com a apresentacao real (concentracao + forma farmaceutica) vinda das
// Listas A/B de Referencia da Anvisa + tabela de precos.
//
// Roda no Railway Console:  cd /app && node scripts/update-drug-presentations.js
//
// Seguro: so atualiza quem ainda esta com a apresentacao generica
// ("Diversas apresentações") E tem correspondencia no mapa. Nao toca em
// medicamentos que ja tinham apresentacao propria (ex: os 47 do seed inicial),
// nem nos que nao tem correspondencia (continuam genericos).

const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

const PRES = require("./drug-presentations-anvisa.js"); // { nome: "apresentacao" }
const GENERIC = "Diversas apresentações";
const COUNTRY = "BR";
const BATCH = 200;

function norm(s) {
  return (s || "").toString().trim().toLowerCase();
}

async function main() {
  console.log(`Mapa de apresentacoes carregado: ${Object.keys(PRES).length} nomes.`);

  // Indexa o mapa por nome normalizado (lowercase) para casar com searchName.
  const presByLower = new Map();
  for (const [name, apres] of Object.entries(PRES)) {
    presByLower.set(norm(name), apres);
  }

  // Busca os medicamentos BR que ainda estao com a apresentacao generica.
  const drugs = await db.drugCatalog.findMany({
    where: { country: COUNTRY, presentation: GENERIC },
    select: { id: true, name: true, searchName: true },
  });
  console.log(`Medicamentos BR com apresentacao generica: ${drugs.length}`);

  // Monta a lista de updates (so os que tem correspondencia).
  const toUpdate = [];
  for (const d of drugs) {
    const key = d.searchName || norm(d.name);
    const apres = presByLower.get(key);
    if (apres) toUpdate.push({ id: d.id, presentation: apres });
  }
  console.log(`Com correspondencia (serao atualizados): ${toUpdate.length}`);
  console.log(`Sem correspondencia (continuam genericos): ${drugs.length - toUpdate.length}`);

  // Atualiza em lotes.
  let done = 0;
  for (let i = 0; i < toUpdate.length; i += BATCH) {
    const slice = toUpdate.slice(i, i + BATCH);
    await Promise.all(
      slice.map((u) =>
        db.drugCatalog.update({
          where: { id: u.id },
          data: { presentation: u.presentation },
        })
      )
    );
    done += slice.length;
    if (done % 1000 < BATCH) console.log(`  atualizados ${done}/${toUpdate.length}...`);
  }

  const stillGeneric = await db.drugCatalog.count({
    where: { country: COUNTRY, presentation: GENERIC },
  });
  console.log(`\nConcluido. Atualizados: ${done}. Ainda genericos: ${stillGeneric}.`);
  process.exit(0);
}

main().catch((e) => {
  console.error("ERRO:", e.message);
  process.exit(1);
});
