# Análise minuciosa — Dashboard do Psicanalista (`/psychoanalyst`) + Prompt para o Cursor

**Data:** 11/07/2026 · **Modo:** somente leitura
**Escopo:** home, analisandos, notas de sessão, agenda, Freud IA, biblioteca de recursos, financeiro, configurações, disponibilidade, navegação e APIs `api/psychoanalyst/*`.

---

## Parte 1 — Mapa do portal (o que existe hoje)

| Rota | Implementação | Estado |
|---|---|---|
| `/psychoanalyst` | Server component próprio (185 linhas) | Funcional, raso |
| `/psychoanalyst/analysands` | Client (139 linhas) — lista + form de criação | Funcional, incompleto |
| `/psychoanalyst/analysands/[id]` | Client (149 linhas) — notas de sessão | Funcional, com lacunas sérias |
| `/psychoanalyst/appointments` | Server + `PsychoanalystAppointmentsView` (168 linhas) | Funcional, sem filtros |
| `/psychoanalyst/freud` | `FreudPageClient` — IA + biblioteca educacional | Bom |
| `/psychoanalyst/resources` | Client (430 linhas) — biblioteca com share/PDF | Bom, com falhas silenciosas |
| `/psychoanalyst/financeiro` | Reusa `FinanceiroDashboard` do professional | OK (reuso correto) |
| `/psychoanalyst/messages` | Re-export da página do paciente | OK |
| `/psychoanalyst/meeting-rooms` | Reusa `MeetingRoomsDashboardPage` | OK |
| `/psychoanalyst/account` | Re-export do professional | OK |
| `/psychoanalyst/settings` | Client (266 linhas) — perfil completo | Bom |
| `/psychoanalyst/settings/availability` | Client (396 linhas) — blocos semanais | Bom |
| `/psychoanalyst/doctor-connection` | Landing de benefícios | OK |

APIs: `analysands`, `session-notes` (+share), `resources` (+share/pdf), `availability`, `profile`, `public-profile`, `practice`, `health-plans`, `consult-services`, `financeiro`, `freud-ask`, `organization`, `ai-consult-notes`.

---

## Parte 2 — Problemas abertos (verificados no código)

### A. Home — `src/app/(dashboard)/psychoanalyst/page.tsx`

1. **Banner humanitário com região quebrada** — `getActiveCampaignForRegion(null)` passa `null` fixo, mesmo com `userRow.region` buscado logo acima. Mesmo bug já mapeado no dashboard do médico. O direcionamento regional de campanha nunca funciona.
2. **Código morto** — `const hour = new Date().getHours(); void hour;` (resquício de saudação por horário).
3. **Queries em cascata** — `profile` → `await audit.viewRecord` (serial) → `userRow` → `Promise.all`. O `audit` bloqueia o render e `profile`/`userRow` poderiam ser paralelos.
4. **3º stat card é dado estático de perfil** — "Instituição de formação" não é KPI. Faltam métricas acionáveis: consultas PENDING aguardando confirmação, mensagens não lidas, próxima sessão.
5. **Stat cards não são clicáveis** — "Hoje" deveria levar à agenda, "Analisandos" à lista.
6. **`todayCount` mistura CONFIRMED + PENDING** sem distinção — o número não diz se há algo exigindo ação.
7. **Grade de 8 quick-links duplica a sidebar** — ocupa a dobra inteira e empurra "Próximas consultas" para baixo. Ainda assim **omite** Mensagens e Salas de reunião (que existem no `PSYCHOANALYST_NAV_GROUPS`).
8. **Botão "Entrar" inconsistente** — na home aparece para qualquer `TELECONSULT` (inclusive PENDING); em `PsychoanalystAppointmentsView` exige `status === "CONFIRMED"`. A lista da home também não mostra badge de status nem link "ver todas".
9. **Sem onboarding** — `useRegistrationChecklist` existe e é usado em settings, mas a home não mostra checklist de cadastro (verificação, disponibilidade, preços). Psicanalista novo cai numa home vazia sem orientação.

### B. Analisandos — `analysands/page.tsx` + `api/psychoanalyst/analysands/route.ts`

