# Relatório de Auditoria — Portal do Psicólogo

**Data:** 11 de julho de 2026
**Escopo:** Portal `/psychologist/*`, módulo psychology (`/professional/psychology/*`), APIs `api/professional/psychology/*`, `api/psychologist/*`, `api/public/psychology/*`, libs `psychology-*`
**Modo:** Somente leitura — nenhuma alteração de código

---

## 1. Arquitetura

Psicólogo **não é um role separado** — é `ProfessionalProfile` com `specialty` de psicologia (`isPsychologistSpecialty`, `src/lib/psychologist-portal.ts:67`). O portal `/psychologist/*` é um espelho de `/professional/*` via re-exports e mapa de paths (`PROFESSIONAL_TO_PSYCHOLOGIST_PATHS`). Consequência importante: **todos os achados AGD do relatório de voluntário agendado (AGD-01, AGD-19 etc.) se aplicam a psicólogos**, pois availability/appointments são as mesmas páginas re-exportadas.

Gating em duas camadas: layout (`psychologist/layout.tsx` redireciona não-psicólogos para `/professional`) e API (`requirePsychologist` em `src/lib/psychology-api.ts:22`).

Módulos: notas de sessão (DAP/BIRP/SOAP/FREE), escalas (PHQ-9, GAD-7, BAI, BDI-II, DASS-21), alertas de risco, anamnese com link público por token, AI draft de notas, chart-chat (IA sobre prontuário), Receita Saúde, Google Calendar, compliance CFP 09/2024, EAP empresas, plano freemium (3 pacientes grátis, Pro R$79).

---

## 2. Achados

### A. Segurança e autorização

#### PSI-01 — IDOR: PUT de anamnese lê prontuário de qualquer profissional
- **Severidade:** ALTO
- **Arquivo:** `src/app/api/professional/psychology/anamnesis/route.ts` (~96-123, handler `PUT`)
- **Descrição:** O `PUT` recebe `patientRecordId` e busca `medicalDocument.findMany({ where: { patientRecordId, type: "CLINICAL_NOTE" } })` **sem verificar** `record.professionalId === professional.id` (checagem que existe nos handlers GET/POST da mesma rota e em todas as outras rotas psychology). Qualquer psicólogo autenticado pode ler conteúdo de anamnese (campos + `renderedBody`, PHI sensível descriptografado) de pacientes de outros profissionais, bastando conhecer/enumerar `patientRecordId`.
- **Correção:** Buscar `patientRecord` e validar ownership antes do `findMany`, como no POST (~75-77).

#### PSI-02 — Token de anamnese pública é `cuid()`; sem rate limit
- **Severidade:** MÉDIO
- **Arquivo:** `prisma/schema.prisma` (~1963, `token String @unique @default(cuid())`), `src/app/api/public/psychology/anamnesis/[token]/route.ts`
- **Descrição:** `cuid()` não é aleatoriedade criptográfica (contém timestamp/contador). A rota pública importa `clientIp` mas só para auditoria — **não há rate limiting** contra enumeração de tokens. O `maxViews: 30` protege por convite, não contra brute force. O GET retorna **nome completo do paciente** a qualquer portador do link.
- **Correção:** Gerar token com `crypto.randomBytes` (32+ chars); rate limit por IP na rota pública; considerar exibir só primeiro nome.

#### PSI-03 — JIT: profissional fica ONLINE sem checagem de `verified`
- **Severidade:** MÉDIO (confirmar)
- **Arquivo:** `src/app/api/jit/session/route.ts` (~137-150), `jit-session-lifecycle.ts` (~17-26)
- **Descrição:** POST de sessão JIT exige apenas `role === PROFESSIONAL` + perfil existente; nem a criação nem `activeOnlineJitSessionWhere()` filtram `verified: true`. Se não houver bloqueio em outra camada, profissional não verificado pode atender pacientes ao vivo. Afeta todos os portais, incluindo psicólogo.
- **Correção:** Exigir `verified` no POST da sessão e no filtro de listagem (confirmar antes se há gate no fluxo de onboarding).

