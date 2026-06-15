// scripts/update-drug-controlled.js
// Etapa 4c: marca os medicamentos controlados (Portaria 344/98) no catalogo.
//
// Roda no Railway Console:  cd /app && node scripts/update-drug-controlled.js
//
// Atualiza, para cada medicamento BR que casa com a lista de controlados:
//   controlled = true
//   prescriptionType = a lista da Portaria ("A1","A2","A3","B1","B2","C1"...)
//
// O detalhe visual (tarja, tipo de receita) a tela monta a partir do
// prescriptionType usando o mesmo mapa. Aqui gravamos so a marcacao essencial.
//
// Seguro e idempotente: roda quantas vezes quiser, sempre converge pro mesmo estado.
// Tambem DESMARCA quem porventura esteja marcado errado e nao consta mais na lista
// (mantem o catalogo coerente caso a lista seja ajustada no futuro).

const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

const CONTROLLED = require("./drug-controlled-anvisa.js"); // { nome: {list,...} }
const COUNTRY = "BR";
const BATCH = 200;

function norm(s) {
  return (s || "").toString().trim().toLowerCase();
}

async function main() {
  console.log(`Mapa de controlados (Portaria 344/98): ${Object.keys(CONTROLLED).length} medicamentos.`);

  // Indexa por nome normalizado para casar com searchName.
  const byLower = new Map();
  for (const [name, info] of Object.entries(CONTROLLED)) {
    byLower.set(norm(name), info);
  }

  const drugs = await db.drugCatalog.findMany({
    where: { country: COUNTRY },
    select: { id: true, name: true, searchName: true, controlled: true, prescriptionType: true },
  });
  console.log(`Medicamentos BR no catalogo: ${drugs.length}`);

  const toMark = [];   // marcar como controlado
  const toUnmark = []; // desmarcar (estava controlado mas nao consta na lista)

  for (const d of drugs) {
    const key = d.searchName || norm(d.name);
    const info = byLower.get(key);
    if (info) {
      // precisa marcar/atualizar?
      if (d.controlled !== true || d.prescriptionType !== info.list) {
        toMark.push({ id: d.id, list: info.list });
      }
    } else {
      // nao esta na lista: se estava marcado por engano, desmarca
      if (d.controlled === true) {
        toUnmark.push({ id: d.id });
      }
    }
  }

  console.log(`A marcar como controlado: ${toMark.length}`);
  console.log(`A desmarcar (corrigir): ${toUnmark.length}`);

  let done = 0;
  for (let i = 0; i < toMark.length; i += BATCH) {
    const slice = toMark.slice(i, i + BATCH);
    await Promise.all(
      slice.map((u) =>
        db.drugCatalog.update({
          where: { id: u.id },
          data: { controlled: true, prescriptionType: u.list },
        })
      )
    );
    done += slice.length;
    if (done % 1000 < BATCH) console.log(`  marcados ${done}/${toMark.length}...`);
  }

  let undone = 0;
  for (let i = 0; i < toUnmark.length; i += BATCH) {
    const slice = toUnmark.slice(i, i + BATCH);
    await Promise.all(
      slice.map((u) =>
        db.drugCatalog.update({
          where: { id: u.id },
          data: { controlled: false, prescriptionType: null },
        })
      )
    );
    undone += slice.length;
  }

  const totalControlled = await db.drugCatalog.count({
    where: { country: COUNTRY, controlled: true },
  });
  console.log(`\nConcluido. Marcados: ${done}. Desmarcados: ${undone}.`);
  console.log(`Total de controlados no catalogo BR agora: ${totalControlled}.`);
  process.exit(0);
}

main().catch((e) => {
  console.error("ERRO:", e.message);
  process.exit(1);
});
