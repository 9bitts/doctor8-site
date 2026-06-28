#!/usr/bin/env node
/** Writes docs/IMPROVEMENTS.md with correct UTF-8 (avoids Windows editor corruption). */
import fs from "node:fs";
import path from "node:path";

const content = `# Doctor8 \u2014 Backlog de melhorias

Lista viva de melhorias propostas e status. Lotes pequenos, baixo risco ao fluxo humanit\u00e1rio (triagem \u2192 fila \u2192 v\u00eddeo \u2192 WhatsApp).

---

## Em implementa\u00e7\u00e3o / pr\u00f3ximo

| # | Item | Prioridade | Notas |
|---|------|------------|-------|
| **M1** | **Google Meet com legendas traduzidas** | Alta (BR \u2194 VE) | Ver spec abaixo \u2014 espelha handoff WhatsApp |
| M2 | WhatsApp Business API (templates Meta) | M\u00e9dia | Aguardando aprova\u00e7\u00e3o Meta; c\u00f3digo i18n pronto |
| M3 | Sentry em produ\u00e7\u00e3o | Baixa | S\u00f3 ativa com \`SENTRY_DSN\` |
| M4 | Grava\u00e7\u00e3o cloud Daily | Baixa | Off por padr\u00e3o; avaliar custo antes |
| M5 | Consultas agendadas: canal Meet opcional | M\u00e9dia | Depois do humanit\u00e1rio (M1) |
| M6 | \`/settings\` legado | Baixa | Redireciona para \`/*/account\` (feito) |

---

## M1 \u2014 Google Meet com tradu\u00e7\u00e3o (spec)

**Objetivo:** Igual ao bot\u00e3o **WhatsApp** no painel do volunt\u00e1rio \u2014 o profissional escolhe o canal; o paciente v\u00ea na tela o que foi escolhido e ambos seguem para a op\u00e7\u00e3o.

**Contexto:** Google Workspace Enterprise Plus (Doctor8) j\u00e1 inclui Meet com **legendas traduzidas** (PT \u2194 ES). Daily.co no app n\u00e3o oferece isso nativamente.

### UX (espelho do WhatsApp)

**Volunt\u00e1rio** (\`/humanitarian/volunteer\`), com paciente em \`CALLED\` / \`IN_PROGRESS\`:

| Bot\u00e3o | A\u00e7\u00e3o |
|-------|------|
| Entrar na consulta (Daily) | Fluxo atual \u2014 \`/video/humanitarian/{entryId}\` |
| WhatsApp | Handoff existente \u2014 \`POST .../whatsapp-contact\` |
| **Google Meet (legendas traduzidas)** | **Novo** \u2014 cria link Meet, notifica paciente |

**Paciente** (fila / sala de v\u00eddeo):

- Polling existente em \`VideoConsultRoom\` (hoje detecta \`completionChannel === "WHATSAPP"\`)
- Nova tela **Meet handoff**: link da reuni\u00e3o + instru\u00e7\u00f5es PT/EN/ES para ativar legendas traduzidas
- Paciente na fila (\`/humanitarian/{slug}\`) tamb\u00e9m mostra banner quando canal = Meet

### Modelo de dados (migration aditiva)

\`\`\`prisma
enum HumanitarianCompletionChannel {
  VIDEO
  WHATSAPP
  GOOGLE_MEET   // novo
}
\`\`\`

- Reutilizar \`meetingUrl\` para URL do Meet quando canal = Meet

### Backend

- \`handoffHumanitarianEntryViaGoogleMeet()\` em \`src/lib/humanitarian/dispatcher.ts\`
- \`POST /api/humanitarian/queue/[entryId]/google-meet-contact\`
- Gera\u00e7\u00e3o do link Meet (fase 1): Google Calendar API ou \`meet.google.com/new\` (MVP)
- Notifica\u00e7\u00e3o: \`notifyHumanitarianMeetHandoff()\` + chaves i18n \`hum.notif.meetHandoff.*\`, \`hum.page.meetHandoff*\`

### Frontend

- Bot\u00e3o no volunt\u00e1rio + loading state (como WhatsApp)
- Componente handoff em \`VideoConsultRoom.tsx\` (como \`whatsappHandoff\`)
- Instru\u00e7\u00f5es de legendas: Configura\u00e7\u00f5es \u2192 Legendas \u2192 Traduzir \u2192 PT (m\u00e9dico) / ES (paciente VE)

### Vari\u00e1veis de ambiente (fase API)

\`\`\`
GOOGLE_MEET_ENABLED=1
GOOGLE_SERVICE_ACCOUNT_JSON=...
GOOGLE_CALENDAR_ID=primary
\`\`\`

### Refer\u00eancias no c\u00f3digo hoje

- Handoff WhatsApp: \`src/lib/humanitarian/dispatcher.ts\` \u2192 \`handoffHumanitarianEntryViaWhatsApp\`
- UI volunt\u00e1rio: \`src/app/humanitarian/volunteer/page.tsx\`
- Tela paciente WhatsApp: \`src/components/VideoConsultRoom.tsx\` (\`whatsappHandoff\`)
- Enum: \`prisma/schema.prisma\` \u2192 \`HumanitarianCompletionChannel\`

---

## Conclu\u00eddo (resumo)

| \u00c1rea | Status |
|------|--------|
| Seguran\u00e7a OAuth, PHI, CSP, salas Daily privadas | OK |
| Teleconsulta Daily + sidebar ficha | OK |
| Humanit\u00e1rio: triagem, fila, WhatsApp handoff, anamnese, offline | OK |
| PWA + service worker humanit\u00e1rio | OK |
| Notifica\u00e7\u00f5es i18n (titleKey/bodyKey) | OK |
| Encoding PT/ES/EN + \`check:encoding\` no CI | OK |
| E2E: fila \u2192 v\u00eddeo (Daily mock), volunt\u00e1rio, smoke legal | OK |
| SMART OAuth + admin clientes | OK |
| QStash lembretes anamnese | OK |
| Farm\u00e1cia: s\u00f3 CMED informativo (sem checkout) | OK |
| Convite paciente / PatientNoAccountPanel | OK |
| Grava\u00e7\u00e3o Daily off + webhook opcional | OK |
| Biblioteca recursos i18n (Lote 35) | OK |
| \`/settings\` \u2192 redirect conta (Lote 36) | OK |
| Admin loading i18n (Lote 36) | OK |
| JIT pagamento + license docs i18n (Lote 37) | OK |
| Share/room p\u00fablicos i18n erros (Lote 37) | OK |
| Share p\u00fablico i18n completo + admin clubes (Lote 38) | OK |
| Magic link + mapa paciente + admin categorias (Lote 39) | OK |
| Conta pro Doctor Connection + admin providers parcial (Lote 40) | OK |
| Admin providers completo + pacientes admin (Lote 41) | OK |

---

## Regras de deploy

- Migrations **aditivas** \u2014 OK em hor\u00e1rio de uso
- Trocar fluxo WhatsApp API ou auth = avisar antes
- Meet (M1) = migration enum + novos endpoints; Daily continua padr\u00e3o
`;

const out = path.resolve(import.meta.dirname, "..", "docs", "IMPROVEMENTS.md");
fs.writeFileSync(out, content, "utf8");
console.log("Wrote", out);