#### PSI-04 — `requireProfessional` carrega perfil completo sem `select`
- **Severidade:** BAIXO
- **Arquivo:** `src/lib/psychology-api.ts` (~14-16)
- **Descrição:** `findUnique` sem `select` descriptografa campos desnecessários em toda request psychology.
- **Correção:** `select` mínimo (id, userId, specialty, firstName, lastName, licenseNumber).

#### PSI-05 — Layout permite profissional sem perfil no portal
- **Severidade:** BAIXO
- **Arquivo:** `src/app/(dashboard)/psychologist/layout.tsx` (~23: `if (profile && !isPsychologistSpecialty...)`)
- **Descrição:** Se `profile` for null, o acesso passa. As páginas internas provavelmente quebram ou redirecionam, mas o gate é frouxo.

### B. Privacidade / LGPD

#### PSI-06 — AI draft envia nome do paciente + notas brutas para API externa
- **Severidade:** MÉDIO (LGPD — minimização)
- **Arquivo:** `src/lib/ai-psychology-notes.ts` (~66-70), `ai-draft/route.ts`
- **Descrição:** `patientName` é enviado à API da Anthropic junto com as notas brutas da sessão. O nome é desnecessário para estruturar a nota (o próprio conteúdo já é PHI, mas o nome identifica diretamente). Chart-chat envia até 40 documentos descriptografados do prontuário (ownership OK, gate Pro OK), sem registro de consentimento/uso de IA no prontuário.
- **Correção:** Omitir/pseudonimizar `patientName` no draft ("Paciente"); registrar em auditoria o uso de IA sobre o prontuário; documentar na política de privacidade.

#### PSI-07 — Positivos de privacidade
- **Severidade:** BAIXO (positivo)
- Notas, títulos e respostas de anamnese criptografados em repouso (`encrypt` em session-notes, scales, anamnesis). Ownership verificado em session-notes GET/POST/PATCH, scales, chart-chat, receita-saude. Registros compartilhados não editáveis (`sourceDocumentId`, `session-notes/[id]/route.ts` ~30-31). Views de anamnese pública auditadas com IP/UA. Sem rota DELETE para notas de sessão (compatível com guarda de prontuário CFP).

### C. Clínico e segurança do paciente

#### PSI-08 — Alerta crítico de ideação suicida só aparece como banner no dashboard
- **Severidade:** MÉDIO (segurança clínica)
- **Arquivo:** `src/lib/psychology-risk.ts` (~33-38), `psychology-risk-alerts.ts`, `psychologist/page.tsx` (~108)
- **Descrição:** PHQ-9 item 9 ≥ 1 gera flag `suicidal_ideation` e nível `critical` — corretamente. Mas o alerta só é exibido no banner do dashboard (janela de 30 dias, máx. 8) quando o psicólogo abre a home. Não há notificação push/e-mail. E se `PSYCHOLOGY_RISK_ALERTS_ENABLED` estiver off, o risco **nem é calculado nem persistido** — a informação se perde silenciosamente.
- **Correção:** Notificação ativa (in-app + e-mail) para nível `critical`; sempre calcular/persistir o risco e usar a flag só para exibição.

#### PSI-09 — Positivos clínicos
- **Severidade:** BAIXO (positivo)
- Cortes das escalas corretos (PHQ-9 ≥20 grave, GAD-7 ≥15, BAI ≥26, BDI-II ≥29; DASS-21 com subescalas ×2 e índices corretos). Validação de contagem de respostas e range 0-3 via Zod. AI draft com system prompt adequado ("DRAFT, o psicólogo deve revisar e assinar", "não inventar fatos"). Página de compliance CFP 09/2024 completa com link à resolução. Checklist Receita Saúde factualmente correto (PF vs PJ/DMED, código 255, Carnê-Leão).

