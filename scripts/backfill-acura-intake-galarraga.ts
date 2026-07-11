/**
 * Cria/atualiza o intake ACURA do LUIS GALARRAGA direto no banco (sem API/curl).
 * Requer DATABASE_URL de produção e ENCRYPTION_KEY.
 *
 * PowerShell:
 *   npx tsx scripts/backfill-acura-intake-galarraga.ts
 */
import { upsertAcuraPartnerIntake } from "../src/lib/partner/acura-intake";

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.startsWith("postgres")) {
    console.error("ERRO: DATABASE_URL não aponta para PostgreSQL.");
    process.exit(1);
  }
  if (!process.env.ENCRYPTION_KEY?.trim()) {
    console.error("ERRO: ENCRYPTION_KEY não definida (necessária para criptografar dados clínicos).");
    process.exit(1);
  }

  const result = await upsertAcuraPartnerIntake({
    protocolo: "SOS-VE-20260711-3YY6CGTM91",
    submittedAt: "2026-07-11T12:00:00.000Z",
    requester: {
      name: "LUIS GALARRAGA",
      email: "galarragal@hotmail.com",
      phone: { display: "+55 (11) 982890735" },
    },
    patient: {
      name: "Ulises Marquez",
      relationship: "familiar",
      location: "La Guaira",
    },
    clinical: {
      careType: "Atencion psicologica",
      priority: "regular",
      symptoms:
        "Posible trauma Psicologico despues de perder familiares, amigos, vecinos y su casa.",
    },
    acuraStatus: "NOVA",
    clicks: {
      doctor8LoginAt: "2026-07-11T14:03:00.000Z",
    },
  });

  console.log("OK — intake gravado:", result);
  console.log("\nPróximo passo: abra /admin/patients e busque SOS-VE-20260711-3YY6CGTM91 ou Ulises Marquez");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
