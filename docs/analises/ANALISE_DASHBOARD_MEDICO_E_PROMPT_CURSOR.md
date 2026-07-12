# Análise minuciosa — Dashboard do Médico (`/professional`) + Prompt para o Cursor

**Data:** 11/07/2026 · **Modo:** somente leitura
**Escopo:** home do dashboard, agenda, plantão JIT, prescrições, pacientes, financeiro, navegação e onboarding do portal `/professional/*`.
**Contexto:** verificação item a item contra `AUDITORIA_PAINEL_PROFISSIONAL.md` (02/07). Muitos itens críticos daquela auditoria **já foram corrigidos** — a lista abaixo contém apenas o que está **aberto hoje**, verificado no código atual.

---

## Parte 1 — O que já foi corrigido (NÃO refazer)

| Item da auditoria anterior | Status atual verificado |
|---|---|
| Importação de ficha sem vínculo (IDOR) | ✅ Corrigido — `records/import` agora usa `canProfessionalReadPatientAccount` + retorna `LINK_REQUIRED` 403 |
| Busca de pacientes da plataforma inteira | ✅ Mitigado — `records/search` com rate-limit (`phi-platform-search`), matches mínimos e auditoria |
| Heartbeat JIT parava na sala de vídeo | ✅ Corrigido — `JitSessionHeartbeat` montado no layout do dashboard **e** em `video/jit/[queueId]/page.tsx`; cron `jit-cleanup` existe |
| Fallback silencioso do PDF assinado (Lacuna) | ✅ Corrigido — falha do S3 agora retorna 503 `SIGNED_PDF_UNAVAILABLE` |
| Botão voltar do vídeo mandava médico para `/urgent` | ✅ Corrigido — `safe-nav.ts` com `setVideoNavContext` role-aware |
| `409 ALREADY_CALLING` exibia código cru | ✅ Corrigido — códigos mapeados para chaves i18n (`jit.alreadyCalling` etc.) |
| Timezone do provider no dashboard | ✅ Corrigido — `providerDayBounds` + `formatShortDate/formatAppointmentTimeWithLabel` com `professional.timezone` |
| Menu sem agrupamento | ✅ Corrigido — `PROFESSIONAL_NAV_GROUPS` com 5 grupos; `settings/clinic` e `templates` agora no menu |
| Draft de PHI em localStorage no prontuário | ✅ Não encontrado mais em `RecordDetailClient.tsx` |

---

## Parte 2 — Problemas abertos hoje (verificados no código)

### A. Home do dashboard — `src/app/(dashboard)/professional/page.tsx`

1. **Banner humanitário com região quebrada** — linha ~138: `getActiveCampaignForRegion(null)` passa `null` fixo, mesmo com `userRow.region` sendo buscado no mesmo `Promise.all`. O direcionamento regional de campanha nunca funciona.
2. **Saudação hardcoded "Dr."** — linha ~239: `Dr. {firstName}` ignora gênero (Dra.) e profissionais não-médicos que usam este portal; título fixo em vez de i18n.
3. **Avatar quebra com nome vazio** — `{firstName[0]}{lastName[0]}` renderiza `undefined`/vazio se o decrypt falhar ou o campo for vazio. Mesmo padrão repetido em `ProfessionalAppointmentsView.tsx` (~linha 287).
4. **Onboarding construído e nunca conectado** — `ProfessionalTourWrapper.tsx` e `ProfessionalChecklistWrapper.tsx` existem na pasta mas **nenhum arquivo os importa**. O paciente tem tour; o médico não.
5. **Pendências acionáveis invisíveis** — consultas `PENDING` (aguardando confirmação do médico) entram no contador "próximas" mas não há CTA para confirmar/recusar; documentos aguardando assinatura Lacuna não aparecem em lugar nenhum da home.
6. **Performance** — `audit.viewRecord` é `await` serial antes do `Promise.all` de 12 queries; `buildProviderFinanceiroReport` (relatório financeiro completo do mês) roda em todo load da home. Sem streaming/Suspense.
7. **Semântica do stat "hoje"** — conta `CONFIRMED + COMPLETED` de hoje inteiro (inclui consultas futuras de hoje) sob um rótulo que sugere "realizadas hoje".

### B. Agenda — `appointments/page.tsx` + `ProfessionalAppointmentsView.tsx` (716 linhas)

8. **Escritas no GET render** — loop `for` com `ensurePatientRecord` sequencial (um await por paciente sem ficha) durante a renderização da página; em clínica movimentada isso é N escritas por pageview.
9. **Query pesada de documentos** — `medicalDocument.findMany` busca **todos** os documentos de **todas** as fichas só para pegar o mais recente de cada uma (sem `distinct`/`take`).
10. **Sem filtro nem busca** — janela fixa −60/+90 dias sem paginação, sem filtro por status (pendente/confirmada/cancelada) e sem busca por nome de paciente na lista.
11. **Falha silenciosa** — `assignChair`: `if (!res.ok) return;` — zero toasts no componente inteiro (0 ocorrências de `toast.`).