#### PSI-10 — Recibo PDF próprio pode ser confundido com recibo oficial Receita Saúde
- **Severidade:** BAIXO (produto)
- **Arquivo:** `receita-saude/route.ts` (POST gera PDF), `psychology-receita-saude.ts`
- **Descrição:** A plataforma emite um "recibo de honorários" em PDF. Desde 2025 o recibo oficial obrigatório para PF é emitido pelo app Receita Saúde/e-CAC. O checklist orienta bem, mas o PDF não avisa que não substitui o oficial.
- **Correção:** Rodapé/watermark no PDF: "Este recibo não substitui o recibo oficial do app Receita Saúde".

### D. Monetização / plano freemium

#### PSI-11 — Limite de 3 pacientes é contornável via importação CSV
- **Severidade:** MÉDIO
- **Arquivo:** `src/app/api/professional/records/route.ts` (~117-127, gate OK) vs `records/import/route.ts` (~132, **sem gate**)
- **Descrição:** `assertCanAddPsychologyPatient` só roda na criação manual. A importação cria `patientRecord` sem checar o limite. (Criações via `ensurePatientRecord` — booking, prescrição, share — também não checam; para essas, contornável é aceitável, mas o import é bypass direto do paywall.)
- **Correção:** Aplicar o mesmo gate no import (contando o lote).

#### PSI-12 — JIT e Google Calendar anunciados como Pro, mas sem gate no servidor
- **Severidade:** MÉDIO
- **Arquivo:** `psychology-plan-limits.ts` (~50-77: free = `jit: false, googleCalendar: false`), `jit/session/route.ts`, `google-calendar/connect/route.ts`
- **Descrição:** A tabela de planos e a UI (`PsychologyPlansSection`) vendem JIT e Google Calendar como benefícios Pro, mas nenhuma das rotas verifica `getPsychologyPlanTier` — psicólogo free usa ambos. Só o chart-chat é de fato gateado (402 `PSYCHOLOGY_PLAN_REQUIRED`).
- **Correção:** Decisão de negócio: ou gatear no servidor, ou corrigir a tabela/UI de planos.

#### PSI-13 — `getPsychologyPlanTier` aceita qualquer subscription ativa
- **Severidade:** BAIXO (verificar)
- **Arquivo:** `psychology-plan-limits.ts` (~14-20)
- **Descrição:** `db.subscription.findUnique({ where: { userId } })` sem filtrar tipo/produto do plano — se o mesmo modelo `Subscription` servir a outros produtos (ex.: Club Doctor), qualquer assinatura ativa viraria "pro" de psicologia. Confirmar semântica do modelo.

### E. Performance

#### PSI-14 — Filtro por marcador JSON exige descriptografar centenas de documentos
- **Severidade:** MÉDIO (escala)
- **Arquivo:** `session-notes/route.ts` (GET: 200 docs), `scales/route.ts` (GET: 200 docs), `psychology-risk-alerts.ts` (80 docs **a cada load do dashboard**)
- **Descrição:** Notas, escalas e anamneses são todas `MedicalDocument type: CLINICAL_NOTE`; a distinção (`psychologyNote`, `psychologyScale`, `psychologyAnamnesis`) está dentro do JSON criptografado. Todo GET descriptografa tudo e filtra em memória. `recordKind` já existe no schema (usado como `ANAMNESIS` no submit público) mas não para notas/escalas.
- **Correção:** Usar `recordKind` (ou campo novo) como discriminador indexável (`SESSION_NOTE`, `SCALE`) — migração aditiva + backfill; cachear alertas de risco.

### F. i18n e UX

#### PSI-15 — Chaves de plano sem espanhol
- **Severidade:** BAIXO
- **Arquivo:** `translations.ts` — `psy.plans.pro.jit` só em EN (~5615) e PT (~11252); ES ausente
- **Descrição:** Verificar o bloco `psy.plans.*` inteiro em ES. O restante do módulo psy tem boa cobertura tri-idioma (~404 chaves).

