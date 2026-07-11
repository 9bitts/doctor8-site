/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Sync intake ACURA via API — roda com: node scripts/sync-acura-intake-api.cjs
 * Requer ACURA_PARTNER_API_KEY no ambiente.
 * Opcional: DOCTOR8_APP_URL (default https://app.doctor8.org)
 */
const key = process.env.ACURA_PARTNER_API_KEY;
const base = (process.env.DOCTOR8_APP_URL || "https://app.doctor8.org").replace(/\/$/, "");

if (!key) {
  console.error("ERRO: ACURA_PARTNER_API_KEY nao definida neste container.");
  process.exit(1);
}

const payload = {
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
};

fetch(`${base}/api/integrations/acura/intakes`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
})
  .then(async (res) => {
    const text = await res.text();
    console.log("HTTP", res.status, text);
    if (!res.ok) process.exit(1);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
