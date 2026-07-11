/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Grava PartnerIntake direto no PostgreSQL (sem API / sem chave Bearer).
 * Uso no container: node scripts/direct-insert-acura-intake.cjs
 */
const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();

const INTAKE = {
  protocolo: "SOS-VE-20260711-3YY6CGTM91",
  email: "galarragal@hotmail.com",
  requesterName: "LUIS GALARRAGA",
  phoneJson: { display: "+55 (11) 982890735" },
  relationship: "familiar",
  location: "La Guaira",
  submittedAt: new Date("2026-07-11T12:00:00.000Z"),
  clickedDoctor8LoginAt: new Date("2026-07-11T14:03:00.000Z"),
};

(async () => {
  const url = process.env.DATABASE_URL || "";
  if (!url.startsWith("postgres")) {
    console.error("ERRO: DATABASE_URL invalida.");
    process.exit(1);
  }

  const row = await db.partnerIntake.upsert({
    where: { protocolo: INTAKE.protocolo },
    create: {
      partner: "acura",
      campaign: "sos_venezuela",
      protocolo: INTAKE.protocolo,
      email: INTAKE.email,
      emailNormalized: INTAKE.email.toLowerCase(),
      requesterName: INTAKE.requesterName,
      phoneJson: INTAKE.phoneJson,
      relationship: INTAKE.relationship,
      location: INTAKE.location,
      acuraStatus: "NOVA",
      submittedAt: INTAKE.submittedAt,
      clickedDoctor8LoginAt: INTAKE.clickedDoctor8LoginAt,
    },
    update: {
      requesterName: INTAKE.requesterName,
      clickedDoctor8LoginAt: INTAKE.clickedDoctor8LoginAt,
    },
  });

  const unlinked = await db.partnerIntake.count({ where: { patientUserId: null } });
  console.log("OK gravado:", row.protocolo, "| solicitante:", row.requesterName);
  console.log("Total sem conta D8:", unlinked);
  console.log("\nAbra /admin/patients e busque:", INTAKE.protocolo, "ou galarraga");

  await db.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