#### PSI-16 — Flag `PSYCHOLOGY_24H_WHATSAPP_ENABLED` morta
- **Severidade:** BAIXO
- **Arquivo:** `psychology-feature-flags.ts` (~21-23)
- **Descrição:** `isPsychology24hWhatsAppEnabled` não é usada em lugar nenhum — feature planejada e não implementada, ou resto de código.

#### PSI-17 — Feature flags default ON quando env ausente
- **Severidade:** BAIXO
- **Arquivo:** `psychology-feature-flags.ts` (~3-7)
- **Descrição:** `envOn(raw, defaultOn = true)` — env não definida = feature ligada. Um typo no nome da variável em produção liga a feature silenciosamente. Convenção mais comum é default OFF para features novas. Não é bug, mas vale ciência.

### G. EAP empresas

#### PSI-18 — Fluxo EAP bem protegido
- **Severidade:** BAIXO (positivo)
- **Arquivo:** `api/psychologist/empresas/route.ts`, `accept/route.ts`
- **Descrição:** GET exige psicólogo; aceite de convite valida token, expiração e que o usuário logado é o profissional convidado; token invalidado após uso (`inviteToken: null`). `isPsychologistSpecialty` também gateia booking EAP (`employer-eap-booking.ts:110`).

---

## 3. Tabela-resumo

| ID | Severidade | Área | Descrição |
|----|-----------|------|-----------|
| PSI-01 | **ALTO** | Segurança | IDOR no PUT de anamnese — lê PHI de pacientes de outros profissionais |
| PSI-02 | MÉDIO | Segurança | Token cuid + sem rate limit na rota pública de anamnese |
| PSI-03 | MÉDIO* | Segurança | JIT online sem checagem `verified` (*confirmar outra camada) |
| PSI-06 | MÉDIO | LGPD | Nome do paciente enviado à API de IA; sem trilha de uso de IA |
| PSI-08 | MÉDIO | Clínico | Alerta de ideação suicida só como banner passivo; flag off descarta risco |
| PSI-11 | MÉDIO | Plano | Import CSV contorna limite free de 3 pacientes |
| PSI-12 | MÉDIO | Plano | JIT/Google Calendar vendidos como Pro sem gate no servidor |
| PSI-14 | MÉDIO | Perf | Descriptografia em massa para filtrar notas/escalas; sem discriminador |
| PSI-04,05,10,13,15,16,17 | BAIXO | Vários | Endurecimento, produto e i18n |
| PSI-07,09,18 | BAIXO | Positivos | Criptografia, ownership, escalas corretas, CFP, EAP |

## 4. Ordem de correção sugerida

1. **PSI-01** — fix de uma linha de impacto alto (ownership no PUT de anamnese).
2. **PSI-08** — notificação ativa para risco crítico + persistir risco independente da flag.
3. **PSI-02** — token forte + rate limit na rota pública.
4. **PSI-11 + PSI-12** — coerência do freemium (gate no import; decisão JIT/GCal).
5. **PSI-06** — minimização de dados nas chamadas de IA.
6. **PSI-14** — discriminador `recordKind` (migração aditiva + backfill).
7. **PSI-03, 13** — confirmações; demais BAIXOs em janela de manutenção.

## Conclusão

O módulo do psicólogo é o mais completo da plataforma em produto (escalas, notas estruturadas, compliance CFP, Receita Saúde, EAP) e tem boa base de segurança (criptografia, ownership quase universal, Zod). Os três pontos que merecem ação imediata são o **IDOR do PUT de anamnese (PSI-01)**, o **tratamento passivo de alertas de ideação suicida (PSI-08)** e as **incoerências do freemium (PSI-11/12)**. Lembrando que agenda e voluntário agendado do psicólogo herdam integralmente os achados AGD já reportados.
