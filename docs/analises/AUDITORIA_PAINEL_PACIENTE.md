# AUDITORIA COMPLETA ? PAINEL DO PACIENTE (Doctor8)

**Data:** 02/07/2026 ? **Modo:** somente leitura (nenhum arquivo do produto foi alterado)
**Escopo:** todas as rotas `/patient/*`, `/urgent`, `/video/*`, fluxo humanit?rio do paciente (`/humanitarian/*`), componentes e APIs consumidas pelo lado paciente, schema Prisma, i18n, timezone, mobile, seguran?a e performance.

---

## 1. SUM?RIO EXECUTIVO

### Os 10 problemas mais graves (em ordem de prioridade)

| # | Problema | Severidade | Onde |
|---|----------|-----------|------|
| 1 | **Timezone quebrado na raiz**: slots de agendamento s?o gerados no fuso do servidor Node (`setHours` local), n?o no fuso do profissional; `User` n?o tem campo `timezone`; e-mails/WhatsApp de lembrete formatam hora no fuso do **servidor**. Paciente em Miami ou Lisboa pode ver/receber hor?rio errado em toda a jornada. | CR?TICA | `src/lib/scheduling.ts:92-101`, `src/lib/email.ts:161-166,231`, `src/lib/whatsapp-i18n.ts:16-20`, `prisma/schema.prisma` (User) |
| 2 | **Paciente pode ser cobrado sem ser atendido, sem reembolso autom?tico** ? em dois fluxos: (a) JIT: cobran?a via `confirmCardPayment` acontece **antes** do `POST /api/jit/queue`; se a fila encher/sess?o cair/erro de rede, o dinheiro fica retido; cancelamento e NO_SHOW n?o disparam `stripe.refunds.create`. (b) Agendamento: se o pagamento sucede mas `fulfillConsultationPayment` falha por slot tomado, o webhook s? faz `console.error`. | CR?TICA | `src/app/urgent/page.tsx:234-242`, `src/app/api/jit/queue/cancel/route.ts:31-34`, `src/app/api/payments/webhook/route.ts:135-146` |
| 3 | **Registro financeiro JIT inexistente/FK inconsistente**: `jitQueue.paymentId` recebe o ID do Stripe (`pi_...`), mas o schema define FK para `JitPayment.id` ? e `JitPayment` **nunca ? criado** em nenhum lugar do c?digo. Receita JIT n?o aparece no financeiro; risco de falha de FK. | CR?TICA | `src/app/api/jit/queue/route.ts:236` vs `prisma/schema.prisma:2321-2322` |
| 4 | **`/urgent` n?o restaura fila ativa ao reabrir**: no mount s? verifica auth e lista m?dicos; se o paciente fecha o app/aba enquanto espera, perde a tela de espera/chamada e o polling ? a notifica??o "sua vez" nem tem deep link (default cai em `/patient`). Janela de no-show ? de 120s. | CR?TICA | `src/app/urgent/page.tsx:123-144`, `src/app/api/jit/queue/route.ts:397-410` |
| 5 | **Fluxo humanit?rio n?o trava em espanhol**: `getHumanitarianLang()` detecta PT do browser, o switcher persiste PT/EN, o login inicia em `"en"`, o TCLE integral abre em **portugu?s** (`LegalLayout.tsx:30`) e dezenas de erros de API chegam crus em ingl?s ("Not your turn yet", "Complete initial triage..."). P?blico venezuelano vulner?vel v? a jornada em idioma errado. | CR?TICA | `src/components/humanitarian/HumanitarianLangSwitcher.tsx:15-18`, `src/components/LegalLayout.tsx:30`, `src/app/humanitarian/[slug]/page.tsx:252,289` |
| 6 | **PDF de exames retorna 403 para o pr?prio paciente**: a listagem usa `patientRecord.linkedUserId`, mas o download exige `document.patientId === viewerPatient.id` ? campo que o fluxo do profissional n?o preenche. O paciente v? o exame e n?o consegue baixar. | CR?TICA | `src/app/api/professional/documents/[id]/pdf/route.ts:80-94` vs `src/app/api/patient/exam-requests/route.ts:40-46` |
| 7 | **Cancelamento de consulta mostra "sucesso" mesmo quando a API falha**: `handleCancel` nunca verifica `res.ok` nem tem try/catch ? erro 403/500 exibe a tela "Cancelamento conclu?do" com `refunded: undefined`; falha de rede trava o bot?o em loading para sempre. Paciente acredita que cancelou e leva no-show. | CR?TICA | `src/app/(dashboard)/patient/appointments/page.tsx:609-621` |
| 8 | **App Android/Capacitor n?o existe no reposit?rio**: zero `@capacitor/*` no `package.json`, sem `capacitor.config.ts`, sem pasta `android/`. Permiss?es de c?mera/microfone, bot?o voltar, teclado e deep links n?o est?o tratados em lugar nenhum ? a videochamada Daily.co em WebView Android vai falhar sem UX de recupera??o. | CR?TICA | `package.json` (aus?ncia), reposit?rio inteiro |
| 9 | **PHI sem criptografia no compartilhamento de hist?rico**: `/api/patient/share` grava `MedicalDocument.content` com o JSON cl?nico **em texto claro** e cria `Message` sem `encrypt()` (o resto do sistema criptografa mensagens); al?m disso permite compartilhar com **qualquer** profissional da plataforma, sem v?nculo cl?nico. | CR?TICA | `src/app/api/patient/share/route.ts:69-77,97-110` |
| 10 | **Chat quebrado quando o m?dico inicia a conversa**: o polling s? roda se `lastMessageTime.current` existir ? em conversa vazia o paciente nunca recebe a primeira mensagem do m?dico at? recarregar a p?gina. `fetchMessages` tamb?m n?o checa `res.ok`. | ALTA | `src/app/(dashboard)/patient/messages/page.tsx:134-157` |

### As 5 melhorias de maior impacto

1. **Campo `timezone` no `User` + gera??o/exibi??o de slots timezone-aware** ? corrige a falha n? 1 de ponta a ponta (UI, e-mail, WhatsApp, .ics). Sem isso, expans?o EUA/Europa ? invi?vel.
2. **Reembolso autom?tico + reconcilia??o JIT** (webhook tratando `metadata.type === "JIT"`, refund em cancel/no-show/sess?o offline, cria??o de `JitPayment`) ? elimina o pior risco financeiro/legal.
3. **Restaura??o de estado + deep links**: `/urgent` consulta fila ativa no mount; notifica??es "sua vez" e lembretes com `url` correto ? recupera pacientes que fecham o app (comportamento padr?o em mobile).
4. **Lock de espanhol no fluxo humanit?rio + mapa de erros de API ? chaves i18n** ? jornada 100% ES, incluindo TCLE integral e mensagens de erro.
5. **Convite de avalia??o p?s-consulta in-app** (bot?o "Avaliar" nas consultas passadas + prompt ao voltar do v?deo) ? a infra `ProfessionalReview`/QStash j? existe, mas o convite depende quase s? de e-mail.

