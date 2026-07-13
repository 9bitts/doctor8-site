# Análise + Prompt Cursor — Inbox WhatsApp multiatendente no Admin (Mensagens)

## Contexto do que já existe no código

- **Webhook Meta pronto**: `src/app/api/webhooks/whatsapp/route.ts` — GET de verificação (`WHATSAPP_WEBHOOK_VERIFY_TOKEN`), POST com verificação de assinatura (`verifyWhatsAppWebhookSignature`, `WHATSAPP_APP_SECRET`), delega para `processWhatsAppWebhookEvents` (que hoje só grava logs via `logWhatsAppDelivery`) e faz forward opcional para Chatwoot.
- **Envio**: `src/lib/whatsapp.ts` — só envia **templates** (lembrete, documento clínico, farmácia). Não existe função de envio de **texto livre** (necessária para responder dentro da janela de 24h). Usa `WHATSAPP_GRAPH_VERSION` (v25.0), `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`. Já existe `normalizeWhatsAppPhone`.
- **Admin**: nav em `ADMIN_NAV_GROUPS` (`src/lib/platform-nav-registry.ts`) + cards em `src/app/(dashboard)/admin/AdminHomeClient.tsx`; labels via i18n (`src/lib/i18n/translations.ts`). Guard de API: `getAdminSession()` de `@/lib/admin`.
- **Prisma**: já existe model `Message` (mensageria interna — **não reutilizar**). Existe `PatientProfile` (permite vincular conversa a paciente pelo telefone).

## O que falta (escopo do prompt)

Persistir conversas/mensagens, enviar texto livre, tela "Mensagens" no admin onde vários atendentes (usuários ADMIN) respondem pelo mesmo número.

---

## PROMPT PARA O CURSOR (copiar daqui para baixo)

Implemente um inbox de WhatsApp multiatendente no painel admin do Doctor8 (Next.js App Router + Prisma + Postgres). O objetivo: mensagens de pacientes chegam pelo webhook Meta Cloud API já existente, ficam persistidas como conversas, e qualquer usuário ADMIN responde por uma nova tela `/admin/mensagens`. Siga os padrões existentes do projeto (guards, i18n, estilo de componentes do admin).

### 1. Modelos Prisma (novos — NÃO alterar o model `Message` existente)

Em `prisma/schema.prisma` adicione:

```prisma
model WhatsAppConversation {
  id               String   @id @default(cuid())
  waPhone          String   @unique // E.164 sem "+", como vem no webhook (msg.from)
  displayName      String?  // profile.name do webhook, quando disponível
  patientProfileId String?  // vínculo opcional com PatientProfile por telefone
  status           String   @default("open") // open | closed
  assignedToUserId String?  // atendente responsável (opcional)
  unreadCount      Int      @default(0)
  lastMessageAt    DateTime @default(now())
  lastInboundAt    DateTime? // para calcular a janela de 24h
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  messages         WhatsAppMessage[]

  @@index([status, lastMessageAt])
  @@index([assignedToUserId])
}

model WhatsAppMessage {
  id             String   @id @default(cuid())
  conversationId String
  conversation   WhatsAppConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  direction      String   // inbound | outbound
  waMessageId    String?  @unique // wamid da Meta — dedupe de webhooks reentregues
  type           String   @default("text") // text | image | audio | document | template | unsupported
  body           String?  @db.Text
  mediaId        String?  // id de mídia da Meta (download sob demanda, não armazenar arquivo)
  status         String   @default("received") // received | sent | delivered | read | failed
  errorDetail    String?
  sentByUserId   String?  // qual admin enviou (outbound)
  sentByName     String?  // snapshot do nome para exibição
  createdAt      DateTime @default(now())

  @@index([conversationId, createdAt])
}
```

Crie migration (`prisma migrate dev --name whatsapp_inbox`).

### 2. Ingestão no webhook

Em `src/lib/whatsapp-webhook-events.ts`, dentro de `processWhatsAppWebhookEvents` (mantendo o `logWhatsAppDelivery` atual e sem quebrar o forward para Chatwoot):

- **Mensagens inbound** (`value.messages`): upsert de `WhatsAppConversation` por `waPhone` (= `msg.from`), capturando `value.contacts[0].profile.name` como `displayName`. Criar `WhatsAppMessage` inbound com dedupe por `waMessageId` (se já existe, ignorar — Meta reentrega webhooks). Suportar `text` (body), `image`/`audio`/`document` (salvar `mediaId` e caption se houver) e demais tipos como `unsupported` com body descritivo. Atualizar `lastMessageAt`, `lastInboundAt`, incrementar `unreadCount` e reabrir conversa (`status = "open"`) se estava fechada.
- **Vínculo com paciente**: ao criar a conversa, tentar localizar `PatientProfile` cujo telefone normalizado (use `normalizeWhatsAppPhone`) bata com `waPhone`; se achar, preencher `patientProfileId`.
- **Statuses** (`value.statuses`): além do log atual, atualizar `WhatsAppMessage.status` do outbound correspondente (busca por `waMessageId = st.id`), gravando `errorDetail` quando `failed`.
- Todo o processamento deve ser tolerante a falha (try/catch por item) — o webhook deve continuar respondendo 200 rápido.

