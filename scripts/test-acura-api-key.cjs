/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Testa a chave ACURA contra localhost e URL publica.
 * Uso: node scripts/test-acura-api-key.cjs
 */
const key = process.env.ACURA_PARTNER_API_KEY || "";
const port = process.env.PORT || 3000;
const publicUrl = (process.env.DOCTOR8_APP_URL || "https://app.doctor8.org").replace(/\/$/, "");

console.log("Chave definida:", Boolean(key));
console.log("Tamanho da chave:", key.length);
console.log("(401 + 'Unauthorized' = middleware bloqueou; 'UNAUTHORIZED' = chave Bearer errada)\n");

const probe = { acuraStatus: "NOVA", triageNotes: "ping" };

async function test(label, url) {
  try {
    const res = await fetch(`${url}/api/integrations/acura/intakes/SOS-VE-PING-TEST`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(probe),
    });
    const text = await res.text();
    console.log(`${label}: HTTP ${res.status} ${text.slice(0, 120)}`);
  } catch (e) {
    console.log(`${label}: ERRO`, e.message);
  }
}

(async () => {
  await test("localhost", `http://127.0.0.1:${port}`);
  await test("publico", publicUrl);
})();