---

## 2. INVENT?RIO DE ROTAS/TELAS DO PACIENTE

| Rota | Status | Observa??o |
|------|--------|------------|
| `/patient` (dashboard) | Com falhas | Contadores limitados por `take`, nomes de psicanalista/terapeuta sem decrypt, hierarquia confusa (ver ý4) |
| `/patient/find` (mapa) | Com falhas | Funcional; fallback silencioso p/ S?o Paulo, `renderPopup` ignorado, race condition de buscas |
| `/patient/appointments` | Com falhas | Fluxo completo, mas cancel/reschedule sem tratamento de erro, filtro Online/Presencial inerte, rating fake 4.8 |
| `/patient/history` | Com falhas | i18n OK; `fetchHistory` falha silenciosa; PDF exportado ? parcial e em ingl?s |
| `/patient/prescriptions` | OK | Padr?o s?lido de empty/error state; fallback silencioso para PDF n?o assinado ? o risco |
| `/patient/documents` | Com falhas | Nome do m?dico em docs compartilhados sem decrypt; fallback "your doctor" em ingl?s |
| `/patient/medications` | Com falhas | Save/delete sem feedback de erro; `handleShare` chama rota inexistente (c?digo morto) |
| `/patient/exam-requests` | Com falhas | Listagem OK, **download de PDF quebrado** (falha n? 6) |
| `/patient/resources` | OK | Separador `?` corrompido (encoding) |
| `/patient/messages` | Com falhas | Polling quebrado em conversa vazia (falha n? 10), stub "Paciente" hardcoded, race condition p?s-envio |
| `/patient/account` | Com falhas | Falha de load do perfil ? silenciosa (risco de sobrescrever dados); bot?es de senha sem aria-label |
| `/patient/tcle` | Incompleta | Loading infinito poss?vel se session fetch falhar; i18n paralelo; quebra o shell do dashboard |
| `/patient/providers` | Com falhas | CTA "Mensagens" n?o abre o chat com aquele profissional; typo `?` |
| `/patient/club-doctor` | OK | Falhas de load silenciosas |
| `/patient/buying-club` | Com falhas | Join failure ignorado (`catch {}`) |
| `/patient/integrative-care` | Com falhas | Sem error state; separador `?` |
| `/patient/subscription` | Morta | S? redirect para `/patient/club-doctor` ? e a notifica??o `payment` ainda aponta para ela |
| `/patient/connected-apps` | Com falhas | Erro de API vira empty state; revoke n?o verifica resposta; datas sem locale |
| `/patient/fhir-authorize` | OK | Suspense fallback ? o caractere `"?"` |
| `/urgent` (JIT) | Com falhas | N?o restaura fila ativa; pagamento antes da vaga; sem UI para "m?dico ficou offline" (`sessionStatus` tipado mas nunca usado ? `urgent/page.tsx:66`) |
| `/video/[id]` | OK | Ownership OK; strings de erro em ingl?s hardcoded |
| `/video/jit/[queueId]` | Com falhas | Sem estado "aguardando m?dico"; sala Daily morta n?o ? recriada (humanit?rio recria, JIT n?o) |
| `/video/humanitarian/[entryId]` | Com falhas | Strings "Redirecting..." em ingl?s; TTL de presen?a de 3 min derruba paciente com 3G ruim |
| `/humanitarian` ? `/humanitarian/[slug]` | Com falhas | Fila funcional; idioma n?o travado em ES; entra na fila com 0 volunt?rios online e estimativa enganosa |
| `/humanitarian/[slug]/triage` | Com falhas | Erros de API crus (pode renderizar `[object Object]`) |
| `/humanitarian/[slug]/tcle` | Com falhas | Documento integral abre em PT |
| `/humanitarian/[slug]/anamnese` | OK | Opcional, mas aparece no stepper como etapa obrigat?ria |
| `/onboarding` | Morta (redirect) | Redireciona para `/patient/account` ? n?o ? um onboarding real |

**Rotas ?rf?s** (existem mas n?o est?o no menu): `/patient/tcle`, `/patient/connected-apps`, `/patient/fhir-authorize`, `/patient/subscription`.

---

## 3. FALHAS ENCONTRADAS

### 3.1 Agendamento e pagamento

| Falha | Arquivo:linha | Sev. | Impacto no paciente | Corre??o sugerida |
|-------|--------------|------|---------------------|-------------------|
| Slots gerados no fuso do servidor: `slotDate.setHours(currentHour, currentMin, 0, 0)` interpreta "09:00" do profissional no TZ do processo Node | `src/lib/scheduling.ts:92-101`; `src/lib/availability-slots.ts:130-132` | CR?TICA | Consulta marcada em hor?rio errado; bot?o exibe `slot.startTime` cru enquanto o resumo converte para o TZ do browser ? tr?s hor?rios potencialmente diferentes | Adicionar `timezone` em `ProfessionalProfile` e `User`; gerar slots com biblioteca TZ-aware (`Intl`/`date-fns-tz`); exibir sempre com `timeZone` expl?cito e r?tulo do fuso |
| Pagamento capturado + slot tomado = sem reembolso: `AppointmentSlotTakenError` no webhook s? loga | `src/app/api/payments/webhook/route.ts:135-137`; `src/lib/fulfill-consultation.ts:171-178` | CR?TICA | Dinheiro perdido, suporte manual | Refund autom?tico no catch do webhook; ou hold do slot ao criar o PaymentIntent |
| `handleCancel` sem `res.ok`/try-catch; sempre mostra tela de sucesso | `src/app/(dashboard)/patient/appointments/page.tsx:609-621` | CR?TICA | Paciente acha que cancelou; consulta segue ativa; bot?o pode travar em loading | Checar `res.ok`, exibir erro no modal, try/catch com reset de loading |
| Reagendamento: `openReschedule` sem tratamento de falha ? spinner eterno; `handleReschedule` silencioso em `!res.ok` | `appointments/page.tsx:639-649, 1353-1354, 623-636` | ALTA | Modal preso em loading; clique em confirmar "n?o faz nada" | Error state no modal + mensagem quando a API recusa |
| Filtro Online/Presencial n?o refaz a busca nem filtra client-side (`fetchProfessionals` s? no mount; `filtered` ignora `type`) | `appointments/page.tsx:170, 659-664, 848` | ALTA | Paciente clica "Presencial" e a lista n?o muda; deep link `?pro=` pode falhar | `useEffect` sobre `type` refazendo o fetch, ou filtrar por `acceptsInPerson`/`acceptsTeleconsult` |
| `fetchAppointments`/`fetchPastAppointments`/`loadSlots` sem try-catch nem `res.ok` | `appointments/page.tsx:302-314, 356-399` | M?DIA | Falha de API ? "voc? n?o tem consultas" falso | Error state com retry |
| Deep link `?pro=ID` s? resolve se o profissional est? na lista (limite 80, filtrada por `type`) | `appointments/page.tsx:231-248`; `src/app/api/professionals/route.ts:20` | ALTA | Fluxo vindo do mapa/perfil p?blico quebra silenciosamente | Buscar o profissional por ID quando n?o estiver na lista (o c?digo de `rebookFromPast:326-341` j? faz isso ? reutilizar) |
| Rating hardcoded: API devolve `rating: 4.8, reviewCount: 0` fixos; rebook injeta `rating: 4.8` | `src/app/api/professionals/route.ts:45-46`; `appointments/page.tsx:337` | M?DIA | Avalia??o falsa exibida em todos os cards | Agregar `ProfessionalReview` real (o mapa j? faz em `professionals-map-data.ts:64-68`) |
| Retorno `?checkout=cancelled` do Stripe n?o tem handler | `src/app/api/payments/checkout-consultation/route.ts:147`; `appointments/page.tsx:180-207` (s? trata `success`) | M?DIA | Paciente que desiste do PIX volta a uma tela sem contexto | Banner "pagamento n?o conclu?do ? tentar novamente" |
| PIX pendente: sem polling; mensagem da API em PT fixo | `src/app/api/payments/checkout-consultation/confirm/route.ts:34-47` | M?DIA | Paciente EN/ES recebe texto PT; n?o sabe quando confirmou | Polling do status + i18n da mensagem |
| TCLE interrompe o wizard e devolve ao passo "browse" (perde slot selecionado) | `appointments/page.tsx:217-222` | M?DIA | Refa??o de todo o fluxo ap?s assinar o consentimento | `returnUrl` com estado (pro/slot) ou modal de TCLE inline |
| `.ics` do calend?rio com "Teleconsulta"/"Consulta presencial" em PT fixo | `src/app/api/appointments/[id]/calendar/route.ts:53-61` | BAIXA | Convite de calend?rio em idioma errado | Usar `User.language` |

