# Programa Anjos — Estratégia multi-trilhas de voluntariado + Análise ponta a ponta + Prompt para o Cursor (v3)

**Data:** 13/07/2026 (v3 — substitui as versões anteriores)
**Definição do produto:** o login de **Anjo é exclusivo para quem NÃO é da área da saúde** mas quer ajudar de alguma forma. Profissionais de saúde já têm seus próprios logins (médico, psicólogo, etc.). O Anjo pode ajudar: em campo, com a própria profissão, acompanhando pacientes pós-consulta, entregando doações, fazendo cursos, na parte administrativa, e outras formas.
**Regras deste Cowork:** não codar — apenas analisar, estrategiar e gerar o prompt.

---

## 1. Onde estamos (diagnóstico resumido — detalhes na seção 5)

Hoje o sistema dos Anjos suporta **uma única forma de ajudar**: o acompanhamento pós-consulta (claim de paciente, follow-up com notas criptografadas, lembretes, escalonamento). Essa camada é madura e deve ser **preservada como está** — ela vira a primeira "trilha" do programa.

O que falta para o Anjo virar o programa que você descreveu:

1. **Não existe conceito de "formas de ajudar"** — `AngelProfile` tem `volunteerHelp` (texto livre digitado no cadastro) e `profession`, mas nada disso vira roteamento, matching ou permissão. Todo anjo aprovado cai no mesmo painel de follow-up.
2. **Não existe unidade de trabalho além do assignment de paciente** — não há turnos, tarefas, projetos nem eventos. Entregar doação, ajudar num mutirão ou fazer um projeto pro bono não têm onde existir no sistema.
3. **Cursos já existem na plataforma** (sistema de cursos com checkout, certificado `CourseCertificate` e verificação pública) mas **não conversam com os Anjos** — nem como treinamento obrigatório, nem como forma de engajamento.
4. **Achado crítico de segurança (mantido da v2):** o role ANGEL hoje tem acesso quase-admin ao monitoramento global de pacientes (`/admin/patients` + `/api/admin/patients*`, incluindo export CSV) via exceções em `src/lib/admin.ts` (`isAngelDashboardPath`) e `src/lib/api-route-roles.ts`. O home pós-login do Anjo também é `/admin/patients` em vez do painel dele. **Corrigir antes de qualquer expansão** — quanto mais gente entra como Anjo (e agora queremos MAIS gente, de perfis variados), maior o risco.
5. Gaps de entrada mantidos da v2: sem emails de aprovação/rejeição, motivo de rejeição oculto, sem treinamento obrigatório, screening de documento sem workflow, sem portal de login dedicado, signup Google não suporta ANGEL.

---

## 2. Benchmark — como as referências estruturam voluntariado multi-função

### 2.1 Taxonomia de funções (o "cardápio" de formas de ajudar)