### C. Plantão JIT — `jit/page.tsx`

12. **`EXPIRE_NOSHOWS` ainda depende do polling do cliente** — o `setInterval` dispara `PATCH /api/jit/queue` a cada ciclo; o cron `jit-cleanup` existe, então a chamada do cliente é redundante (ou o cron não cobre — precisa unificar server-side).
13. **Timezone via fetch extra** — `/api/user/timezone` buscado no cliente em vez de vir como prop do servidor (a página é client-only; converter para server wrapper + client child).
14. **Erro cru no save de config** — linha ~158/179: `setError(data.error || ...)` exibe o código da API (`data.error`) em vez de `data.message`/i18n.

### D. Prescrições — `prescriptions/page.tsx`

15. **Monolito de 2.264 linhas com ~55 `useState`** em um único componente (hub + lista + formulário + busca de fármacos + assinatura + pós-save wizard). Alto risco de regressão a cada mudança; re-render de tudo a cada tecla digitada.

---

## Parte 3 — PROMPT PARA O CURSOR

Copie tudo abaixo da linha e cole no Cursor:

---

Você vai melhorar o **dashboard do médico** (portal `/professional/*`) do Doctor8 (Next.js App Router + Prisma + Tailwind). Trabalhe em fases, na ordem. Após cada fase rode `npx tsc --noEmit` e corrija erros antes de seguir. Não altere schema do Prisma. Não toque nos portais de outras especialidades exceto onde indicado. Todos os textos novos devem usar o sistema i18n existente (`src/lib/i18n/translations`) com chaves em pt/en/es — nunca strings hardcoded.

**Contexto do que NÃO deve ser refeito (já está correto):** guard de importação de ficha (`canProfessionalReadPatientAccount`), rate-limit da busca de plataforma, heartbeat JIT na sala de vídeo, retorno 503 do PDF assinado, navegação agrupada (`PROFESSIONAL_NAV_GROUPS`), formatação timezone-aware com `providerDayBounds`. Não mexa nesses pontos.

### FASE 1 — Correções pontuais na home (`src/app/(dashboard)/professional/page.tsx`)

1.1. **Região da campanha humanitária:** hoje a página chama `getActiveCampaignForRegion(null)`. Reordene para buscar `userRow` (que já seleciona `region`) antes e passar `userRow?.region ?? session.user.region ?? null`. Se isso exigir tirar `userRow` do `Promise.all`, busque-o junto com o `professionalProfile` no início.

1.2. **Saudação:** substitua o hardcoded `Dr. {firstName}` por uma saudação neutra usando i18n: crie chave `prodash.greetingName` = `"{{greeting}}, {{name}}"` e use o nome completo sem título, OU derive o título de `getProfessionLabel`. Não presuma gênero.

1.3. **Avatar seguro:** crie um helper compartilhado `initialsOf(first: string, last: string): string` em `src/lib/format-name.ts` que retorna as iniciais em maiúsculas com fallback `"?"` quando vazio. Use na home (linha do avatar `{firstName[0]}{lastName[0]}`) e em `src/components/professional/ProfessionalAppointmentsView.tsx` (mesmo padrão, ~linha 287).

1.4. **Stat "hoje":** divida a semântica — o card deve mostrar consultas **realizadas hoje** (`COMPLETED` com `scheduledAt` entre `todayStart/todayEnd`) e, como subtexto pequeno, "X restantes hoje" (`CONFIRMED` de hoje ainda futuras). Ajuste as chaves i18n.

1.5. **Perf:** mova `audit.viewRecord` para dentro do `Promise.all` (não precisa ser serial). Não otimize `buildProviderFinanceiroReport` nesta fase.

### FASE 2 — Pendências acionáveis na home

2.1. Adicione ao `Promise.all` da home dois novos contadores:
   - `pendingApprovalCount`: `db.appointment.count({ where: { professionalId, status: "PENDING", scheduledAt: { gte: new Date() } } })`
   - `awaitingSignatureCount`: prescrições/documentos do profissional com `signatureStatus` em estado pendente (verifique os valores reais do enum no schema — procure por `signatureStatus` em `prisma/schema.prisma`; use os estados que representam "criado mas não assinado", excluindo `SIGNED`). Conte apenas dos últimos 30 dias.

2.2. Na seção "Atenção" (`AttentionRow`), adicione duas linhas novas ANTES das existentes:
   - Consultas aguardando sua confirmação → `count: pendingApprovalCount`, href `/professional/appointments`, ícone `Calendar`, cor âmbar quando > 0.
   - Documentos aguardando assinatura → `count: awaitingSignatureCount`, href `/professional/prescriptions`, ícone `FileSignature` (lucide), cor âmbar quando > 0.
   Crie as chaves i18n pt/en/es.

### FASE 3 — Conectar onboarding do profissional