### 3.2 JIT (Plant?o Online) e v?deo

| Falha | Arquivo:linha | Sev. | Impacto | Corre??o sugerida |
|-------|--------------|------|---------|-------------------|
| Cobran?a antes da vaga: `confirmCardPayment` ? depois `joinQueue`; fila cheia (429) ou sess?o offline (404) deixam pagamento retido | `src/app/urgent/page.tsx:215-246` | CR?TICA | Cobrado sem atendimento | Reservar vaga (pending) antes de cobrar, ou refund autom?tico quando o join falha |
| Cancel/no-show sem refund; webhook ignora `type: "JIT"` | `src/app/api/jit/queue/cancel/route.ts:31-34`; `queue/route.ts:295-299`; `payments/webhook/route.ts:124-146` | CR?TICA | Idem | Tratar refund nos tr?s pontos |
| `jitQueue.paymentId` recebe `pi_...` do Stripe, mas a FK aponta para `JitPayment` (modelo nunca instanciado) | `src/app/api/jit/queue/route.ts:236`; `prisma/schema.prisma:2321-2322` | CR?TICA | Join pago pode falhar; financeiro do m?dico sem receita JIT | Criar `JitPayment` no join verificado e ligar a FK |
| `/urgent` n?o restaura fila ativa no mount | `urgent/page.tsx:123-144` | CR?TICA | Fechar o app = perder a vez (timeout 120s) | `GET /api/jit/queue?mine=1` no mount e retomar polling |
| Notifica??o "sua vez" sem deep link (`data` sem `url`; default ? `/patient`) | `src/app/api/jit/queue/route.ts:397-410`; `src/lib/notifications.ts:48` | ALTA | Push leva ao lugar errado na janela de 2 min | `url: "/urgent"` no payload |
| `CALL_NEXT` n?o impede dois pacientes `CALLED` simult?neos (guard s? na UI do m?dico) | `src/app/api/jit/queue/route.ts:357-389` | ALTA | Dois pacientes "? a sua vez"; um perde | Recusar CALL_NEXT se j? existe entry CALLED na sess?o |
| Sala Daily morta n?o ? recriada no JIT (humanit?rio recria via `isDailyRoomJoinable`) | `src/app/api/jit/queue/[queueId]/video/route.ts:76-79` vs `humanitarian/queue/[entryId]/video/route.ts:117-134` | ALTA | 503 permanente ap?s espera longa | Portar a l?gica de recria??o do humanit?rio |
| M?dico offline: sess?o vira OFFLINE ap?s 15 min sem heartbeat, mas ningu?m cancela/avisa os `WAITING`; `sessionStatus` chega ao front e nunca ? usado | `src/lib/jit-session-lifecycle.ts:52-64`; `urgent/page.tsx:66` | ALTA | Espera infinita | UI "o m?dico ficou indispon?vel" + cancel/refund autom?tico |
| No-show expira s? via polling do m?dico (dashboard aberto); cron `jit-cleanup` n?o cobre entradas | `queue/route.ts:268-315`; `professional/jit/page.tsx:98-106`; `cron/jit-cleanup/route.ts:15` | ALTA | Paciente preso em "? a sua vez!" eterno | Expirar no GET do pr?prio paciente ou no cron |
| Paciente pode pagar/entrar em v?rias filas ao mesmo tempo (verifica??o de duplicata ? por `sessionId`) | `queue/route.ts:200-208` | ALTA | Cobran?as m?ltiplas | Verifica??o global de fila ativa por paciente |
| Sem estado "aguardando m?dico" na sala JIT; sem polling de status (humanit?rio e appointment t?m) | `src/components/VideoConsultRoom.tsx:801-807` (vs 289-352) | ALTA | Paciente sozinho na sala sem orienta??o | Overlay "aguardando o m?dico entrar" + poll da fila |
| Permiss?o de c?mera/microfone negada: s? erro gen?rico do Daily | `src/components/DailyPrebuiltEmbed.tsx:167-172` | ALTA | Consulta imposs?vel no Android sem instru??o | Detectar `NotAllowedError` e exibir passo a passo de permiss?es |
| `pagehide` chama `leave()` ? minimizar o app derruba a chamada; reconex?o s? manual | `DailyPrebuiltEmbed.tsx:199-213` | M?DIA | Trocar de app no celular = cair da consulta | N?o sair em `pagehide`; auto-rejoin em `left-meeting` inesperado |
| `leaveQueue` otimista: limpa a UI e ignora falha do cancel | `urgent/page.tsx:287-298` | M?DIA | Fila fantasma no servidor; m?dico chama quem j? saiu | Aguardar resposta e reverter em erro |
| Posi??o na fila nunca recalcula (n?mero fixo; s? `aheadCount` muda) | `queue/route.ts:222-227` vs `urgent/page.tsx:382` | M?DIA | "Posi??o 5" com 0 pessoas ? frente | Exibir `aheadCount + 1` como posi??o |
| Paciente que sai da chamada JIT n?o notifica o servidor (humanit?rio tem `patient-leave`) | `VideoConsultRoom.tsx:693-707` (s? humanit?rio) | M?DIA | Fila fica `IN_PROGRESS` inconsistente | Endpoint an?logo para JIT |
| Strings hardcoded EN no fluxo de v?deo ("Redirecting to consent form...", "Could not join video room", "Connecting?") | `src/app/video/jit/[queueId]/page.tsx:20-22`; `DailyPrebuiltEmbed.tsx:118,170,183,223` | M?DIA | PT/ES veem ingl?s no momento mais tenso | Mover para `translations.ts` |
| `markConnected()` disparado logo ap?s `join()` ? mascara falhas de m?dia | `DailyPrebuiltEmbed.tsx:176-180` | BAIXA | Overlay some antes do v?deo funcionar | Aguardar evento `joined-meeting` |

