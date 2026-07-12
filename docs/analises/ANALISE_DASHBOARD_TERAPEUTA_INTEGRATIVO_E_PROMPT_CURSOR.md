# Análise minuciosa — Dashboard do Terapeuta Integrativo (`/integrative-therapist`) + Prompt para o Cursor

**Data:** 12/07/2026 · **Modo:** somente leitura
**Escopo:** home, agenda, clientes, ficha do cliente, modo consulta, financeiro, relatório de produção, configurações, navegação e as 25 rotas de API `api/integrative-therapist/*`.

---

## Parte 1 — Mapa de funções (o que o portal tem hoje)

| Área | Arquivo | Estado |
|---|---|---|
| Home | `src/app/(dashboard)/integrative-therapist/page.tsx` (296 l) | Saudação, banner humanitário, opt-in Acura, alerta de práticas não configuradas, card "modo consulta", 3 stats (hoje / clientes / práticas), grid de atalhos, próximas 5 consultas |
| Agenda | `appointments/page.tsx` + `IntegrativeAppointmentsView.tsx` (344 l) | Lista + visão semanal, filtro por prática, cancelamento via `ProCancelAppointmentButton` |
| Clientes | `clients/page.tsx` (219 l) | Lista + formulário de criação inline |
| Ficha do cliente | `clients/[id]/page.tsx` (423 l) | Abas resumo/sessões, edição parcial, notas de sessão (livre e estruturada), compartilhar nota |
| Modo consulta | `consult/[appointmentId]/page.tsx` + `IntegrativeConsultPanel.tsx` (514 l) | Timer 60/30 min, timer de retenção de agulhas (acupuntura), roteiro por etapas, formulário estruturado, biblioteca de referência, handout de orientações, assistente de notas IA |
| Financeiro | `financeiro/page.tsx` | Reusa `FinanceiroDashboard` do professional + `IntegrativeProductionReport` (CSV export) |
| Configurações | `settings/page.tsx` (558 l) | Perfil, práticas PICS, clínica, região da conta |
| Reusos | prescriptions → professional; messages → patient; chás → professional; meeting-rooms → lib compartilhada; medicina-natural → hub compartilhado | OK por design |

Pontos fortes verificados: PHI criptografada com `safeDecrypt` consistente, `requireIntegrativeTherapist` em todas as rotas de API, timezone do provider via `providerDayBounds`, templates estruturados por prática, fluxo de convite/vínculo de conta do cliente.

---

## Parte 2 — Problemas abertos (verificados no código)

### A. Home — `page.tsx`

1. **Banner humanitário com região quebrada** — linha 67: `getActiveCampaignForRegion(null)` passa `null` fixo. Mesmo bug já apontado (e corrigido?) no portal médico; aqui segue aberto. A campanha regional nunca é direcionada.
2. **Consulta PENDING sem nenhuma ação** — linhas 270-286: botão só renderiza se `status === "CONFIRMED"`. Consulta `PENDING` aparece na lista e conta no stat "hoje", mas o terapeuta não tem CTA nem endpoint para confirmá-la. **Não existe rota de confirmação pelo provider no portal inteiro** (`/api/appointments/[id]/cancel` suporta `integrativeTherapist`; confirmação, não).
3. **Grid de atalhos incompleto** — linhas 188-197: omite Mensagens, Prescrições, Chás Medicinais e Salas de Reunião, que existem no menu lateral (`INTEGRATIVE_THERAPIST_NAV_GROUPS`). Inconsistência home × sidebar.
4. **Perf** — `audit.viewRecord` é `await` serial antes do `Promise.all`; página inteira bloqueia sem Suspense/streaming.

### B. Agenda — `appointments/page.tsx` + `IntegrativeAppointmentsView.tsx`

5. **Sem busca nem filtro de status** — janela fixa −60/+90 dias carregando **todas** as consultas sem paginação; único filtro é por prática. Sem busca por nome do paciente, sem filtro pendente/confirmada/cancelada.
6. **Ciclo de vida incompleto** — só existe "cancelar". Não há confirmar `PENDING`, marcar `COMPLETED` nem registrar falta (no-show). Consultas nunca são concluídas por este portal.
7. **`safeDecrypt` duplicado** — linhas 11-18 do page.tsx redefinem localmente o que já existe em `@/lib/integrative-therapist-api`.
8. **Subtítulo errado** — linha 89 reusa `it.dash.subtitle` (subtítulo da home) como subtítulo da agenda.