10. **Form não expõe campos que a API já aceita** — o schema aceita `phone`, `notes`, `sessionFrequency`, mas o form só tem nome/sobrenome/e-mail.
11. **Falha de criação é silenciosa** — `if (res.ok) {...}` sem `else`; erro 400/500 deixa o form aberto sem nenhuma mensagem. Zero toasts na página.
12. **Sem busca, filtro ou paginação** — API retorna até 200 registros de uma vez; a lista vira scroll infinito sem busca por nome. `processStartDate`/`updatedAt` vêm da API e são ignorados na UI.
13. **Avatar quebra com nome vazio** — `{a.firstName[0]}{a.lastName[0]}` renderiza `undefined` se o decrypt falhar ou campo vier vazio.
14. **Auto-vínculo por e-mail sem consentimento** — o POST faz `user.findUnique({ email })` e seta `linkedUserId` silenciosamente, vinculando a conta de um paciente existente ao registro clínico sem convite/aceite. Além disso, para analisando **não** vinculado não existe ação de convite (o badge "linked" existe, o fluxo de convidar não).

### C. Detalhe do analisando — `analysands/[id]/page.tsx`

15. **A página nunca busca o analisando** — não existe `GET /api/psychoanalyst/analysands/[id]`; o header mostra só "Sessões" genérico, sem nome, e-mail, frequência, início do processo ou telefone. ID inexistente/de outro analista renderiza a página normalmente com lista vazia (sem 404).
16. **Notas sem editar nem excluir** — só criar e compartilhar.
17. **Compartilhar nota clínica com o paciente sem confirmação** — um clique em "Share" envia a nota de sessão (conteúdo sensível) direto, sem dialog de confirmação. Estados de share usam magic strings (`"..."`, `"shared"`, `"invite"`).
18. **Falha de save silenciosa** — `if (res.ok)` sem else, sem mensagem de erro.
19. **Data fora do padrão do app** — `new Date(n.createdAt).toLocaleString()` ignora locale e timezone helpers (`lib/timezone`) usados no resto do portal.
20. **Título da nota hardcoded em pt-BR** — o POST de `session-notes` responde `` `Sessão — ${date.toLocaleDateString("pt-BR")}` `` independente do idioma do usuário.

### D. Agenda — `appointments/page.tsx` + `PsychoanalystAppointmentsView.tsx`

21. **Sem abas, filtros ou busca** — `take: 100` em ordem DESC mistura passado e futuro numa lista única; sem separação próximas/histórico, sem filtro por status, sem busca por nome.
22. **Campos intake mortos** — `intakeHealthPlanLabel/ServiceName/VisitReason` são sempre `null` no server e o componente carrega renderização condicional para eles.
23. **"Criar analisando" perde contexto** — o link manda para `/psychoanalyst/analysands` sem pré-preencher nome/vincular o paciente da consulta; o psicanalista redigita tudo.
24. **COMPLETED e CONFIRMED com a mesma cor** (violet) no `statusColors`.
25. **Subtítulo errado** — reusa `t("pa.dash.subtitle")` (subtítulo da home) na página de agenda.

### E. Freud IA — `freud-ask/route.ts`

26. **Sem rate limit** — endpoint chama IA paga sem nenhum throttle por usuário (compare com `phi-platform-search` que tem rate-limit). Custo/abuso em aberto.
27. Sem histórico de perguntas na sessão e sem botão copiar resposta (menor).

### F. Biblioteca — `resources/page.tsx`

28. **Delete otimista sem verificação** — `deleteResource` remove da UI sem checar `res.ok`; usa `confirm()` nativo; erros de load engolidos com `catch { /* ignore */ }`.

---

## Parte 3 — PROMPT PARA O CURSOR

Copie tudo abaixo da linha e cole no Cursor:

---

## Melhorias no portal do Psicanalista (`/psychoanalyst`) — Doctor8

Trabalhe no portal do psicanalista. **Não altere schema Prisma exceto onde indicado explicitamente (nenhuma alteração de schema é necessária). Não toque em outros portais** (professional, psychologist etc.), exceto componentes compartilhados quando indicado. Siga os padrões existentes do repositório: i18n via `useI18n()`/`translate` (adicione chaves novas em `src/lib/i18n/translations.ts` para pt, en, es), datas via helpers de `src/lib/timezone.ts`, estilo Tailwind com paleta violet do portal, criptografia via `encrypt`/`safeDecrypt`.

### Tarefa 1 — Correções rápidas na home (`src/app/(dashboard)/psychoanalyst/page.tsx`)