### 3.3 P?s-consulta, hist?rico, receitas e documentos

| Falha | Arquivo:linha | Sev. | Impacto | Corre??o sugerida |
|-------|--------------|------|---------|-------------------|
| PDF de exame nega o pr?prio paciente (ACL exige `document.patientId`, que o fluxo do profissional n?o preenche) | `src/app/api/professional/documents/[id]/pdf/route.ts:80-94`; cria??o em `professional/documents/route.ts:117-127` | CR?TICA | Download 403 na fun??o central p?s-consulta | Incluir `patientRecord.linkedUserId === session.user.id` no ACL; backfill de `patientId` ao vincular chart |
| Compartilhamento de hist?rico grava PHI em texto claro e mensagem sem `encrypt()`; aceita qualquer profissional como destino | `src/app/api/patient/share/route.ts:69-77, 97-111` (contraste: `share-with-doctor/route.ts:58-66` exige consulta) | CR?TICA | Viola??o LGPD/HIPAA; over-sharing | Criptografar `content`/mensagem; exigir v?nculo cl?nico |
| PDF assinado (Lacuna): falha de S3 gera **PDF sem assinatura silenciosamente**, com badge "Assinada" na UI | `src/app/api/professional/prescriptions/[id]/pdf/route.ts:112-128,183`; `prescriptions/page.tsx:73-74` | ALTA | Receita sem validade legal apresentada como assinada | Retornar erro expl?cito ("assinado indispon?vel, tente mais tarde") em vez de fallback |
| Export PDF do hist?rico ? parcial (n?o l? o JSON completo de `PatientProfile.notes`) e sai em ingl?s/`en-US` fixo | `src/app/api/patient/history/pdf/route.ts:31-109, 43-45` | ALTA | Paciente exporta "hist?rico completo" incompleto e no idioma errado | Renderizar a anamnese completa + locale do usu?rio (como `medications/pdf` j? faz) |
| Polling de chat inerte em conversa vazia | `messages/page.tsx:152-157` | ALTA | Primeira mensagem do m?dico nunca chega | Poll incondicional (com `since` opcional) |
| `POST /api/messages` sem validar v?nculo cl?nico (paciente ? qualquer profissional/admin por `receiverId`) | `src/app/api/messages/route.ts:126-134` | ALTA | Spam/contato n?o autorizado | Exigir appointment/JIT/contato existente |
| Detec??o de "j? compartilhado" por substring de t?tulo ? t?tulos de docs profissionais s?o criptografados, ent?o nunca casa | `src/app/api/patient/history-status/route.ts:42-56` | ALTA | `ShareHistoryPrompt` pede compartilhar de novo ou erra o estado | Flag estruturada (`SharedRecord` por tipo) em vez de LIKE em t?tulo |
| `fetchHistory` silencioso em 401/500 ? formul?rio vazio | `history/page.tsx:168-176` | M?DIA | Paciente pode sobrescrever a anamnese achando que estava vazia | Error state bloqueando o save |
| Medicamentos: `handleAdd`/`handleDelete` ignoram `!res.ok`; `handleShare` chama `/api/patient/medications/share` que **n?o existe** | `medications/page.tsx:69-84, 105-121` | M?DIA | A??o parece conclu?da sem estar; c?digo morto | Feedback de erro; remover rota fantasma |
| FHIR export n?o inclui a anamnese estruturada de `notes` | `src/lib/fhir/load-patient-fhir.ts:65-115` | M?DIA | Interoperabilidade prometida entrega bundle parcial | Mapear anamnese para recursos FHIR |
| `AiSummarizeButton` chama rota **profissional** e n?o aparece em nenhuma p?gina do paciente | `src/components/AiSummarizeButton.tsx:36` | M?DIA | Funcionalidade anunciada inacess?vel ao paciente | Rota `/api/patient/ai-summarize` com ACL pr?pria |
| Documentos: nome do m?dico compartilhador sem decrypt + fallback "your doctor" em EN | `documents/page.tsx:102-104` | M?DIA | "Shared by Dr. [ciphertext]" | `safeDecrypt` + chave i18n |
| Avalia??o p?s-consulta: sem bot?o "Avaliar" nas consultas passadas; modal s? via e-mail/deep link `?reviewPro=`; rating default = 5 estrelas | `appointments/page.tsx:798-833, 250-263`; `ReviewPromptModal.tsx:19` | M?DIA | Convite fraco; vi?s de nota | Bot?o "Avaliar" na lista de passadas + prompt p?s-v?deo; default sem sele??o |
| Frequ?ncia de medicamento persistida em ingl?s can?nico ("Once daily") e exibida crua | `medications/page.tsx:299-307` | BAIXA | Mistura de idiomas | Mapear valor?label na exibi??o |
| `formatBrl` sempre `pt-BR` | `medications/page.tsx:28-33` | BAIXA | Formata??o estranha para EN/ES | Usar `localeOf(lang)` |

### 3.4 Dashboard e navega??o