- **[Cruz Vermelha Americana](https://www.redcross.org/volunteer/become-a-volunteer.html)** organiza voluntários **não-médicos** em papéis com descrição formal: abrigo e distribuição de suprimentos, **logística** (transporte, armazém, veículos), **apoio administrativo 100% remoto** (recrutamento, agendamento, relatórios, suporte a outros voluntários), conforto/escuta, educação preventiva. Cada papel tem **role description, treinamentos obrigatórios específicos e um líder designado**. O [modelo IFRC](https://volunteeringredcross.org/wp-content/uploads/2019/02/Volunteering-in-emergencies-LR.pdf) chama isso de *service delivery model*: voluntário recrutado contra uma descrição de papel, como um RH.
- **[Atados](https://www.atados.com.br/)** (maior plataforma brasileira, 344 mil voluntários): vagas filtráveis por **causa, habilidade** (direito, cozinha, tecnologia, idiomas, organização...), **cidade, disponibilidade (pontual vs. recorrente) e remoto vs. presencial**. A ONG é notificada da inscrição e faz a seleção. Perfil completo do voluntário alimenta recomendações por newsletter.

### 2.2 Unidades de trabalho (como o trabalho é "empacotado")

As plataformas convergem em **quatro formatos**, e essa é a chave da arquitetura:

| Formato | Referência | Exemplo |
|---|---|---|
| **Contínuo** (relação de longo prazo) | Crisis Text Line, programa atual de follow-up | Acompanhar até N pacientes |
| **Turno** (data/hora, local, vagas limitadas) | [Bancos de alimentos](https://www.signupready.com/for/food-banks): triagem de doações, motoristas de entrega, montagem de cestas, com capacidade por vaga e lembrete 24h antes | "Sábado 8h–11h, coleta de doações, 6 vagas, precisa de veículo" |
| **Tarefa/micro-voluntariado** (15 min–2h, geralmente remoto) | [Points of Light](https://www.pointsoflight.org/virtual-volunteering-opportunities/): transcrição, entrada de dados, legendas; [Catchafire](http://help.catchafire.org/en/articles/1971839-for-volunteers-a-guide-to-applying-for-projects-calls): calls de 1h | "Traduzir 2 páginas pt→es", "Conferir dados de 30 cadastros" |
| **Projeto** (escopo fechado, 5–50h, com entregável) | [Catchafire](https://blog.catchafire.org/make-skills-based-volunteering-your-next-chapter), [Taproot Plus](https://taprootfoundation.org/taproot-plus): projetos por habilidade (finanças, RH, TI, marketing, direito) com matching + candidatura de 100 palavras | "Criar identidade visual da campanha", "Revisar contratos de doação" |

### 2.3 Lições operacionais das referências

- **Treinamento por papel, não genérico** (Cruz Vermelha: cada função lista seus cursos obrigatórios; Crisis Text Line: 15h antes do 1º atendimento em papéis de escuta).
- **Screening proporcional ao risco** (Golden/Rosterfy: background check só para papéis sensíveis; papel de logística exige menos que papel com contato com pessoa vulnerável).
- **Turnos com capacidade + lembrete automático** reduzem no-show (SignUpReady/VolunteerHub).
- **Candidatura leve + seleção pelo coordenador** (Atados/Catchafire: inscrever é fácil; quem aprova é a organização).
- **Todo voluntário tem um líder/ponto focal** (IFRC) — no nosso caso, o coordenador da campanha.
- **Horas e impacto são a moeda universal** entre trilhas (Golden/POINT): tudo soma no mesmo extrato de horas e certificado.

---

## 3. ESTRATÉGIA — Programa Anjos multi-trilhas

### 3.1 Princípio de identidade

**"Anjo" = qualquer pessoa fora da área da saúde que doa tempo ou habilidade às campanhas humanitárias da Doctor8.** Um único login, um único perfil, um único extrato de horas — e **várias trilhas de atuação** que a pessoa escolhe (pode ter mais de uma).

### 3.2 As trilhas (taxonomia proposta)

| # | Trilha | O que faz | Formato dominante | Nível de screening |
|---|---|---|---|---|
| 1 | **Anjo de Escuta** (Acompanhamento) | Follow-up pós-consulta via WhatsApp/telefone — **o sistema atual, intacto** | Contínuo (assignments) | **Alto** (contato direto com paciente vulnerável): doc verificado + treinamento obrigatório |
| 2 | **Anjo de Campo** | Mutirões, eventos de saúde, recepção, apoio presencial | Turnos | Médio (doc + orientação) |
| 3 | **Anjo de Entregas** (Logística) | Coleta, triagem e entrega de doações (remédios, cestas, roupas); transporte | Turnos (com flag "tem veículo") | Médio |
| 4 | **Anjo Profissional** (Skills) | Pro bono com a própria profissão: advogado, contador, designer, dev, professor, marketing... | Tarefas + Projetos | Médio (alto se envolver dado de paciente) |
| 5 | **Anjo Intérprete** | Tradução/interpretação pt↔es (venezuelanos), revisão de materiais | Tarefas + Contínuo | Alto se em consulta/contato com paciente; médio se só conteúdo |
| 6 | **Anjo de Retaguarda** (Administrativo) | Apoio remoto à coordenação: conferência de dados, agendamento, relatórios, suporte a outros anjos | Tarefas recorrentes | Médio-alto (pode ver dados operacionais) |
| 7 | **Anjo Educador / Aprendiz** | Fazer os cursos da plataforma (formação continuada) e, quando qualificado, dar oficinas para a comunidade | Cursos + Turnos | Baixo (aprendiz) / Médio (educador) |
| 8 | **Anjo Embaixador** | Divulgação, mobilização de doadores e novos anjos, redes sociais locais | Tarefas leves | Baixo |

Observações de design:

- A trilha 1 é o sistema atual — **não se mexe na lógica**, só se encaixa na nova moldura.
- As trilhas 2, 3 e parte da 7 são **presenciais** → precisam do conceito de turno com local, data, vagas e lembrete.
- As trilhas 4, 5, 6 e 8 são majoritariamente **remotas** → precisam do conceito de tarefa/projeto com candidatura.
- O campo `profession` + `volunteerHelp` que já existem no cadastro viram **sinal de matching** para a trilha 4.
- A trilha 7 (cursos) reaproveita **integralmente** o sistema de cursos que acabou de ser construído (checkout, `CourseCertificate`, verificação pública) — cursos gratuitos ou com cupom 100% para anjos, e certos cursos marcados como **treinamento obrigatório de trilha**.

### 3.3 A unidade de trabalho unificada: "Missão"

Em vez de construir um sistema para cada trilha, criar **um único modelo `AngelMission`** que cobre tudo (padrão das plataformas de referência):

- **Tipo:** `TURNO` (data/hora/local/vagas) | `TAREFA` (remota, curta, N vagas) | `PROJETO` (escopo + entregável + candidatura) — o contínuo (trilha 1) permanece no sistema de assignments existente.
- **Campos:** trilha, campanha, título, descrição, local (ou remoto), início/fim, vagas, requisitos (veículo, idioma, skill, screening mínimo, curso obrigatório), status.
- **Ciclo:** admin publica → anjo se inscreve (`AngelMissionSignup`: PENDING → CONFIRMED → ATTENDED/COMPLETED → horas creditadas) → lembrete automático 24h antes (turnos) → check-in/confirmação de presença pelo coordenador → horas caem no extrato do anjo.
- **Matching:** lista de missões filtrada/ordenada por trilhas de interesse, idiomas, skills e cidade/região do anjo (modelo Atados).

### 3.4 Ciclo de vida do Anjo (novo funil)

```
Cadastro único (/register/angel)
  → escolhe trilhas de interesse + skills + disponibilidade + cidade
  → email verificado
  → screening proporcional (doc obrigatório p/ trilhas de risco médio/alto)
  → aprovação pelo admin (por trilha, não global)
  → treinamento da trilha (cursos da plataforma; gate antes da 1ª missão/claim)
  → opera: assignments (trilha 1) e/ou missões (demais trilhas)
  → horas + impacto + certificado unificados
  → reconhecimento (marcos) + comunicados + check-ins de bem-estar
```

Cada trilha tem seu gate; o anjo aprovado só na trilha "Embaixador" nunca vê dado de paciente. **Aprovação por trilha** substitui o `approvalStatus` binário atual (com migração: quem é APPROVED hoje vira aprovado na trilha Escuta).

### 3.5 O que o coordenador (admin) ganha

- CRUD de missões por campanha e trilha, com vagas e requisitos.
- Fila de inscrições para confirmar/recusar; marcação de presença; crédito de horas.
- Painel por trilha: anjos ativos, horas, missões abertas/lotadas, no-show, inativos.
- Broadcast por trilha ou campanha.

### 3.6 O que NÃO fazer agora (anti-escopo)

- Não criar app mobile, QR check-in nem kiosk (fase futura; o check-in manual do coordenador basta).
- Não criar marketplace aberto de ONGs (as missões são só das campanhas Doctor8).
- Não automatizar background check com fornecedor externo (workflow manual de screening primeiro).
- Não mexer na lógica interna de claim/follow-up da trilha 1.

---

## 4. Plano em ondas (atualizado)

- **Onda 0 — Segurança (imediato):** remover privilégio quase-admin do ANGEL; corrigir home pós-login para `/admin/angel`.
- **Onda 1 — Fundação do programa:** trilhas no perfil e no cadastro; aprovação por trilha; screening com workflow; emails de status + linha do tempo; treinamento com gate (integração com cursos).
- **Onda 2 — Missões:** modelo `AngelMission` + inscrições + turnos com lembrete + presença + horas; painel do anjo com "minhas missões" e "missões abertas" (matching); admin de missões.
- **Onda 3 — Ciclo de vida:** extrato de horas unificado + painel de impacto + certificado de voluntariado; marcos; perfil/disponibilidade self-service com pausa; portal de login dedicado.
- **Onda 4 — Coordenação (fase seguinte):** broadcast, check-ins de bem-estar/supervisão, analytics de retenção, projetos com candidatura estilo Catchafire (a Onda 2 entrega TURNO e TAREFA; PROJETO com candidatura textual pode vir aqui).

---

# 5. PROMPT PARA O CURSOR (copie a partir daqui)

---

**Contexto:** App Next.js (App Router) + Prisma + NextAuth v5, projeto Doctor8. Existe um sistema de voluntários leigos ("Anjos", `UserRole.ANGEL`) para campanhas humanitárias, hoje limitado a UMA função: acompanhamento pós-consulta (claim de paciente + follow-up). Vamos transformá-lo num **programa multi-trilhas de voluntariado** ("Missões"), preservando intacta a lógica de follow-up existente. O Anjo é exclusivo para quem NÃO é da área da saúde (profissionais de saúde têm seus próprios roles/logins).

Arquivos-chave existentes (NÃO recriar, apenas estender):

- Auth: `src/lib/auth.ts`, `src/lib/auth-portals.ts`, `src/lib/role-home.ts`, `src/middleware.ts`, `src/lib/api-route-roles.ts`, `src/lib/admin.ts` (`isAngelDashboardPath`)
- Cadastro: `src/app/(auth)/register/angel/page.tsx`, `src/app/api/auth/register-angel/route.ts`
- Domínio: `src/lib/humanitarian/angel.ts` (`resolveAngelAccess`, `MAX_PATIENTS_PER_ANGEL`), `angel-risk-summary.ts`, `angel-patient-journey.ts`
- Painel do anjo: `src/app/(dashboard)/admin/angel/page.tsx` + `src/components/humanitarian/AngelFollowUpClient.tsx`
- Admin: `src/app/api/admin/humanitarian/angels/route.ts` + `src/components/humanitarian/HumanitarianAngelsAdminPanel.tsx`
- Nav: `src/lib/platform-nav-registry.ts` (`ANGEL_NAV`)
- Cursos (reaproveitar): models de curso + `CourseCertificate` + verificação pública de certificado, checkout e cupons em `src/lib/courses/*`
- Schema: `prisma/schema.prisma` (`AngelProfile`, `HumanitarianAngel`, `HumanitarianAngelFollowUp`, `HumanitarianAngelAssignment`, enum `AngelApprovalStatus`)

Padrões do repo a manter: zod, `NextResponse.json`, auditoria (`auditAngelEvent`/`createAuditLog`), rate limiting, criptografia de campos sensíveis, i18n pt/en/es (`src/lib/i18n/translations.ts`). **Não quebre** `resolveAngelAccess`, claim/release, follow-up nem o painel admin atual. Gere migrações Prisma com backfill e testes. Implemente em ondas, na ordem. Se uma onda ficar grande demais, conclua-a por completo antes de seguir e liste o que ficou pendente.

## ONDA 0 — SEGURANÇA (fazer primeiro, isolada num commit próprio)

### 0.1 Remover o privilégio quase-admin do Anjo
Hoje o role ANGEL acessa o monitoramento global de pacientes do admin (todos os pacientes, export CSV, ações de fila). Aplicar mínimo privilégio:
- Em `src/lib/admin.ts`, remova `/admin/patients` de `isAngelDashboardPath` (mantenha apenas `/admin/angel*`).
- Em `src/lib/api-route-roles.ts`, remova a exceção que permite `ANGEL` em `isPatientAdminPath` — essas rotas voltam a ser ADMIN-only.
- Em `getPatientAdminSession()` e handlers de `/api/admin/patients*`, remova a aceitação do role ANGEL.
- Em `platform-nav-registry.ts`, remova `/admin/patients` do `ANGEL_NAV`.
- Se algo do painel do Anjo depender dessas rotas, crie endpoint próprio sob `/api/humanitarian/angel/*` restrito a assignment + consentimento.

### 0.2 Corrigir home pós-login
- Em `src/lib/role-home.ts`, mude o home de `ANGEL` de `/admin/patients` para `/admin/angel`. Ajuste redirects equivalentes (ex.: `src/app/onboarding/page.tsx`).

## ONDA 1 — Fundação do programa multi-trilhas

### 1.1 Trilhas no schema
```prisma
enum AngelTrack {
  ESCUTA        // acompanhamento pós-consulta (sistema atual)
  CAMPO         // eventos/mutirões presenciais
  ENTREGAS      // logística de doações
  PROFISSIONAL  // pro bono com a própria profissão
  INTERPRETE    // tradução pt/es
  RETAGUARDA    // apoio administrativo remoto
  EDUCADOR      // cursos e oficinas
  EMBAIXADOR    // divulgação/mobilização
}

enum AngelTrackStatus { INTERESTED APPROVED PAUSED REVOKED }

model AngelTrackEnrollment {
  id         String   @id @default(cuid())
  profileId  String
  profile    AngelProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  track      AngelTrack
  status     AngelTrackStatus @default(INTERESTED)
  approvedAt DateTime?
  approvedById String?
  notes      String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  @@unique([profileId, track])
}
```
Em `AngelProfile`, adicione: `skills String[] @default([])`, `city String?`, `hasVehicle Boolean @default(false)`, `availabilityNote String?`, `availabilityStatus AngelAvailabilityStatus @default(AVAILABLE)` com `enum AngelAvailabilityStatus { AVAILABLE LIMITED PAUSED }` e `pausedUntil DateTime?`.

**Backfill (migração):** todo `AngelProfile` com `approvalStatus=APPROVED` ganha `AngelTrackEnrollment(track=ESCUTA, status=APPROVED)`; PENDING ganha `INTERESTED`. O `approvalStatus` existente continua valendo como aprovação geral do cadastro (identidade), e a trilha vale como permissão de atuação — documente isso em comentário no schema.

### 1.2 Cadastro com escolha de trilhas
- Em `/register/angel`, adicione seleção múltipla de trilhas ("Como você quer ajudar?") com descrição curta de cada uma, + cidade, + "tenho veículo" (só se marcar ENTREGAS/CAMPO), + skills (chips: direito, contabilidade, design, tecnologia, marketing, educação, cozinha, transporte, organização, idiomas, outros — modelo Atados). Mantenha `profession` e `volunteerHelp`.
- API `register-angel`: persistir trilhas como `AngelTrackEnrollment(INTERESTED)`. Documento de ID: torná-lo **obrigatório quando alguma trilha selecionada for de screening médio/alto** (todas menos EMBAIXADOR e EDUCADOR-aprendiz); caso contrário segue opcional.

### 1.3 Screening com workflow (proporcional ao risco)
```prisma
enum AngelScreeningStatus { NOT_SUBMITTED SUBMITTED IN_REVIEW VERIFIED REJECTED }
```
Em `AngelProfile`: `screeningStatus AngelScreeningStatus @default(NOT_SUBMITTED)`, `screeningNotes String?`, `screeningReviewedAt DateTime?`, `screeningReviewedById String?`.
- Cadastro com documento → `SUBMITTED`. Painel admin: ações `IN_REVIEW`/`VERIFIED`/`REJECTED` com nota, auditadas.
- Regra central `requiredScreeningForTrack(track)` em `src/lib/humanitarian/angel-tracks.ts`: ESCUTA e INTERPRETE exigem `VERIFIED`; CAMPO/ENTREGAS/PROFISSIONAL/RETAGUARDA exigem pelo menos `SUBMITTED` (configurável via env `ANGEL_REQUIRE_SCREENING_STRICT=true` para exigir VERIFIED); EMBAIXADOR/EDUCADOR não exigem. Aplicar essa regra ao aprovar trilha.
- Backfill: APPROVED existentes com documento → `VERIFIED`; sem documento → `NOT_SUBMITTED`.

### 1.4 Aprovação por trilha no admin
- Estenda `GET/PATCH /api/admin/humanitarian/angels` e `HumanitarianAngelsAdminPanel`: exibir trilhas de cada anjo com status, e ações aprovar/pausar/revogar **por trilha** (validando screening da 1.3). Manter approve/reject/pause globais existentes.
- **Emails transacionais** (infra `src/lib/email*`): aprovação de cadastro, aprovação de trilha (com link para o painel), rejeição (incluindo `rejectionReason` — que também deve passar a aparecer na UI do anjo em estado REJECTED).

### 1.5 Treinamento por trilha usando o sistema de cursos
- Novo model:
```prisma
model AngelTrackTrainingRequirement {
  id       String @id @default(cuid())
  track    AngelTrack
  courseId String
  required Boolean @default(true)
  @@unique([track, courseId])
}
```
- Admin pode vincular cursos existentes como treinamento de trilha. Anjo acessa esses cursos **gratuitamente** (matrícula direta sem checkout, ou cupom 100% — escolha o caminho mais simples na infra atual de cursos e documente).
- **Gate:** helper `hasCompletedTrackTraining(profileId, track)` (curso concluído/certificado emitido). No claim da trilha ESCUTA (`/api/humanitarian/angel/patients/[id]/claim`) e na inscrição em missão (Onda 2), bloquear se treinamento obrigatório pendente, com erro claro + link do curso. **Backfill:** anjos ESCUTA já ativos são considerados treinados (registro de dispensa na migração).
- Se não houver curso vinculado à trilha, o gate não bloqueia (programa começa sem travar).

### 1.6 Linha do tempo de status para o anjo
- Na UI de status do `AngelFollowUpClient` (estados `EMAIL_UNVERIFIED`/`PENDING`/`REJECTED`/`NOT_ENROLLED`): linha do tempo "Cadastro → Email verificado → Documento em análise → Trilhas aprovadas → Treinamento → Ativo", com passo atual destacado, CTAs (reenviar verificação, enviar documento, ir ao curso) e exibição do `rejectionReason` quando rejeitado. Textos pt/en/es sem jargão.

## ONDA 2 — Missões (turnos e tarefas)

### 2.1 Schema
```prisma
enum AngelMissionType { TURNO TAREFA }        // PROJETO fica para fase futura
enum AngelMissionStatus { DRAFT OPEN FULL CLOSED CANCELLED COMPLETED }
enum AngelSignupStatus { PENDING CONFIRMED DECLINED CANCELLED ATTENDED NO_SHOW COMPLETED }

model AngelMission {
  id           String @id @default(cuid())
  campaignId   String
  campaign     HumanitarianCampaign @relation(fields: [campaignId], references: [id])
  track        AngelTrack
  type         AngelMissionType
  title        String
  description  String
  isRemote     Boolean @default(false)
  location     String?          // endereço/instruções quando presencial
  startsAt     DateTime?        // obrigatório p/ TURNO
  endsAt       DateTime?
  capacity     Int @default(1)
  requiresVehicle Boolean @default(false)
  requiredLanguages String[] @default([])
  estimatedMinutes Int?         // p/ TAREFA
  status       AngelMissionStatus @default(DRAFT)
  createdById  String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  signups      AngelMissionSignup[]
  @@index([campaignId, track, status])
}

model AngelMissionSignup {
  id          String @id @default(cuid())
  missionId   String
  mission     AngelMission @relation(fields: [missionId], references: [id], onDelete: Cascade)
  profileId   String
  profile     AngelProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  status      AngelSignupStatus @default(PENDING)
  note        String?
  minutesCredited Int?
  decidedById String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@unique([missionId, profileId])
}
```

### 2.2 Regras de negócio (em `src/lib/humanitarian/angel-missions.ts`)
- Inscrição exige: trilha da missão `APPROVED` para o anjo, screening da trilha ok, treinamento da trilha ok, `availabilityStatus != PAUSED`, requisitos da missão atendidos (veículo/idioma).
- Capacidade: quando CONFIRMED atinge `capacity`, missão vira `FULL` (novas inscrições entram como PENDING/lista de espera).
- Coordenador confirma/recusa inscrições; após o turno, marca `ATTENDED`/`NO_SHOW`; `ATTENDED`/`COMPLETED` credita `minutesCredited` (default: duração do turno ou `estimatedMinutes`).
- **Lembrete automático 24h antes** do TURNO para CONFIRMED (usar o cron existente em `src/app/api/cron` + `createNotification` e email).
- Auditoria + rate limiting em todos os endpoints.

### 2.3 APIs e UI
- Anjo: `GET /api/humanitarian/angel/missions` (abertas, filtradas às trilhas aprovadas do anjo, ordenadas por match de idioma/cidade/skills), `POST /api/humanitarian/angel/missions/[id]/signup`, `DELETE .../signup` (cancelar), `GET /api/humanitarian/angel/missions/mine`.
- Painel do anjo: nova aba/rota `/admin/angel/missoes` com "Missões abertas para você" (com selos de match) e "Minhas missões" (próximos turnos, tarefas em andamento, histórico). A trilha ESCUTA continua na tela atual de follow-up, intocada.
- Admin: `/admin/humanitarian` ganha gestão de missões (CRUD, publicar, ver inscritos, confirmar/recusar, presença, crédito de horas) via `GET/POST/PATCH /api/admin/humanitarian/missions*`.

## ONDA 3 — Ciclo de vida (horas, impacto, certificado, perfil, portal)

### 3.1 Extrato de horas unificado
```prisma
model AngelHourLog {
  id        String @id @default(cuid())
  profileId String
  profile   AngelProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  track     AngelTrack
  minutes   Int
  source    String   // "mission" | "followup" | "manual"
  sourceId  String?
  occurredAt DateTime @default(now())
  note      String?
  createdAt DateTime @default(now())
  @@index([profileId, occurredAt])
}
```
- Missões creditam automaticamente; follow-up da trilha ESCUTA ganha campo opcional "tempo gasto (min)" ao registrar contato.

### 3.2 Painel de impacto + certificado
- `/admin/angel/impacto`: horas por trilha (mês/total), pacientes apoiados, follow-ups, missões concluídas.
- **Certificado de voluntariado** em PDF com código verificável, reutilizando a infra do certificado de cursos (nome, campanha, trilhas, período, horas). Mínimo configurável `ANGEL_CERT_MIN_HOURS` (env). Página pública de verificação.
- **Marcos:** `AngelMilestone { profileId, key, achievedAt, @@unique([profileId, key]) }` — 1/5/10/25 pacientes; 5/20/50 missões; 10/50/100 horas — exibidos no impacto + `createNotification` (uma vez por marco).

### 3.3 Perfil self-service
- `/admin/angel/perfil` + `GET/PATCH /api/humanitarian/angel/profile`: editar idiomas, skills, cidade, veículo, disponibilidade e **modo pausa** (`PAUSED` + `pausedUntil` — some de novos matches e lembretes de novos pacientes/missões, mantém compromissos atuais). Solicitar entrada em nova trilha (cria `INTERESTED` para o admin aprovar).
- Limite de claim da ESCUTA: `min(weeklyCapacity ?? MAX_PATIENTS_PER_ANGEL, MAX_PATIENTS_PER_ANGEL)` se você adicionar `weeklyCapacity Int?` ao perfil.

### 3.4 Portal de login dedicado
- `/humanitarian/angel/login` (rota pública) reutilizando o componente compartilhado de login com o acento "rose"/coração do cadastro. Atualize `ANGEL_LOGIN` em `auth-portals.ts` e links. Pós-login → `callbackUrl` ou `/admin/angel`.

## ONDA 4 — Coordenação (implementar se houver tempo; senão deixar TODO documentado)

- **Broadcast por trilha/campanha** (model `AngelAnnouncement` + painel + `createNotification`).
- **Check-ins de bem-estar & supervisão** (referências: Crisis Text Line tem supervisor + debriefing; IFRC recomenda supervisão de apoio regular e não punitiva): pesquisa curta periódica ao anjo + notas de supervisão só-admin + sinalização de desgaste (muitos casos CRISIS/NEEDS_HELP seguidos na ESCUTA).
- **Analytics do coordenador:** anjos ativos por trilha, retenção, fill-rate e no-show de missões, tempo até 1º contato (ESCUTA), inativos há N dias com nudge via cron.
- **Missões tipo PROJETO** com candidatura textual curta e seleção (estilo Catchafire/Taproot).

## Qualidade / entrega

- Migrações Prisma + `prisma generate`; backfills descritos (trilha ESCUTA, screening, dispensa de treinamento) para NÃO travar anjos ativos.
- Auditoria e rate limiting em todos os novos endpoints; i18n pt/en/es em toda UI nova; nenhuma exposição extra de dados de paciente (missões não carregam PHI); manter criptografia das notas de follow-up.
- `.env.example`: `ANGEL_REQUIRE_SCREENING_STRICT`, `ANGEL_CERT_MIN_HOURS`.
- **Testes** (Vitest/Playwright conforme o repo): ANGEL bloqueado em `/admin/patients` e `/api/admin/patients*`; home → `/admin/angel`; inscrição em missão bloqueada sem trilha aprovada/screening/treinamento; capacidade e lista de espera; presença creditando horas; lembrete 24h; gate de treinamento no claim ESCUTA; pausa removendo de novos matches; certificado ≥ mínimo; transições de screening e de trilha.
- Rode lint/typecheck. **Entregue:** lista de arquivos criados/alterados, comando de migração e roteiro de teste manual por onda.

---

## 6. Resumo executivo

O Anjo deixa de ser "voluntário de follow-up" e vira **o programa de voluntariado leigo da Doctor8**, com 8 trilhas (escuta, campo, entregas, profissional, intérprete, retaguarda, educador, embaixador) — espelhando como Cruz Vermelha, Atados e Catchafire estruturam voluntariado multi-função. A arquitetura se apoia em três peças: **trilhas com aprovação e screening proporcionais ao risco**, uma **unidade de trabalho única ("Missão": turno ou tarefa)** que cobre doações, mutirões, pro bono e apoio administrativo, e um **extrato de horas/certificado unificado** que aproveita o sistema de cursos recém-construído como treinamento e formação continuada. O follow-up atual permanece intacto como trilha nº 1. Antes de expandir, a Onda 0 fecha o achado crítico: hoje o Anjo tem acesso quase-admin ao monitoramento global de pacientes — inaceitável num programa que vai receber muito mais gente de perfis variados.
