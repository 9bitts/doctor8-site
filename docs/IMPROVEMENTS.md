# Doctor8 ? Backlog de melhorias

Lista viva de melhorias propostas e status. Lotes pequenos, baixo risco ao fluxo humanit?rio (triagem ? fila ? v?deo ? WhatsApp).

---

## Em implementa??o / pr?ximo

| # | Item | Prioridade | Notas |
|---|------|------------|-------|
| **M1** | **Google Meet com legendas traduzidas** | Alta (BR ? VE) | Ver spec abaixo ? espelha handoff WhatsApp |
| M2 | WhatsApp Business API (templates Meta) | M?dia | Aguardando aprova??o Meta; c?digo i18n pronto |
| M3 | Sentry em produ??o | Baixa | S? ativa com `SENTRY_DSN` |
| M4 | Grava??o cloud Daily | Baixa | Off por padr?o; avaliar custo antes |
| M5 | Consultas agendadas: canal Meet opcional | M?dia | Depois do humanit?rio (M1) |
| M6 | `/settings` legado em ingl?s ? i18n | Baixa | P?gina duplicada; preferir `/*/account` |

---

## M1 ? Google Meet com tradu??o (spec)

**Objetivo:** Igual ao bot?o **WhatsApp** no painel do volunt?rio ? o profissional escolhe o canal; o paciente v? na tela o que foi escolhido e ambos seguem para a op??o.

**Contexto:** Google Workspace Enterprise Plus (Doctor8) j? inclui Meet com **legendas traduzidas** (PT ? ES). Daily.co no app n?o oferece isso nativamente.

### UX (espelho do WhatsApp)

**Volunt?rio** (`/humanitarian/volunteer`), com paciente em `CALLED` / `IN_PROGRESS`:

| Bot?o | A??o |
|-------|------|
| Entrar na consulta (Daily) | Fluxo atual ? `/video/humanitarian/{entryId}` |
| WhatsApp | Handoff existente ? `POST .../whatsapp-contact` |
| **Google Meet (legendas traduzidas)** | **Novo** ? cria link Meet, notifica paciente |

**Paciente** (fila / sala de v?deo):

- Polling existente em `VideoConsultRoom` (hoje detecta `completionChannel === "WHATSAPP"`)
- Nova tela **Meet handoff**: link da reuni?o + instru??es PT/EN/ES para ativar legendas traduzidas
- Paciente na fila (`/humanitarian/{slug}`) tamb?m mostra banner quando canal = Meet

### Modelo de dados (migration aditiva)

```prisma
enum HumanitarianCompletionChannel {
  VIDEO
  WHATSAPP
  GOOGLE_MEET   // novo
}
```

- Reutilizar `meetingUrl` para URL do Meet quando canal = Meet
- Opcional: `consultChannel` em `HumanitarianQueueEntry` se quisermos escolha **antes** de encerrar (hoje WhatsApp s? seta no fim)

### Backend

- `handoffHumanitarianEntryViaGoogleMeet()` em `src/lib/humanitarian/dispatcher.ts` (paralelo a `handoffHumanitarianEntryViaWhatsApp`)
- `POST /api/humanitarian/queue/[entryId]/google-meet-contact`
- Gera??o do link Meet (fase 1): **Google Calendar API** com service account do dom?nio Doctor8, ou link `meet.google.com/new` + instru??es (fase 0 / MVP)
- Notifica??o: `notifyHumanitarianMeetHandoff()` + chaves i18n `hum.notif.meetHandoff.*`, `hum.page.meetHandoff*`

### Frontend

- Bot?o no volunt?rio + loading state (como WhatsApp)
- Componente handoff em `VideoConsultRoom.tsx` (como `whatsappHandoff`)
- Instru??es de legendas: Configura??es ? Legendas ? Traduzir ? PT (m?dico) / ES (paciente VE)

### Vari?veis de ambiente (fase API)

```
GOOGLE_MEET_ENABLED=1
GOOGLE_SERVICE_ACCOUNT_JSON=...   # Calendar API ? criar evento com conferenceData
GOOGLE_CALENDAR_ID=primary
```

### Escopo futuro

- Consultas agendadas (`Appointment.meetingUrl` Meet vs Daily)
- Profissional escolhe canal padr?o nas configura??es
- E2E: mock Meet URL sem chamar Google

### Refer?ncias no c?digo hoje

- Handoff WhatsApp: `src/lib/humanitarian/dispatcher.ts` ? `handoffHumanitarianEntryViaWhatsApp`
- UI volunt?rio: `src/app/humanitarian/volunteer/page.tsx`
- Tela paciente WhatsApp: `src/components/VideoConsultRoom.tsx` (`whatsappHandoff`)
- Enum: `prisma/schema.prisma` ? `HumanitarianCompletionChannel`

---

## Conclu?do (resumo por ?rea)

| ?rea | Status |
|------|--------|
| Seguran?a OAuth, PHI, CSP, salas Daily privadas | ? |
| Teleconsulta Daily + sidebar ficha | ? |
| Humanit?rio: triagem, fila, WhatsApp handoff, anamnese, offline | ? |
| PWA + service worker humanit?rio | ? |
| Notifica??es i18n (titleKey/bodyKey) | ? |
| Encoding PT/ES/EN + `check:encoding` no CI | ? |
| E2E: fila ? v?deo (Daily mock), volunt?rio, smoke legal | ? |
| SMART OAuth + admin clientes | ? |
| QStash lembretes anamnese | ? |
| Farm?cia: s? CMED informativo (sem checkout) | ? |
| Convite paciente / PatientNoAccountPanel | ? |
| Grava??o Daily off + webhook opcional | ? |

---

## Regras de deploy

- Migrations **aditivas** ? OK em hor?rio de uso
- Trocar fluxo WhatsApp API ou auth = avisar antes
- Meet (M1) = migration enum + novos endpoints; Daily continua padr?o