| Falha | Arquivo:linha | Sev. | Impacto | Corre??o sugerida |
|-------|--------------|------|---------|-------------------|
| Nomes de psicanalista/terapeuta na lista de consultas **sem decrypt** (o banner das 48h descriptografa, a lista n?o) | `src/app/(dashboard)/patient/page.tsx:504-508` vs `167-171` | CR?TICA | Paciente v? ciphertext no lugar do nome | Aplicar `safeDecrypt` como no banner |
| Idem no card JIT do dashboard | `patient/page.tsx:382-384` | ALTA | "Consulta com Dr. [lixo]" (para provedores com nome criptografado) | Idem |
| Stat cards mostram subconjunto (`take: 5/4`) como se fosse total; s? prescri??es usa `count` | `patient/page.tsx:63-85, 155-157` | ALTA | "5 medicamentos" para quem tem 20 ? n?meros n?o confi?veis | `db.count` para os quatro |
| Especialidades hardcoded em ingl?s ("Psychoanalysis", "Integrative therapy") | `patient/page.tsx:490` | ALTA | Mistura de idiomas na tela traduzida | Chaves i18n |
| Flash de menu de paciente para todos os roles (role inicial `"PATIENT"` at? a session responder) | `src/app/(dashboard)/layout.tsx:42-67` | ALTA | Profissional/admin v? menu errado por instantes | Estado `loading` sem menu, ou role vindo do server |
| Fonte global ? **Inter**, n?o Poppins; themeColor `#059669` (emerald); laranja `#e05930` e azul `#176a88` praticamente ausentes do painel | `src/app/layout.tsx:4-12, 23`; tokens em `tailwind.config.js:10-27` | ALTA | Identidade visual da marca n?o aplicada | Trocar `next/font` para Poppins; usar `brand`/`accent` nos CTAs |
| Menu com 17 itens planos, sem agrupamento; 11 deles duplicados dentro do pr?prio dashboard | `src/lib/platform-nav-registry.ts:65-83`; `layout.tsx:143-164` | M?DIA | Sobrecarga cognitiva; scroll longo no mobile | Ver proposta no ý4 |
| Slug humanit?rio hardcoded no menu (`venezuela-terremoto-2026`) | `platform-nav-registry.ts:80` | M?DIA | Campanha nova quebra o item | Resolver via campanha ativa |
| Notifica??o de pagamento aponta para a rota morta `/patient/subscription` | `src/lib/notification-links.ts:133-134` | M?DIA | Redirect desnecess?rio | Apontar para `/patient/club-doctor` |
| NotificationBell marca **tudo** como lido ao abrir o dropdown | `src/components/NotificationBell.tsx:126-128` | M?DIA | Paciente perde o controle do que viu | Marcar lido por item/ao clicar |
| TCLE com i18n paralelo (localStorage, default `pt`), loading infinito poss?vel, layout que ignora o shell | `patient/tcle/page.tsx:14-22, 39-58, 85-92` | M?DIA | Idioma divergente + spinner eterno em falha | Migrar para `useI18n`; catch com error state |
| Separadores literais `?` (encoding corrompido, provavelmente era `?` ou `?`) | `providers/page.tsx:126`; `PatientIntegrativeCareClient.tsx:127`; `exam-requests/page.tsx:121,129`; `resources/page.tsx:111`; `PatientChecklist.tsx:187`; `fhir-authorize/page.tsx:144` | M?DIA | Apar?ncia amadora em v?rias telas | Corrigir caracteres (rodar `npm run check:encoding`) |
| "Meus profissionais": CTA Mensagens vai para `/patient/messages` gen?rico, sem `?with=` | `providers/page.tsx:164-169` (rows sem `professionalUserId`, `53-101`) | M?DIA | CTA enganoso | Incluir `userId` no row e no link |
| Connected-apps: erro de API = empty state; revoke n?o checa resposta | `connected-apps/page.tsx:23-43` | ALTA | Paciente acredita ter revogado acesso a dados de sa?de sem ter revogado | Verificar resposta; error state |
| Acessibilidade: bot?es s?-?cone sem `aria-label` (menu/fechar sidebar, mostrar senha, enviar mensagem, dismiss checklist) | `layout.tsx:124-126,184-186`; `account/page.tsx:484-511,605-611`; `messages/page.tsx:440-446`; `PatientChecklist.tsx:141-143` | M?DIA | Leitores de tela n?o identificam a??es | Adicionar `aria-label` |

### 3.5 Fluxo humanit?rio (paciente venezuelano)

| Falha | Arquivo:linha | Sev. | Impacto | Corre??o sugerida |
|-------|--------------|------|---------|-------------------|
| Idioma n?o travado em ES: detec??o pega PT do browser; login inicia `"en"`; switcher persiste qualquer idioma | `HumanitarianLangSwitcher.tsx:15-18`; `login-shared.tsx:48-49` | CR?TICA | Jornada em PT/EN para p?blico ES | For?ar `es` como default dentro de `/humanitarian/*` e no login vindo de l? (`callbackUrl`) |
| TCLE integral abre em **portugu?s** (`useState<Lang>("pt")`) | `src/components/LegalLayout.tsx:30` | CR?TICA | Documento legal ileg?vel para o p?blico-alvo | Default por contexto/param `?lang=es` |
| Erros de API crus em ingl?s em toda a jornada ("Complete initial triage...", "Not your turn yet", "INVALID_PHONE", Zod flatten que vira `[object Object]`) | `[slug]/page.tsx:101,252,289`; `HumanitarianTriageForm.tsx:145`; `HumanitarianPhoneGate.tsx:67-70`; `queue/enter/route.ts:32-43` | ALTA | Confian?a destru?da em momentos de erro | APIs retornarem `errorCode`; front mapear c?digo ? chave i18n |
| TTL de presen?a de 3 min: conex?o 3G inst?vel remove o paciente da fila (`CANCELLED`) e a UI mostra "Perdiste tu turno" (copy de NO_SHOW) | `src/lib/humanitarian/volunteer-presence.ts:5`; `dispatcher.ts:38-59`; `[slug]/page.tsx:658-667` | CR?TICA | P?blico vulner?vel culpado por queda de rede | TTL maior/toler?ncia; copy distinta para queda de conex?o + reentrada com 1 toque |
| Estimativa de espera com 0 volunt?rios usa `max(onlineVolunteers, 1)` ? mostra ~15 min quando n?o h? ningu?m; join permitido com 0 online | `dispatcher.ts:975-980`; `[slug]/page.tsx:429-503` | ALTA | Espera indefinida mascarada | Estado expl?cito "sin voluntarios en l?nea ahora" + op??o de aviso por WhatsApp |
| Outbox offline (IndexedDB `doctor8-hum`) sem escopo por userId ? item de A pode ser enviado com a sess?o de B no mesmo aparelho | `src/lib/humanitarian/outbox.ts:1-3, 150-156` | ALTA | Triagem/anamnese de um paciente associada ? conta de outro (dispositivos compartilhados s?o comuns nesse p?blico) | Escopar chave por userId; limpar no logout |
| Stepper com 5 etapas (inclui "Phone" sem rota e anamnese opcional); labels `text-[9px]` ileg?veis | `HumanitarianFlowStepper.tsx:7-13, 54-67` | M?DIA | Paciente perdido no fluxo | Stepper de 3 etapas reais; fonte ? 12px |
| Nav "Voluntariado"/"?ngel" vis?vel ao paciente no header | `HumanitarianShell.tsx:133-137` | M?DIA | Ru?do/confus?o | Ocultar para role PATIENT |
| Res?duos PT no copy ES: "No disponible", "Concluir ficha", "Volver al atendimiento humanitario", label "Psicanalista" | `translations.ts:8124, 8207, 8366`; `humanitarian/constants.ts:60-61` | M?DIA | Espanhol "quebrado" | Revis?o de copy ES |
| `PwaInstallPrompt` s? em `/sos-venezuela`, n?o no fluxo `/humanitarian/*` | `PwaInstallPrompt.tsx` | M?DIA | Perde "adicionar ? tela inicial" onde mais importa | Montar tamb?m no shell humanit?rio |
| Sem empty state para `pools.length === 0` | `[slug]/page.tsx:403-461` | M?DIA | Tela vazia sem explica??o | Mensagem + fallback |