### C. Clientes — `clients/page.tsx` + API `clients/route.ts`

9. **Sem busca** — lista sem campo de busca/filtro; API retorna `take: 200` sem parâmetro de busca nem paginação. Com base grande, clientes somem silenciosamente.
10. **Erros silenciosos** — `load()` não checa `res.ok` (erro → lista vazia sem aviso); `handleCreate` com resposta 400 (ex.: email inválido) simplesmente não fecha o form, sem nenhuma mensagem. **Zero ocorrências de toast em todo o portal.**
11. **Avatar quebra com nome vazio** — `{c.firstName[0]}{c.lastName[0]}` (linhas 195-196) lança/renderiza vazio se decrypt falhar ou campo vier vazio.

### D. Ficha do cliente — `clients/[id]/page.tsx`

12. **Dados básicos não editáveis** — o form de resumo edita telefone/prática/queixa/objetivos/notas, mas **nome, sobrenome e email não podem ser corrigidos** após a criação. Também não há excluir/arquivar cliente.
13. **Compartilhar nota sem feedback** — `shareNote` (linhas 131-148): fluxo POST→PUT (convite por email) termina sem informar o usuário do que aconteceu (compartilhou? convidou? falhou?).
14. **Data sem locale** — linha 384: `new Date(n.createdAt).toLocaleString()` sem locale, inconsistente com o resto do app que usa `localeOf(lang)`.
15. **Loads sem tratamento de erro** — `loadClient`/`loadNotes` ignoram falhas; cliente inexistente/ID inválido rende tela em branco em vez de 404 amigável.

### E. Modo consulta — `consult/[appointmentId]/page.tsx` + `IntegrativeConsultPanel.tsx`

16. **Mojibake no separador** — `consult/[appointmentId]/page.tsx` linha 119: `{" ? "}` — resto de encoding corrompido (deveria ser `" · "`).
17. **Timer sem controle** — inicia sozinho no mount (antes de o paciente chegar), não tem pausar/reiniciar, e todo o estado (timer, nota digitada, etapa do roteiro) se perde num refresh acidental.
18. **"Finalizar" não finaliza** — o botão só navega para a agenda. A consulta nunca vira `COMPLETED`, nada é registrado. Combina com o problema B6.
19. **Sem guarda de saída** — nenhuma confirmação (`beforeunload`/route guard) ao sair com nota não salva.

### F. Configurações — `settings/page.tsx`

20. **Monolito de 558 linhas com 25 `useState`** num único componente (perfil + práticas + clínica + região + avatar). Mesmo padrão-problema do `prescriptions` do médico, em menor escala.

### G. Menor prioridade

21. `IntegrativeProductionReport`: export CSV via `window.open` (bloqueável por popup blocker) — trocar por link `<a download>` ou fetch+blob.
22. `financeiro/page.tsx` importa `FinanceiroDashboard` de dentro de `professional/financeiro/page` (import de page em page) — extrair para `src/components/financeiro/`.

---

## Parte 3 — PROMPT PARA O CURSOR

Copie tudo abaixo da linha e cole no Cursor:

---

Você vai melhorar o portal do Terapeuta Integrativo (`/integrative-therapist`) do projeto doctor8 (Next.js App Router + Prisma + Tailwind). Trabalhe em ordem, faça commits pequenos por etapa, rode `npx tsc --noEmit` e `npm run lint` ao final de cada etapa. Não altere o schema Prisma exceto onde indicado. Todo texto visível ao usuário deve usar i18n (`translate`/`useI18n`) com chaves novas em pt/en/es — nunca strings hardcoded. Siga o padrão visual existente do portal (teal, `rounded-2xl`, `border-slate-100`).

### Etapa 1 — Correções pontuais (rápidas)

1.1. Em `src/app/(dashboard)/integrative-therapist/page.tsx` (linha ~67): `getActiveCampaignForRegion(null)` recebe `null` fixo. Busque `region` do usuário (adicione `region` ao select do `db.user.findUnique` já existente na página) e passe para a função.

1.2. Em `src/app/(dashboard)/integrative-therapist/consult/[appointmentId]/page.tsx` (linha ~119): o separador `{" ? "}` é encoding corrompido. Troque por `{" · "}`.

