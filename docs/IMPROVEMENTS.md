# Doctor8 — Backlog de melhorias

Lista viva de melhorias propostas e status. Lotes pequenos, baixo risco ao fluxo humanitário (triagem → fila → vídeo → WhatsApp).

---

## Em implementação / próximo

| # | Item | Prioridade | Notas |
|---|------|------------|-------|
| **M1** | **Google Meet com legendas traduzidas** | Alta (BR ↔ VE) | Ver spec abaixo — espelha handoff WhatsApp |
| M2 | WhatsApp Business API (templates Meta) | Média | Aguardando aprovação Meta; código i18n pronto |
| M3 | Sentry em produção | Baixa | Só ativa com `SENTRY_DSN` |
| M4 | Gravação cloud Daily | Baixa | Off por padrão; avaliar custo antes |
| M5 | Consultas agendadas: canal Meet opcional | Média | Depois do humanitário (M1) |
| M6 | `/settings` legado | Baixa | Redireciona para `/*/account` (feito) |

---

## M1 — Google Meet com tradução (spec)

**Objetivo:** Igual ao botão **WhatsApp** no painel do voluntário — o profissional escolhe o canal; o paciente vê na tela o que foi escolhido e ambos seguem para a opção.

**Contexto:** Google Workspace Enterprise Plus (Doctor8) já inclui Meet com **legendas traduzidas** (PT ↔ ES). Daily.co no app não oferece isso nativamente.

### UX (espelho do WhatsApp)

**Voluntário** (`/humanitarian/volunteer`), com paciente em `CALLED` / `IN_PROGRESS`:

| Botão | Ação |
|-------|------|
| Entrar na consulta (Daily) | Fluxo atual — `/video/humanitarian/{entryId}` |
| WhatsApp | Handoff existente — `POST .../whatsapp-contact` |
| **Google Meet (legendas traduzidas)** | **Novo** — cria link Meet, notifica paciente |

**Paciente** (fila / sala de vídeo):

- Polling existente em `VideoConsultRoom` (hoje detecta `completionChannel === "WHATSAPP"`)
- Nova tela **Meet handoff**: link da reunião + instruções PT/EN/ES para ativar legendas traduzidas
- Paciente na fila (`/humanitarian/{slug}`) também mostra banner quando canal = Meet

### Modelo de dados (migration aditiva)

```prisma
enum HumanitarianCompletionChannel {
  VIDEO
  WHATSAPP
  GOOGLE_MEET   // novo
}
```

- Reutilizar `meetingUrl` para URL do Meet quando canal = Meet

### Backend

- `handoffHumanitarianEntryViaGoogleMeet()` em `src/lib/humanitarian/dispatcher.ts`
- `POST /api/humanitarian/queue/[entryId]/google-meet-contact`
- Geração do link Meet (fase 1): Google Calendar API ou `meet.google.com/new` (MVP)
- Notificação: `notifyHumanitarianMeetHandoff()` + chaves i18n `hum.notif.meetHandoff.*`, `hum.page.meetHandoff*`

### Frontend

- Botão no voluntário + loading state (como WhatsApp)
- Componente handoff em `VideoConsultRoom.tsx` (como `whatsappHandoff`)
- Instruções de legendas: Configurações → Legendas → Traduzir → PT (médico) / ES (paciente VE)

### Variáveis de ambiente (fase API)

```
GOOGLE_MEET_ENABLED=1
GOOGLE_SERVICE_ACCOUNT_JSON=...
GOOGLE_CALENDAR_ID=primary
```

### Referências no código hoje

- Handoff WhatsApp: `src/lib/humanitarian/dispatcher.ts` → `handoffHumanitarianEntryViaWhatsApp`
- UI voluntário: `src/app/humanitarian/volunteer/page.tsx`
- Tela paciente WhatsApp: `src/components/VideoConsultRoom.tsx` (`whatsappHandoff`)
- Enum: `prisma/schema.prisma` → `HumanitarianCompletionChannel`

---

## Concluído (resumo)

| Área | Status |
|------|--------|
| Segurança OAuth, PHI, CSP, salas Daily privadas | OK |
| Teleconsulta Daily + sidebar ficha | OK |
| Humanitário: triagem, fila, WhatsApp handoff, anamnese, offline | OK |
| PWA + service worker humanitário | OK |
| Notificações i18n (titleKey/bodyKey) | OK |
| Encoding PT/ES/EN + `check:encoding` no CI | OK |
| E2E: fila → vídeo (Daily mock), voluntário, smoke legal | OK |
| SMART OAuth + admin clientes | OK |
| QStash lembretes anamnese | OK |
| Farmácia: só CMED informativo (sem checkout) | OK |
| Convite paciente / PatientNoAccountPanel | OK |
| Gravação Daily off + webhook opcional | OK |
| Biblioteca recursos i18n (Lote 35) | OK |
| `/settings` → redirect conta (Lote 36) | OK |
| Admin loading i18n (Lote 36) | OK |
| JIT pagamento + license docs i18n (Lote 37) | OK |
| Share/room públicos i18n erros (Lote 37) | OK |
| Share público i18n completo + admin clubes (Lote 38) | OK |
| Magic link + mapa paciente + admin categorias (Lote 39) | OK |
| Conta pro Doctor Connection + admin providers parcial (Lote 40) | OK |
| Admin providers completo + pacientes admin (Lote 41) | OK |
| Admin pagamentos + audit + JIT events (Lote 42) | OK |

---

## Regras de deploy

- Migrations **aditivas** — OK em horário de uso
- Trocar fluxo WhatsApp API ou auth = avisar antes
- Meet (M1) = migration enum + novos endpoints; Daily continua padrão