1. Remova o código morto `const hour = new Date().getHours(); void hour;`.
2. Corrija `getActiveCampaignForRegion(null)` → passe `userRow?.region ?? session.user.region ?? null`. Para isso, busque `userRow` **antes** ou junto (o `providerDayBounds` já depende dele; mantenha a ordem, apenas passe a região real).
3. Paralelize: busque `profile` e `userRow` num `Promise.all`; transforme `audit.viewRecord` em chamada não bloqueante (`void audit.viewRecord(...)` ou dispare sem await, mantendo tratamento de erro engolido como nos outros portais).
4. Torne os dois primeiros stat cards links: "Hoje" → `/psychoanalyst/appointments`, "Analisandos" → `/psychoanalyst/analysands`.
5. Substitua o 3º card ("Instituição") por **"Aguardando confirmação"**: contagem de appointments com `status: "PENDING"` e `scheduledAt >= now` do psicanalista, linkando para a agenda. Adicione chaves i18n (`pa.dash.pending` etc.).
6. Na lista "Próximas consultas": adicione badge de status (PENDING amber / CONFIRMED violet, reutilize o padrão do `PsychoanalystAppointmentsView`), só mostre o botão "Entrar" quando `type === "TELECONSULT" && status === "CONFIRMED"`, e adicione link "Ver todas" no header do card apontando para `/psychoanalyst/appointments`.
7. Compacte a grade de quick-links: reduza para 4 itens de maior valor (Analisandos, Agenda, Freud, Financeiro) em uma linha `sm:grid-cols-4` com cards menores — a sidebar já cobre o resto. Adicione Mensagens (`/psychoanalyst/messages`) à lista se preferir manter 4+.

### Tarefa 2 — Onboarding na home

Reutilize o hook `useRegistrationChecklist` (já usado em `psychoanalyst/settings/page.tsx`) para exibir, no topo da home, um card de checklist de cadastro quando houver itens incompletos (`professionalData`, `verificationDocuments`, `careSettings`), cada item linkando para a âncora correspondente em `/psychoanalyst/settings` via `registrationChecklistHash`. Como a home é server component, crie um componente client pequeno `src/components/psychoanalyst/PsychoanalystOnboardingCard.tsx` e monte-o na home. Esconda o card quando tudo estiver completo. Siga o visual de banners existentes (rounded-2xl, border, ícones lucide).

### Tarefa 3 — Analisandos: lista e criação (`analysands/page.tsx` + API)

1. **Busca client-side** por nome/e-mail (input com ícone Search acima da lista, filtro em memória — a API já retorna até 200).
2. **Form completo**: adicione campos opcionais `phone`, `sessionFrequency` (select: semanal, 2x/semana, 3x/semana, quinzenal, livre — valores string simples) e `notes` (textarea), que a API `POST /api/psychoanalyst/analysands` já aceita.
3. **Tratamento de erro**: no `handleCreate`, trate `!res.ok` exibindo mensagem de erro i18n no form (padrão do settings: parágrafo `text-red-600 bg-red-50`).
4. **Avatar seguro**: crie util local (ou inline) `initials(first, last)` que retorna fallback `"?"` para strings vazias e use na lista.
5. Mostre na linha da lista a data de início do processo (`processStartDate`, formatada com helper de timezone) quando existir.

### Tarefa 4 — Página do analisando (`analysands/[id]/page.tsx` + nova API)

1. Crie `GET /api/psychoanalyst/analysands/[id]/route.ts` seguindo o padrão de `requirePsychoanalyst` + verificação `record.psychoanalystId === psychoanalyst.id` (404 caso contrário), retornando `{ id, firstName, lastName, email, phone, sessionFrequency, processStartDate, hasAccount, notes (campo notes do record, descriptografado) }` com `safeDecrypt`.
2. Na página, busque esse endpoint junto com as notas; renderize um **header do analisando**: nome como título, e chips/linhas com e-mail, telefone, frequência de sessão e "em análise desde {data}". Se a API retornar 404, mostre estado de erro com link de volta para a lista.
3. **Confirmação antes de compartilhar nota**: substitua o share de um clique por um modal/confirm inline i18n ("Compartilhar esta nota de sessão com o analisando? Ele poderá ler o conteúdo integral.") antes do POST. Substitua as magic strings de `shareStatus` por união tipada `"loading" | "shared" | "invite" | "error"`.
4. **Erro de save visível**: trate `!res.ok` no `saveNote` com mensagem i18n.
5. **Datas**: troque `toLocaleString()` pelos helpers `formatShortDateWithYear` + `formatAppointmentTimeWithLabel` de `lib/timezone` com o locale do usuário (a página é client; obtenha timezone via prop de um server wrapper OU use o padrão já existente no portal — verifique como `appointments/page.tsx` injeta `providerTz` e replique com um server component wrapper que passa `timeZone` para o client component).
6. **Título da nota i18n**: em `api/psychoanalyst/session-notes/route.ts` (POST), gere o título com o idioma do usuário (`getUserLang`/`translate`) em vez de `"Sessão — "` + `pt-BR` fixo.