1.3. Em `src/app/(dashboard)/integrative-therapist/appointments/page.tsx`: remova a função local `safeDecrypt` (linhas 11-18) e importe de `@/lib/integrative-therapist-api`. Troque o subtítulo `t("it.dash.subtitle")` (linha ~89) por uma chave nova `it.appt.subtitle` ("Suas consultas agendadas e histórico recente" / equivalentes en/es).

1.4. Em `src/app/(dashboard)/integrative-therapist/clients/[id]/page.tsx` (linha ~384): `toLocaleString()` sem locale — use o locale derivado de `lang` (`lang.startsWith("pt") ? "pt-BR" : lang.startsWith("es") ? "es-ES" : "en-US"`), como já é feito em `consult/[appointmentId]/page.tsx`.

1.5. Avatar com iniciais: em `clients/page.tsx` (linhas ~195-196) e em qualquer outro lugar do portal que use `firstName[0]`, crie/use um helper `initials(first, last)` que tolera strings vazias/undefined e retorna fallback (ex.: "?"). Coloque o helper em `src/lib/format-name.ts` se não existir algo equivalente.

1.6. Em `src/components/integrative-therapist/IntegrativeProductionReport.tsx`: troque `window.open(url, "_blank")` do export CSV por um `<a href={url} download>` ou fetch+blob, para não ser bloqueado por popup blocker.

### Etapa 2 — Feedback de erro em todo o portal (toasts)

O portal tem ZERO tratamento visível de erro (0 ocorrências de toast). Usando o mecanismo de toast/feedback já existente no projeto (verifique como o portal do médico/psicanalista exibe erros; se houver `sonner` ou componente próprio, reuse — não adicione dependência nova):

2.1. `clients/page.tsx`: `load()` deve checar `res.ok` e exibir erro; `handleCreate` deve exibir a mensagem de erro da API quando `!res.ok` (ex.: email inválido, prática inválida) em vez de falhar silenciosamente.

2.2. `clients/[id]/page.tsx`: `loadClient`/`loadNotes` com erro devem exibir estado de erro; se o cliente não existir (404), renderize um estado vazio amigável com link de volta para a lista. `saveSummary` e `saveNote` devem mostrar erro quando `!res.ok`.

2.3. `clients/[id]/page.tsx` — `shareNote`: dê feedback do resultado: nota compartilhada ("Compartilhada com o cliente"), convite enviado ("Cliente ainda não tem conta — convite enviado para {email}"), sem email ("Adicione um email ao cliente para compartilhar"), ou erro. Crie as chaves i18n correspondentes.

2.4. `IntegrativeConsultPanel.tsx` — `saveNote` e `loadContext`: exibir erro em falha (hoje só o caminho feliz existe).

### Etapa 3 — Ciclo de vida da consulta (confirmar / concluir)

Hoje o terapeuta não consegue confirmar uma consulta `PENDING` nem marcar como `COMPLETED` — só cancelar.

3.1. **API**: crie `src/app/api/integrative-therapist/appointments/[id]/status/route.ts` com `PATCH` que aceita `{ action: "confirm" | "complete" | "no_show" }`. Use `requireIntegrativeTherapist` e valide que `appointment.integrativeTherapistId === therapist.id` (nunca confie no id do body). Transições válidas: `PENDING → CONFIRMED` (confirm); `CONFIRMED → COMPLETED` (complete); `CONFIRMED → NO_SHOW` se esse status existir no enum do Prisma — verifique o enum `AppointmentStatus` no schema e use apenas valores existentes; se não houver `NO_SHOW`, omita essa ação. Registre auditoria seguindo o padrão de `audit.*` usado no projeto e notifique o paciente na confirmação seguindo o padrão de notificação existente (verifique `src/lib/pro-appointment-notify.ts` e reuse/estenda).

3.2. **Agenda** (`IntegrativeAppointmentsView.tsx`): para consultas `PENDING`, adicione botão "Confirmar"; para `CONFIRMED` já passadas, botão "Marcar como realizada". Atualize o estado local após sucesso e exiba toast.

3.3. **Home** (`page.tsx`): consultas `PENDING` na lista "próximas" devem exibir o botão de confirmar (hoje `PENDING` não tem nenhuma ação — só `CONFIRMED` tem botão).