### 3.6 Seguran?a (lado paciente)

**O que est? BEM (verificado):** ownership por ID est? correto nas rotas cr?ticas ? `appointments/[id]/cancel|reschedule|video|calendar`, `jit/queue?queueId=` (`queue/route.ts:59-60`), `jit/queue/[queueId]/video`, `humanitarian/queue/[entryId]/*`, `patient/medications/[id]`, `patient/documents`, `patient/resources/[id]/file`, PDFs de receita (paciente dono OU prescritor), e `room/[roomId]/token` (`token/route.ts:39-44` exige ser paciente ou profissional **daquela** consulta). Webhooks Stripe/WhatsApp/Daily verificam assinatura. N?o foi encontrado IDOR cl?ssico cross-paciente. Mass assignment: rotas PATCH/POST usam schemas Zod expl?citos.

| Falha | Arquivo:linha | Sev. | Cen?rio | Corre??o sugerida |
|-------|--------------|------|---------|-------------------|
| Outbox humanit?rio sem escopo por userId (detalhado em ý3.5) | `src/lib/humanitarian/outbox.ts` | ALTA | PHI de A enviada/lida na conta de B no mesmo aparelho | Escopar por userId + limpar no logout |
| Middleware n?o aplica role em `/api/*` ? s? autentica??o; v?rias rotas `/api/patient/*` de PHI n?o checam `role === "PATIENT"` (history, medications, fhir, pdf, connected-apps...) | `src/middleware.ts:256-327`; ex. `api/patient/history/route.ts:17-18` | M?DIA | Defesa em profundidade ausente (dados retornados s?o do pr?prio userId, n?o de terceiros) | Aplicar `requirePatient()` (j? existe em `src/lib/api-auth.ts`) em todas as rotas PHI |
| Cache do checklist (`doctor8.patient.checklist.state`) e dismiss de banners sem escopo por userId | `src/components/PatientChecklist.tsx:23-24` | M?DIA | Usu?rio B v? flags de onboarding/sa?de de A por at? 5 min no mesmo browser | Prefixar chave com userId; limpar no logout |
| Mensagens: envio a qualquer `receiverId` profissional sem v?nculo cl?nico | `api/messages/route.ts:126-134` | M?DIA | Spam/engenharia social interna | Validar rela??o |
| `forgot-password-sms`: s? cooldown 60s por e-mail, sem limite por IP (magic-link e forgot-password t?m) | `api/auth/forgot-password-sms/route.ts:57-67` | M?DIA | Flood de SMS/enumera??o | `checkRateLimits` como nas rotas irm?s |
| Intake humanit?rio sem rate limit (a fila tem, 10/h) | `api/humanitarian/intake/route.ts:42-130` | M?DIA | Spam de triagem | Rate limit an?logo |
| Webhook Daily aceita request sem secret em non-production | `api/webhooks/daily/route.ts:12-13` | BAIXA | Forjar eventos em staging | Exigir secret sempre |

### 3.7 i18n e timezone (transversal)

- **Arquitetura i18n:** custom, madura no dashboard ? dicion?rio central `src/lib/i18n/translations.ts` (~12k linhas, PT/EN/ES), `I18nProvider` (cookie `doctor8.lang` + localStorage + `User.language`), `getUserLang()` no server. Nenhuma p?gina do paciente ? 100% monol?ngue.
- **Problemas:** 4 dicion?rios paralelos fora do sistema central (`VideoConsultRoom`, `SupportWidget`, `PatientTour`, `ShareHistoryPrompt`) com **defaults conflitantes** (`pt` vs `en` vs `es`) que causam flash de idioma errado; vazamentos pontuais de ingl?s listados nas se??es acima; erros de API em ingl?s cru chegando ? UI.
- **Timezone:** ver falha n? 1. Agravantes: `User` sem campo `timezone` (s? `Organization` tem); Google Meet criado com `America/Sao_Paulo` fixo (`src/lib/google-meet.ts:213-214`); todas as ~30 formata??es `toLocale*` do lado paciente sem op??o `timeZone` ? corretas apenas se o instante UTC de origem estiver certo, o que a gera??o de slots n?o garante.

### 3.8 Mobile / Capacitor / performance

- **Capacitor/Android: inexistente no reposit?rio.** Nada de `@capacitor/*`, `capacitor.config.ts`, pasta `android/`. Sem permiss?es nativas de c?mera/microfone, sem `windowSoftInputMode=adjustResize` (teclado sobre inputs), sem handler de bot?o voltar, sem deep links nativos. **Tratar como gap de produto** ? se o wrapper existe em outro repo, este c?digo n?o oferece nada espec?fico para ele (nenhum listener de `backButton`, nenhum ajuste de viewport para WebView).
- **PWA:** o manifest (`src/app/manifest.ts`) e o `public/sw.js` s?o exclusivos do fluxo humanit?rio (`start_url: /sos-venezuela`, `lang: es`). N?o existe PWA instal?vel para o paciente regular.
- **Performance:** Leaflet corretamente lazy (`ssr: false`), mas com dois dynamic imports em cascata (dois spinners) em `find/page.tsx:5-6` + `PatientMapClient.tsx:14-21`; `react-leaflet` est? no `package.json` e **n?o ? usado** (depend?ncia morta); `/api/professionals` faz N+1 (at? 80 counts por request, `professionals/route.ts:23-48`); polling fixo sem backoff (fila JIT 4s, humanit?rio 5s, chat 4s, notifica??es 20s, SupportWidget rel? localStorage a cada 2s); `next/image` n?o ? usado em nenhuma tela do paciente.
- **Suporte (Claude Haiku):** o `SupportWidget` ? global (`src/app/layout.tsx:41`) mas se oculta exatamente em `/video/*`, `/room/*` e `/humanitarian/*` (`SupportWidget.tsx:210-218`) ? o paciente fica **sem suporte durante a videochamada**, o momento de maior fric??o t?cnica.
- **Notifica??es:** infra boa (QStash 24h/3h e-mail, WhatsApp, sino, web push), mas `PushSubscribe.tsx:18` s? registra push se a permiss?o **j?** estiver `granted` ? nunca pede; o tipo `appointment_confirmed` ? definido e nunca emitido; sem confirma??o de presen?a ("vou comparecer").