3.1. Os componentes `src/app/(dashboard)/professional/ProfessionalTourWrapper.tsx` e `ProfessionalChecklistWrapper.tsx` existem mas não são importados por ninguém. Leia os dois arquivos e o exemplo funcionando do paciente (procure onde `PatientTourWrapper` é montado) e monte os wrappers do profissional na home `/professional` seguindo exatamente o mesmo padrão de montagem/condições do paciente (primeiro acesso, dismiss persistido etc.). Se os wrappers dependerem de props/endpoints inexistentes, implemente o mínimo seguindo o espelho do paciente.

### FASE 4 — Agenda: performance e UX (`appointments/page.tsx` + `ProfessionalAppointmentsView.tsx`)

4.1. **Eliminar escritas no render:** remova o loop `for...ensurePatientRecord` do GET render. Em vez disso, garanta a ficha on-demand: no clique de "abrir ficha" quando `chartId` é null, chame um endpoint POST (crie `src/app/api/professional/records/ensure/route.ts` que valida sessão PROFESSIONAL, recebe `patientUserId`, chama `ensurePatientRecord` e retorna `{ chartId }`) e navegue em seguida. Na listagem, uma consulta sem ficha mostra o botão normalmente.

4.2. **Query de documentos:** substitua o `medicalDocument.findMany` que carrega todos os documentos por uma consulta que retorna só o mais recente por ficha — use `db.medicalDocument.findMany({ where: { patientRecordId: { in: chartIds } }, orderBy: { createdAt: "desc" }, distinct: ["patientRecordId"], select: { id: true, patientRecordId: true } })`.

4.3. **Filtro e busca na lista:** em `ProfessionalAppointmentsView.tsx`, adicione na visão lista: (a) chips de filtro por status — Todas / Pendentes / Confirmadas / Realizadas / Canceladas; (b) campo de busca por nome do paciente (filtro client-side sobre `initialAppointments`). Chips e placeholder via i18n.

4.4. **Feedback:** importe `useToast` no componente e adicione toast de erro em `assignChair` (e em qualquer outro fetch de mutação do arquivo que falhe silenciosamente — revise todos os `fetch` de método não-GET do componente).

### FASE 5 — JIT: robustez (`src/app/(dashboard)/professional/jit/page.tsx`)

5.1. **Erro de config:** nas linhas que fazem `setError(data.error || ...)`, troque para `setError(data.message || t("jit.errGeneric"))` — nunca exibir código de erro cru.

5.2. **EXPIRE_NOSHOWS:** verifique `src/app/api/cron/jit-cleanup/route.ts`. Se o cron já expira no-shows (`CALLED` além do `expiresAt`), remova a chamada `PATCH EXPIRE_NOSHOWS` do polling do cliente. Se o cron NÃO cobre, adicione a expiração lá e então remova do cliente. O polling do cliente deve apenas ler estado.

5.3. **Timezone por prop:** converta a página em um server component fino (`page.tsx` busca sessão + `professional.timezone` e renderiza `<JitClient providerTz={...} />`) movendo todo o código atual para `JitClient.tsx` (`"use client"`). Remova o fetch de `/api/user/timezone`.

### FASE 6 — Prescrições: decomposição (maior esforço; fazer por último)

Refatore `src/app/(dashboard)/professional/prescriptions/page.tsx` (2.264 linhas, ~55 useState) SEM mudar comportamento nem visual. Estratégia:

6.1. Crie a pasta `src/app/(dashboard)/professional/prescriptions/components/` e extraia, nesta ordem, um por commit:
   - `PrescriptionCard.tsx` e `ClinicalDocCard.tsx` (já são funções isoladas no arquivo — mova com seus helpers `controlInfo`, `emissionKindFromDoc` etc. para um `shared.ts`).
   - `PatientPicker.tsx` — todo o estado de busca/seleção/importação de paciente (`charts`, `importablePatients`, `platformMatches`, `patientQuery`, `patientPickerOpen`...).
   - `MedicationSearch.tsx` — busca de fármacos/medicina natural (`drugQuery`, `drugResults`, `mnSearchResults`, modais).
   - `PostSaveFlow.tsx` — o wizard pós-salvar (`savedEmission`, `postSaveStep`, `postSaveShareUrl`, assinatura).
   - `PrescriptionForm.tsx` — o formulário em si (`medications`, `instructions`, `validDays`, validação).
6.2. O `page.tsx` final deve orquestrar view (`hub | list | form`) e reter só o estado de coordenação. Alvo: menos de 400 linhas.
6.3. Regra dura: nenhum comportamento novo, nenhuma mudança de layout, nenhuma chave i18n alterada. Rode `npx tsc --noEmit` e o lint após cada extração.

### Critérios de aceite globais

- `npx tsc --noEmit` e `npm run lint` limpos.
- `npm run check:i18n` passa (todas as chaves novas em pt, en, es).
- Nenhuma rota de API teve autorização enfraquecida; novos endpoints validam `session.user.role === "PROFESSIONAL"` e ownership.
- Nenhuma escrita de banco acontece durante render de server component.
- Home do médico continua renderizando corretamente para profissional sem nenhuma consulta/ficha (estado vazio).

---

*Fim do prompt para o Cursor.*