3.4. **Modo consulta** (`consult/[appointmentId]/page.tsx`): o botão "finalizar" deve chamar a nova API com `action: "complete"` (quando a consulta estiver `CONFIRMED`) antes de navegar de volta, com toast de confirmação.

### Etapa 4 — Busca e filtros

4.1. **Clientes** — API `src/app/api/integrative-therapist/clients/route.ts`: os nomes são criptografados no banco, então a busca por nome deve ser feita após decrypt em memória (o volume é limitado por terapeuta). Aceite `?q=` e filtre por nome/email após o decrypt, mantendo `take` razoável. Na UI (`clients/page.tsx`), adicione campo de busca com debounce (~300ms) e filtro por prática principal (select com as práticas do terapeuta).

4.2. **Agenda** (`IntegrativeAppointmentsView.tsx`): adicione (a) filtro por status (todas/pendentes/confirmadas/realizadas/canceladas) e (b) busca por nome do paciente — ambos client-side, já que os dados vêm do server component. Mantenha o filtro por prática existente.

### Etapa 5 — Ficha do cliente: edição completa

5.1. API `src/app/api/integrative-therapist/clients/[id]/route.ts`: verifique quais campos o `PATCH` aceita hoje e estenda para permitir editar `firstName`, `lastName` e `email` (criptografando com `encrypt` como no POST de criação; ao mudar email, refaça a lógica de `linkedUserId` do POST — se o cliente já estiver vinculado a uma conta, NÃO permita trocar o email, retorne 409 com mensagem clara).

5.2. UI `clients/[id]/page.tsx`: na aba resumo, adicione os campos nome/sobrenome/email ao formulário. Se `hasAccount`, desabilite o campo email com hint explicando o vínculo.

5.3. Adicione "Arquivar cliente": campo `archivedAt DateTime?` no model `IntegrativeClientRecord` (migração Prisma — este é o único momento em que pode tocar o schema), `DELETE` soft na API (seta `archivedAt`), botão discreto na ficha com modal de confirmação, e filtro `archivedAt: null` no GET da lista (com toggle "mostrar arquivados" na UI).

### Etapa 6 — Modo consulta: robustez

6.1. **Timer controlável** (`IntegrativeConsultPanel.tsx`): não inicie o timer automaticamente no mount. Adicione botão iniciar/pausar. Persista `{ startedAt, pausedTotal, visitType, practiceSlug, consultStep }` em `sessionStorage` com chave por `appointmentId`/`clientId` para sobreviver a refresh — **nunca persista o conteúdo da nota (PHI) em storage do navegador**; apenas os metadados do timer/etapa.

6.2. **Guarda de saída**: no `consult/[appointmentId]/page.tsx` e no painel, registre `beforeunload` quando houver nota não salva (`noteText` não vazio ou `structuredValuesHaveContent(structuredValues)`), removendo o listener após salvar.

### Etapa 7 — Home: atalhos e semântica

7.1. Complete o grid de atalhos da home (`page.tsx` linhas ~188-197) para espelhar o menu lateral (`INTEGRATIVE_THERAPIST_NAV_GROUPS` em `src/lib/platform-nav-registry.ts`): adicione Mensagens, Prescrições, Chás Medicinais e Salas de Reunião (mantendo Medicina Natural condicional como está).

7.2. Mova o `await audit.viewRecord(...)` para dentro do `Promise.all` (ou dispare sem await com `.catch` logado), eliminando a serialização.

### Regras gerais

- Não quebre os reusos existentes (prescriptions/messages/chás/meeting-rooms reexportam páginas de outros portais — não os fork).
- Toda rota nova de API deve usar `requireIntegrativeTherapist` e validar ownership pelo `therapist.id` da sessão.
- PHI: qualquer campo novo de texto livre sobre o cliente deve ser criptografado com `encrypt`/`safeDecrypt`, seguindo o padrão de `clients/route.ts`.
- Ao final de tudo: `npx tsc --noEmit`, `npm run lint`, `npm run check:i18n`, e um smoke test manual do fluxo: criar cliente → buscar → editar nome → iniciar consulta → salvar nota → confirmar consulta pendente → marcar como realizada → arquivar cliente.

---

*Fim do prompt.*