### Tarefa 5 — Agenda (`appointments/page.tsx` + `PsychoanalystAppointmentsView.tsx`)

1. Adicione **abas client-side**: "Próximas" (default: `scheduledAt >= agora`, ASC, exclui CANCELLED) e "Histórico" (passadas + canceladas, DESC). Adicione contador em cada aba.
2. Adicione **filtro por status** (select simples: todos, PENDING, CONFIRMED, COMPLETED, CANCELLED) e **busca por nome do paciente** dentro da aba ativa.
3. Diferencie a cor de `COMPLETED` (use `bg-emerald-100 text-emerald-700`) de `CONFIRMED` no `statusColors`.
4. Remova os campos `intakeHealthPlanLabel/intakeServiceName/intakeVisitReason` do tipo `PsychoanalystAppointmentRow`, do mapeamento server e do componente (sempre null hoje — código morto). Se preferir mantê-los por paridade futura, deixe, mas remova do server o preenchimento com null explícito; prefira remover.
5. **"Criar analisando" com contexto**: mude o link para `/psychoanalyst/analysands?prefillFirst={firstName}&prefillLast={lastName}&prefillUserId={patientUserId}`; na página de analisandos, leia esses `searchParams` e, se presentes, abra o form já preenchido. No POST da API, aceite `linkedUserId` opcional no schema e use-o (validando que o user existe) em vez de depender só do lookup por e-mail.
6. Corrija o subtítulo da página de agenda: crie chave própria `pa.appt.subtitle` em vez de reusar `pa.dash.subtitle`.
7. Avatar seguro (mesmo util da Tarefa 3.4) para as iniciais.

### Tarefa 6 — Rate limit no Freud IA (`api/psychoanalyst/freud-ask/route.ts`)

Adicione rate limiting por usuário seguindo o padrão de rate limit já existente no repositório (procure a implementação usada em `records/search` / `phi-platform-search` em `src/lib` e reutilize o mesmo mecanismo): algo como 20 perguntas por hora por usuário, retornando 429 com código `RATE_LIMITED`. No `FreudPageClient`, trate 429 exibindo mensagem i18n amigável (`pa.freud.err.rateLimited`).

### Tarefa 7 — Biblioteca: falhas silenciosas (`resources/page.tsx`)

1. `deleteResource`: só remova da lista se `res.ok`; caso contrário mostre erro. Substitua `confirm()` nativo por modal de confirmação simples consistente com o resto do app (se já existir componente de confirmação reutilizável no repo, use-o; senão um estado inline com dois botões).
2. No load inicial, em caso de erro de fetch mostre estado de erro com botão "Tentar novamente" em vez de `catch { /* ignore */ }` com lista vazia.

### Regras gerais

- **Toda string nova** vai para `src/lib/i18n/translations.ts` nas três línguas (pt, en, es), com prefixo `pa.`.
- Rode `npx tsc --noEmit` ao final e corrija erros de tipo.
- Não introduza dependências novas.
- Mantenha os componentes client pequenos; onde a página é server component, injete dados como props (padrão já usado em `appointments`).
- Ao final, liste os arquivos alterados e um resumo de 1 linha por tarefa para conferência.

### Critérios de aceite

1. Home sem código morto, com região real no banner humanitário, 3º card "Aguardando confirmação" clicável, botão Entrar só para CONFIRMED, link "Ver todas" e checklist de onboarding quando cadastro incompleto.
2. Lista de analisandos com busca, form com telefone/frequência/observações, erros visíveis e iniciais seguras.
3. Página do analisando exibe nome e dados do analisando, 404 tratado, share de nota com confirmação, datas no padrão do app.
4. Agenda com abas Próximas/Histórico, filtro de status, busca por nome e criação de analisando pré-preenchida a partir da consulta.
5. `freud-ask` retorna 429 após exceder o limite e a UI mostra mensagem amigável.
6. Delete de recurso não some da UI quando a API falha.
