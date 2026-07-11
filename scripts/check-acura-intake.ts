/**
 * Consulta PartnerIntake no banco (local ou produção via DATABASE_URL).
 * PowerShell: npx tsx scripts/check-acura-intake.ts
 * PowerShell com filtro: npx tsx scripts/check-acura-intake.ts galarraga
 */
import { PrismaClient } from "@prisma/client";

const q = (process.argv[2] ?? "galarraga").toLowerCase();
const db = new PrismaClient();

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.startsWith("postgres")) {
    console.error("ERRO: DATABASE_URL não aponta para PostgreSQL.");
    console.error("Configure .env ou rode dentro do container de produção (/app).");
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
      clickedDoctor8RegisterAt: true,
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
    console.log("\n→ Nenhum registro. Sync Acura→Doctor8 provavelmente nunca ocorreu.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
