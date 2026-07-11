/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Consulta PartnerIntake — roda com: node scripts/check-acura-intake.cjs [busca]
 */
const { PrismaClient } = require("@prisma/client");

const q = (process.argv[2] || "galarraga").toLowerCase();
const db = new PrismaClient();

(async () => {
  const url = process.env.DATABASE_URL || "";
  if (!url.startsWith("postgres")) {
    console.error("ERRO: DATABASE_URL invalida. Rode dentro do container /app.");
    process.exit(1);
  }

  const rows = await db.partnerIntake.findMany({
    where: {
      OR: [
        { emailNormalized: { contains: q } },
        { requesterName: { contains: q, mode: "insensitive" } },
        { protocolo: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      protocolo: true,
      requesterName: true,
      email: true,
      patientUserId: true,
      submittedAt: true,
      acuraStatus: true,
      clickedDoctor8LoginAt: true,
    },
    orderBy: { submittedAt: "desc" },
    take: 20,
  });

  const unlinked = await db.partnerIntake.count({ where: { patientUserId: null } });
  const total = await db.partnerIntake.count();

  console.log(`\nBusca: "${q}"`);
  console.log(`Total PartnerIntake: ${total} | Sem conta D8: ${unlinked}\n`);
  console.log(JSON.stringify(rows, null, 2));

  if (rows.length === 0) {
    console.log("\n-> Nenhum registro. Sync Acura->Doctor8 nunca ocorreu para este caso.");
  }

  await db.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
