# Doctor8 — Backlog de melhorias

Lista viva de melhorias **pendentes**. Lotes pequenos, baixo risco ao fluxo humanitário (triagem → fila → vídeo → WhatsApp).

---

## Próximo (código ou config no Railway)

| # | Item | Prioridade | O que falta |
|---|------|------------|-------------|
| M2 | WhatsApp Business API (templates Meta) | Média | Railway: token + phone ID + webhook + app secret OK — confirmar template `WHATSAPP_REMINDER_TEMPLATE` aprovado na Meta |
| M3 | Sentry em produção | Baixa | Código pronto — definir `SENTRY_DSN` no Railway |
| M4 | Gravação cloud Daily | Baixa | Off por padrão — `DAILY_CLOUD_RECORDING=1` + banner já no código |
| M9 | Busca pública: banner + filtro voluntários AcuraBrasil | Média | OK — `PublicSearchClient`, landing e filtro `acuraVolunteers=1` |
| M10 | Google Meet em produção (humanitário + agendamentos) | Média | Código OK — service account + `GOOGLE_MEET_ENABLED=1` no Railway (ver `.env.example`) |
| M11 | Farmácia marketplace ativo | Baixa | Código OK — `PHARMACY_MARKETPLACE_ENABLED=true` (+ UTM/affiliate se quiser) |

---

## Operação (sem deploy de feature)

| Item | Notas |
|------|--------|
| Admins com login | Rodar `node scripts/fix-admin-users.mjs --promote` no Railway se ainda não feito |
| Contas profissionais Acura | Promover/verificar e-mails via admin ou scripts one-off (ex. psicólogo `contato@acurabrasil.org`) |
| Migration países Américas | Deve rodar no deploy (`registration_americas_regions`); conferir após push |

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