---

## 4. REORGANIZA??O DE UX

### 4.1 Diagn?stico da hierarquia atual do dashboard

Ordem atual em `src/app/(dashboard)/patient/page.tsx`: at? **4 banners** (humanit?rio, Club Doctor, chart-link, consulta em 48h) **antes da sauda??o**; depois card do mapa; **s? ent?o** o hero de atendimento imediato (o coment?rio na linha 349 diz "priority hero", mas ele ? o 7? bloco); banners de perfil/hist?rico incompletos; checklist + tour; 4 stat cards (com n?meros errados, ver ý3.4); grid de consultas/aten??o/meds/docs; e um "acesso r?pido" com 14 atalhos que duplica quase todo o sidebar. A se??o "Aten??o" repete urgent + mensagens + receitas j? vis?veis acima.

### 4.2 Hierarquia proposta

1. **Estado ativo em primeiro lugar** (card ?nico e din?mico): se o paciente est? em fila JIT/humanit?ria ? status da fila com CTA "voltar ? espera"; sen?o, se h? consulta nas pr?ximas 48h ? card da consulta com bot?o Entrar/Reagendar; sen?o, hero de atendimento imediato com contagem de m?dicos online.
2. **Sauda??o** (curta, sem subt?tulo redundante).
3. **Duas a??es prim?rias lado a lado:** "Atendimento agora" (`/urgent`) e "Agendar consulta" (`/patient/appointments`) ? o mapa vira caminho secund?rio dentro de agendar.
4. **Pend?ncias reais** (m?ximo 1 banner por vez, priorizado): receita nova n?o visualizada > mensagem n?o lida > avalia??o pendente > perfil/hist?rico incompleto > upsell Club Doctor (nunca acima de pend?ncia cl?nica).
5. **Pr?ximas consultas** (lista) e **medicamentos ativos**.
6. **Rodap?:** privacidade + suporte.
   Remover: stat cards (ou reduzi-los a 2 com counts reais), se??o "Aten??o" (duplicada), grid de 14 atalhos (o menu j? faz isso).

### 4.3 Navega??o proposta

O menu atual tem 17 itens planos (`platform-nav-registry.ts:65-83`). Proposta com 3 grupos + fixos:

- **Cuidar agora:** Atendimento imediato ? Agendar/Minhas consultas ? Encontrar profissional (mapa)
- **Minha sa?de:** Hist?rico ? Receitas ? Exames ? Documentos ? Medicamentos (Recursos e Cuidado integrativo entram como abas dentro de Documentos/Hist?rico, n?o itens de topo)
- **Comunica??o e conta:** Mensagens (badge) ? Meus profissionais ? Club Doctor + Clube de compras (um item "Benef?cios") ? Conta
- **Contextuais:** o item humanit?rio s? aparece se h? campanha ativa para a regi?o (resolver o slug dinamicamente); `connected-apps`/`fhir-authorize` acess?veis a partir de Conta (j? OK); eliminar `/patient/subscription` e o link de notifica??o que aponta para ela.

### 4.4 Jornadas com atrito (contagem atual ? alvo)

| Jornada | Hoje | Alvo | Como |
|---------|------|------|------|
| Marcar consulta (dashboard ? confirma??o) | ~7 cliques via appointments; ~9 via mapa; +2 se TCLE pendente | 5 | TCLE inline no checkout (sem sair do wizard); pr?-selecionar 1? dia com slots; um clique a menos fundindo "Continuar para pagamento" quando s? h? 1 m?todo |
| Entrar no plant?o | 2-3 cliques (bom) ? mas irrecuper?vel se fechar o app | 2 + retom?vel | Restaurar fila no mount + deep link na notifica??o |
| Ver receita | 3 cliques (dashboard ? receitas ? baixar) | 2 | Pend?ncia "nova receita" no topo do dashboard com download direto |
| Falar de novo com o mesmo m?dico | 1 clique ("Consultar novamente") ? bom, mas s? nas 5 ?ltimas | 1 | Manter; expor tamb?m na p?gina do profissional em "Meus profissionais" |
| Cancelar/Reagendar | 3-4 cliques ? mas com os bugs do ý3.1 | 3-4 confi?veis | Corrigir feedback de erro antes de otimizar |

### 4.5 Feedback ao usu?rio

Padr?es faltantes: n?o h? sistema de **toast** global (o `@radix-ui/react-toast` est? instalado e n?o ? usado no lado paciente) ? sucesso/erro hoje dependem de cada tela; a??es silenciosas mapeadas: cancelar consulta (falso sucesso), reagendar (nada), salvar/excluir medicamento, revogar app conectado, sair da fila JIT, join do clube de compras. Recomenda??o: provider de toast no `(dashboard)/layout.tsx` + adotar nos 6 pontos acima.

### 4.6 Onboarding

O que existe: checklist de 6 passos (`PatientChecklist`) + tour (`PatientTour`) + tooltips no agendamento. O que falta: `/onboarding` ? s? um redirect para account ? um paciente novo cai no dashboard cheio de banners sem um "comece por aqui"; o TCLE s? aparece como bloqueio na hora do v?deo/fila (surpresa no pior momento). Proposta: primeira visita mostra s? 3 escolhas ("Preciso de atendimento agora" / "Quero agendar" / "Completar meu perfil de sa?de"), e o TCLE ? oferecido dentro do fluxo de perfil, antes de virar bloqueio.

---

## 5. NOVAS FUNCIONALIDADES (impacto ? esfor?o)

Esfor?o: **P** (?1 dia), **M** (2-5 dias), **G** (>1 semana). Ordenado por impacto/esfor?o.

