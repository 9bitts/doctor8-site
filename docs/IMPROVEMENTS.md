# Doctor8 — Backlog de melhorias

Lista viva de melhorias **pendentes**. Lotes pequenos, baixo risco ao fluxo humanitário (triagem → fila → vídeo → WhatsApp).

---

## Próximo (código ou config no Railway)

| # | Item | Prioridade | O que falta |
|---|------|------------|-------------|
| M2 | WhatsApp Business API (templates Meta) | **Alta** | Produção configurada no código (phone ID `1160816890453235`, Graph v25.0). Falta: `WHATSAPP_ACCESS_TOKEN` permanente no Railway + `WHATSAPP_WEBHOOK_VERIFY_TOKEN` + `WHATSAPP_APP_SECRET` + templates aprovados na Meta |
| M4 | Gravação cloud Daily | Baixa | Off por padrão — `DAILY_CLOUD_RECORDING=1` + banner já no código |
| M10 | Google Meet em produção (humanitário + agendamentos) | Média | Código OK — service account + `GOOGLE_MEET_ENABLED=1` no Railway (ver `.env.example`) |
| M11 | Farmácia marketplace ativo | Baixa | Código OK — `PHARMACY_MARKETPLACE_ENABLED=true` (+ UTM/affiliate se quiser) |

---

## Operação (sem deploy de feature)

| Item | Notas |
|------|--------|
| Cron backup | Agendar POST `/api/cron/reminders` e `/api/cron/post-consult-notes` com header `x-cron-secret` (Railway Cron ou cron-job.org) |
| Backfill busca | `npm run backfill:search-text` no Railway após deploy das migrations de search |
| Admins com login | Rodar `node scripts/fix-admin-users.mjs --promote` no Railway se ainda não feito |
| Contas profissionais Acura | Promover/verificar e-mails via admin ou scripts one-off (ex. psicólogo `contato@acurabrasil.org`) |
| Migrations pendentes | `20260629000000_patient_search_invites`, `20260629110000_organization_linked_providers` |

---

## Concluído recentemente (integrações + fluxo consultas)

| Item | Status |
|------|--------|
| M3 Sentry em produção | OK — `SENTRY_DSN` ativo no painel Admin → Integrações |
| QStash + lembretes | OK — vars configuradas; painel mostra stats |
| Web Push (VAPID) | OK — vars no Railway |
| Twilio SMS | OK |
| Deep link pós-consulta (`#appt-{id}` prof / `?id=` paciente) | OK |
| Banner pré-consulta paciente (48h) | OK |
| Org multi-provider (reports, accounting, TISS, repasse) | OK |
| M9 banner + filtro Acura (busca pública + landing) | OK |
| Admin Integrações: Google Meet, Farmácia, Cron rows + i18n | OK |
| Hint token WhatsApp expirado no admin | OK |
| Migração T1: rotas `/api/professional/*` → `requireProfessionalApi` (exc. sign/callback OAuth) | OK |
| `.env.example` seção CRON + QStash | OK |

---

## Concluído recentemente (sessão Acura / admin)

| Item | Status |
|------|--------|
| Horários voluntários (`volunteerOnly`) + UI verde | OK |
| Agendamento gratuito em slot voluntário (sem Stripe) | OK |
| Países América + EU no cadastro/conta | OK |
| Select de países: acentos + código ISO (sem `????`) | OK |
| Login ADMIN → `/admin` (fim do loop patient/professional) | OK |
| Banner selo AcuraBrasil + botão **Configurar disponibilidade** | OK |
| Script `scripts/fix-admin-users.mjs` | OK |

---

## Concluído (resumo histórico)

| Área | Status |
|------|--------|
| Segurança OAuth, PHI, CSP, salas Daily privadas | OK |
| Teleconsulta Daily + sidebar ficha + notas IA | OK |
| Humanitário: triagem, fila, WhatsApp handoff, anamnese, offline, PWA | OK |
| Encoding PT/ES/EN + `check:encoding` no CI | OK |
| E2E + CI GitHub Actions | OK |
| SMART OAuth + admin clientes | OK |
| Google Meet handoff humanitário + Meet em consulta agendada (M1, M5) | OK |
| Footer/login: portal médico + psicólogo (M7) | OK |
| Farmácia deeplink Consulta Remédios (M8) | OK |
| Sentry integrado (M3 código) + banner gravação Daily (M4 código) | OK |
| `/settings` → redirect conta | OK |
| Admin + organization i18n (lotes 36–43) | OK |

---

## Regras de deploy

- Migrations **aditivas** — OK em horário de uso
- Trocar fluxo WhatsApp API ou auth = avisar antes
- Daily continua padrão de vídeo; Meet é opcional por env