### 3. Envio de texto livre

Em `src/lib/whatsapp.ts`, adicione:

```ts
export async function sendWhatsAppText(opts: { toPhone: string; body: string }): Promise<{ ok: boolean; waMessageId?: string; error?: string }>
```

POST em `https://graph.facebook.com/${WHATSAPP_GRAPH_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages` com `{ messaging_product: "whatsapp", to, type: "text", text: { body } }`. Seguir o mesmo padrão de erro/log das funções existentes no arquivo (incluindo `logWhatsAppDelivery`).

### 4. Rotas de API (todas com `getAdminSession()`; 403 se ausente)

- `GET /api/admin/whatsapp/conversations` — lista paginada, filtros `status` (open/closed/all), `assigned` (me/unassigned/all) e busca por telefone/nome. Retornar última mensagem, `unreadCount`, nome do paciente vinculado se houver.
- `GET /api/admin/whatsapp/conversations/[id]/messages` — mensagens paginadas (mais recentes primeiro, cursor por `createdAt`). Ao buscar, zerar `unreadCount`.
- `POST /api/admin/whatsapp/conversations/[id]/messages` — body `{ text }`. Validar janela de 24h: se `lastInboundAt` for null ou > 24h atrás, retornar 422 com código `outside_24h_window` (a UI explica que só template pode ser enviado). Dentro da janela: chamar `sendWhatsAppText`, persistir `WhatsAppMessage` outbound com `waMessageId`, `sentByUserId`/`sentByName` da sessão, `status: "sent"`; atualizar `lastMessageAt`. Se o envio falhar, persistir com `status: "failed"` e retornar o erro.
- `PATCH /api/admin/whatsapp/conversations/[id]` — body parcial `{ status?, assignedToUserId? }` (fechar/reabrir, assumir/atribuir conversa; `assignedToUserId: null` desatribui).
- Registrar `AuditLog` (padrão existente do projeto) nas ações de envio e mudança de status/atribuição — dados de saúde, LGPD.

### 5. UI — `/admin/mensagens`

Nova página `src/app/(dashboard)/admin/mensagens/page.tsx` (server component com guard, no padrão das outras páginas admin) + client component:

- **Layout duas colunas** (empilhado no mobile): esquerda lista de conversas (avatar/iniciais, nome ou telefone, prévia da última mensagem, horário, badge de não lidas, badge do atendente atribuído); direita o chat da conversa selecionada.
- **Chat**: bolhas inbound/outbound; nas outbound mostrar `sentByName` e status (✓ enviado, ✓✓ entregue, azul lido, erro em vermelho com detalhe); mídia inbound exibida como chip "Imagem/Áudio/Documento" (sem download nesta fase). Composer de texto com envio por Enter. Se fora da janela de 24h, desabilitar composer com aviso explicando a regra e que é preciso template aprovado.
- **Ações no header do chat**: assumir conversa ("Atribuir a mim"), fechar/reabrir, link para o paciente vinculado (`/admin/patients/...`) quando houver.
- **Filtros** na lista: Abertas / Minhas / Não atribuídas / Fechadas + busca.
- **Atualização**: polling leve (ex.: `setInterval` 10s na lista e 5s na conversa aberta, com cleanup). Não introduzir websockets nesta fase.
- **Multiatendente**: sem lock de conversa — todos os ADMIN veem tudo; a atribuição é organizacional, não restritiva.

### 6. Navegação + i18n

- Adicionar entrada "Mensagens" (`/admin/mensagens`, ícone `MessageCircle` do lucide) no grupo adequado de `ADMIN_NAV_GROUPS` em `src/lib/platform-nav-registry.ts` e o card correspondente em `AdminHomeClient.tsx`, seguindo o padrão dos itens existentes.
- Criar a chave `nav.adminMessages` (e demais strings novas da tela) em **todos os idiomas** de `src/lib/i18n/translations.ts`. Rodar `npm run check:i18n` para validar.

### 7. Restrições e verificação

- Não alterar o comportamento atual do webhook para Chatwoot nem as funções de template existentes.
- Não armazenar binários de mídia nesta fase.
- Rodar `npm run typecheck` e `npm run lint` ao final.
- Teste manual esperado: mensagem enviada de um celular ao número registrado → aparece em `/admin/mensagens` → dois usuários ADMIN diferentes conseguem responder → respostas chegam no celular → statuses (entregue/lido) atualizam nas bolhas.

---

## Notas para depois (fora deste prompt)

- **Fora da janela de 24h**: fase 2 — botão "Enviar template" no composer usando um template utility aprovado (ex.: reengajamento) via `WHATSAPP_*_TEMPLATE`.
- **Mídia**: fase 2 — download de mídia via Graph (`/media/{id}`) com proxy autenticado.
- **Chatwoot**: se o inbox nativo atender bem, o forward (`CHATWOOT_WHATSAPP_FORWARD_*`) pode ser desativado para evitar resposta duplicada por dois sistemas.
- **Meta**: garantir que o webhook em produção esteja inscrito no campo `messages` do app (não só `message_status`).