| # | Funcionalidade | Valor para o paciente | Esfor?o | Reaproveita |
|---|----------------|----------------------|---------|-------------|
| 1 | **Confirma??o de presen?a** (link "Confirmo que vou" no e-mail/notifica??o de 24h) | Reduz no-show; d? seguran?a de que a consulta est? de p? | **P** | Pipeline QStash `reminders/send` j? existe; adicionar tipo `confirm_request` + campo `patientConfirmedAt` no `Appointment` (via `prisma db push`) |
| 2 | **Avalia??o p?s-consulta in-app** (bot?o "Avaliar" nas consultas passadas + prompt ao sair do v?deo) | Fecha o ciclo; melhora a qualidade do marketplace | **P** | `ProfessionalReview`, `ReviewPromptModal`, `POST /api/patient/reviews` j? existem ? falta s? a UI de entrada |
| 3 | **Central de notifica??es como p?gina** (`/patient/notifications`) com hist?rico e links profundos corretos | Hoje o sino marca tudo lido ao abrir e some | **P** | Modelo `Notification` + `/api/notifications` prontos |
| 4 | **?rea "Receitas e documentos assinados" unificada** com badge de assinatura confi?vel e aviso quando o assinado est? indispon?vel | Documento legal acess?vel sem surpresa | **M** | Rotas `prescriptions/[id]/pdf` e `.../signed` (Lacuna) existem; corrigir fallback silencioso (ý3.3) e ACL de exames (falha n? 6) |
| 5 | **Ficha de sa?de estruturada vis?vel** (alergias/condi??es/medicamentos como cards no topo do hist?rico, com edi??o r?pida) | Dados cr?ticos ? m?o na hora da consulta | **M** | `PatientProfile.notes` + colunas `allergies`/`chronicConditions`/`bloodType` + modelo `Medication` j? cobrem tudo ? ? trabalho de UI + incluir no PDF/FHIR |
| 6 | **Disponibilidade em tempo real no mapa/lista** ("atende agora" quando o profissional tem `JitSession` ONLINE; pr?ximo slot livre no card) | Decis?o mais r?pida; ponte busca?JIT | **M** | `activeOnlineJitSessionWhere()` + `professionals-map-data.ts` j? agregam quase tudo |
| 7 | **Retorno em 1 clique** ("marcar retorno" ao fim da videoconsulta e na receita, pr?-selecionando o mesmo profissional) | Continuidade de cuidado | **P** | `rebookFromPast` j? implementa a l?gica (`appointments/page.tsx:317-347`); expor nos pontos certos |
| 8 | **Push de verdade** (pedir permiss?o em momento oportuno ? ap?s 1? consulta marcada ? em vez de exigir permiss?o pr?-concedida) | Lembretes/chamada da fila chegam de fato | **P** | `PushSubscribe.tsx` e `web-push` prontos; mudar o gate da linha 18 |
| 9 | **Lembrete + aviso de fila por WhatsApp no JIT** (opt-in ao entrar na fila: "te avisamos quando faltar 1") | Paciente n?o precisa manter a tela aberta (falha n? 4 mitigada) | **M** | `sendAppointmentReminderWhatsApp`/`whatsapp.ts` e o gate de telefone humanit?rio j? existem |
| 10 | **Melhorias humanit?rias:** lock ES, aviso "sin voluntarios", reentrada tolerante a queda de rede, prompt PWA no fluxo | Experi?ncia digna para o p?blico mais fr?gil | **M** | Tudo j? existe em torno de `dispatcher.ts`; s?o ajustes de copy/config/UX |
| 11 | **Suporte na sala de v?deo** (variante m?nima do SupportWidget dentro de `/video/*`, ou bot?o "problemas com a chamada?" com troubleshooting) | Ajuda no momento de maior fric??o | **P** | `SupportWidget` global; remover `/video` da blocklist com layout compacto |
| 12 | **PWA do paciente** (manifest geral, ?cone, `start_url: /patient`) | ?cone na tela inicial sem app nativo; caminho at? resolver o gap Capacitor | **M** | `PwaRegister`/`sw.js` existem para o fluxo SOS; generalizar |
| 13 | **Timezone do usu?rio** (campo + seletor no account + aplica??o em UI/e-mail/ics) | Pr?-requisito da expans?o internacional | **G** | `localeOf`/`getUserLang` como modelo; requer `prisma db push` (campo `User.timezone`) e revis?o dos ~30 pontos de formata??o |
| 14 | **App Android real (Capacitor)** com permiss?es de c?mera/microfone, back button e deep links | Videochamada confi?vel no Android | **G** | Nada existe ? projeto novo; CSP do `next.config.js` j? libera Daily.co |

---

## 6. PLANO SUGERIDO (fases pequenas e seguras)

> Regra respeitada: altera??es de schema **somente** via `prisma db push`, isoladas em fases pr?prias, nunca migrations. Fases 1-3 n?o tocam o schema.

**Fase 1 ? Estancar perda de dinheiro e confian?a (sem schema):**
refund autom?tico JIT (cancel/no-show/join falho) e no webhook de consulta com slot tomado; `handleCancel`/`handleReschedule` com `res.ok` + error state; restaurar fila ativa no mount de `/urgent` + `url` nas notifica??es JIT; bloquear `CALL_NEXT` com `CALLED` existente; corrigir ACL do PDF de exames (aceitar `linkedUserId`).

**Fase 2 ? Confiabilidade vis?vel (sem schema):**
decrypt de nomes no dashboard/documentos; counts reais nos stat cards; polling de chat incondicional + `res.ok`; error states em connected-apps, history, medications, integrative-care, account; toast provider global; corrigir separadores `?`; recria??o de sala Daily no JIT (portar do humanit?rio); estado "aguardando m?dico" + tratamento de permiss?o de c?mera negada.

**Fase 3 ? Humanit?rio em espanhol (sem schema):**
lock `es` em `/humanitarian/*` e no login com callback humanit?rio; TCLE integral default ES; mapa de c?digos de erro ? i18n nas 8 APIs do fluxo; aviso "sin voluntarios en l?nea"; copy distinta para queda de conex?o vs no-show; TTL de presen?a mais tolerante; escopo por userId no outbox e no cache do checklist.

**Fase 4 ? Schema m?nimo (`prisma db push`, um campo por deploy):**
(a) `User.timezone` (default `America/Sao_Paulo`) e `ProfessionalProfile.timezone`; (b) `Appointment.patientConfirmedAt`; (c) avaliar `JitPayment` real no join pago. Cada push precedido de verifica??o em staging.

**Fase 5 ? Timezone de ponta a ponta:**
gera??o de slots TZ-aware; `timeZone` expl?cito nas formata??es do paciente; e-mails/WhatsApp/.ics no fuso do paciente; r?tulo do fuso na UI ("14:00, hor?rio de Bras?lia").

**Fase 6 ? UX e novas features de alto impacto:**
reorganiza??o do dashboard e do menu (ý4); confirma??o de presen?a; avalia??o in-app; push opt-in no momento certo; disponibilidade em tempo real no mapa; retorno em 1 clique; suporte na sala de v?deo.

**Fase 7 ? Plataforma:**
PWA do paciente; decis?o sobre o app Android (Capacitor do zero ? projeto G); rate limits pendentes (SMS, intake); `requirePatient()` nas rotas PHI; remo??o de `react-leaflet` e da rota morta `/api/patient/medications/share`.

---

*Relat?rio gerado por auditoria est?tica somente leitura. Todas as afirma??es citam arquivo e linha do estado atual do reposit?rio; linhas podem deslocar ap?s edi??es.*
