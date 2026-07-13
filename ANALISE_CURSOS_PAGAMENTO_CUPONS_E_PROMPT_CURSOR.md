# Análise ponta a ponta — Cursos Doctor8 (`/cursos`) + Prompt para o Cursor

**Data:** 13/07/2026
**Escopo:** Fluxo do criador de cursos, fluxo do aluno, e sistema de pagamento/monetização.
**Regras deste Cowork:** não codar aqui — apenas analisar e gerar o prompt para o Cursor.

**Decisões definidas por você:**
- Liberação grátis para apresentação → via **sistema de cupons** (100% desconto), que também serve para marketing.
- Repasse ao instrutor → **automático via Stripe Connect**, com **comissão Doctor8 de 15%**.

---

## 1. O que já existe hoje (diagnóstico)

Boa notícia: o módulo de cursos já está **bem construído** e a maior parte do fluxo funciona. O sistema de pagamento **já existe** (Stripe, com cartão, Pix e boleto). Não é preciso criar do zero — é preciso **ajustar comissão, ligar o repasse automático e adicionar cupons**.

### 1.1 Fluxo do criador (quem coloca o curso) — FUNCIONA

1. **Autorização do instrutor** — Admin vai em `/admin/courses`, cola o `userId` do profissional no bloco "Instrutores parceiros" e clica em **Liberar** (`PUT /api/admin/users/[id]/course-creator` → grava `courseCreatorApproved`). ✅
2. **Criação do curso** — Instrutor aprovado acessa `/professional/courses/new`, preenche título, descrição, profissão, especialidade, preço, carga horária, thumbnail e módulos/aulas. Upload de vídeo e capa via URLs pré-assinadas de S3. (`POST /api/courses/creator`). ✅
3. **Enviar para revisão** — Na lista `/professional/courses`, o curso em `DRAFT` tem o botão "Enviar para revisão" (`PATCH .../creator/[id]` → `PENDING_REVIEW`). ✅
4. **Aprovação/publicação** — Admin vê todos em `AdminCoursesClient` e faz `PATCH /api/admin/courses/[id]` → `PUBLISHED` / `REJECTED` (com motivo) / `ARCHIVED`. ✅

### 1.2 Fluxo do aluno (quem assiste) — FUNCIONA

1. **Vitrine** — `/cursos` (`GET /api/courses`) lista só publicados, com filtro por profissão e busca. ✅
2. **Página do curso** — `/cursos/[slug]` (`GET /api/courses/[slug]`) mostra módulos, aulas de preview (streaming só para preview ou matriculados via URL assinada), preço e benefício Doctor Connection. ✅
3. **Matrícula/compra** (`POST /api/courses/checkout`):
   - **Curso grátis** (`priceCents = 0`) → matrícula imediata, `source = FREE`. ✅
   - **Doctor Connection** → resgate de 1 curso grátis por mês (`source = DOCTOR_CONNECTION`, controle por `periodMonth`). ✅
   - **Curso pago** → Stripe Checkout (cartão/Pix/boleto). ✅
4. **Confirmação de pagamento** — `POST /api/payments/webhook` trata `checkout.session.completed` / `payment_intent.succeeded` / `async_payment_succeeded`, com **deduplicação idempotente** (`ProcessedStripeEvent`) e tratamento de falhas. Chama `fulfillCoursePurchase` → cria `CoursePurchase` + `CourseEnrollment`. ✅ (webhook robusto)
5. **Assistir** — `/professional/courses/learn/[enrollmentId]` (`CoursePlayerClient`) com progresso por aula (`CourseLessonProgress`, `progressPercent`). ✅
6. **Certificado** — Emitido ao concluir; verificação pública em `/cursos/certificado/[code]`. ✅

### 1.3 Modelo de dados (Prisma) — já preparado

Modelos existentes: `Course`, `CourseModule`, `CourseLesson`, `CourseEnrollment`, `CoursePurchase`, `CourseCertificate`, `CourseLessonProgress`, `CourseConnectionRedemption`. O `CoursePurchase` já tem `platformFeeCents`, `instructorPayoutCents`, `stripePaymentIntentId`, `stripeCheckoutSessionId`. O enum `CourseEnrollmentSource` já inclui `PURCHASE`, `DOCTOR_CONNECTION`, `FREE`, `ADMIN`.

---

## 2. Problemas e lacunas encontrados

| # | Área | Problema | Impacto |
|---|------|----------|---------|
| **G1** | Repasse | O checkout do curso **cobra 100% para a conta da plataforma**. `instructorPayoutCents` é só **registrado no banco** — não há transferência automática. Não usa `transfer_data`/`application_fee`. | Instrutor não recebe automaticamente. |
| **G2** | Comissão | `commissionPercent` default = **30%** (schema + `COURSE_PLATFORM_COMMISSION_PERCENT`). Você quer **15%**. | Split errado. |
| **G3** | Grátis p/ demo | Não existe forma de liberar um curso **pago** de graça para um aluno específico. `FREE` só funciona se o curso inteiro custa 0. O enum `ADMIN` existe mas **não é usado** por nenhum endpoint. | Sem como fazer apresentação sem cobrar. → **Resolver com cupons.** |
| **G4** | Connect | Não há checagem de que o instrutor concluiu o onboarding do **Stripe Connect** antes de publicar/vender. `stripeConnectAccountId` existe no profile, mas o checkout de curso o ignora. | Venda sem conta de destino → não dá para repassar. |
| **G5** | UX admin | Autorizar instrutor exige colar `userId` na mão; não há busca por email nem lista de solicitações/pendentes. | Operacional trabalhoso (menor prioridade). |
| **G6** | Edição | Curso `PUBLISHED` não pode ser editado ("contate o suporte"). Sem fluxo de correção pós-publicação. | Rígido (menor prioridade). |

---

## 3. O que será implementado (resumo do plano)

1. **Comissão 15%** (G2): trocar default e env.
2. **Repasse automático via Stripe Connect** (G1, G4): checkout de curso com `payment_intent_data.transfer_data.destination` + `application_fee_amount` (15%); exigir Connect ativo do instrutor antes de publicar/vender.
3. **Sistema de cupons** (G3): novo modelo `CourseCoupon` + `CourseCouponRedemption`, painel admin para criar/listar/desativar, aplicação no checkout. Cupom de **100% = matrícula grátis** direta (sem Stripe), com `source = ADMIN`/`COUPON`.
4. **Ajustes de UX admin** (G5) e nota sobre edição (G6) — incluídos como itens opcionais no prompt.

O prompt abaixo já está pronto para colar no Cursor.

---

# 4. PROMPT PARA O CURSOR (copie a partir daqui)

> Cole tudo o que está entre as linhas no Cursor. Está escrito para o Cursor executar de fato a implementação.

---

**Contexto:** App Next.js (App Router) + Prisma + Stripe, projeto Doctor8. O módulo de cursos já existe e funciona (vitrine `/cursos`, criação em `/professional/courses`, admin em `/admin/courses`, checkout em `src/app/api/courses/checkout/route.ts`, webhook em `src/app/api/payments/webhook/route.ts`, fulfill em `src/lib/fulfill-course-purchase.ts`, acesso em `src/lib/courses/access.ts`, Connect em `src/lib/stripe-connect.ts`). **Não recrie o que já existe** — apenas implemente as mudanças abaixo. Mantenha o padrão de código, validação com `zod`, respostas `NextResponse.json`, e mensagens de UI em português.

Implemente as 3 features a seguir, com migração Prisma, testes e sem quebrar os fluxos existentes (curso grátis, Doctor Connection, compra paga).

## FEATURE 1 — Comissão da plataforma = 15%

1. Em `prisma/schema.prisma`, no model `Course`, altere `commissionPercent Int @default(30)` para `@default(15)`.
2. Em `src/lib/courses/access.ts`, altere `DEFAULT_PLATFORM_COMMISSION_PERCENT` para usar default `"15"` quando a env não estiver setada.
3. Atualize `.env.example` (e comente no `.env`) `COURSE_PLATFORM_COMMISSION_PERCENT=15`.
4. Crie uma migração Prisma. **Não** altere retroativamente cursos já existentes que tenham `commissionPercent` diferente — apenas o default para novos. (Se houver cursos de teste com 30, deixe um script opcional comentado para atualizá-los.)

## FEATURE 2 — Repasse automático ao instrutor via Stripe Connect

Objetivo: quando um aluno paga um curso, o instrutor recebe automaticamente (valor - 15%) na conta Connect dele, e a Doctor8 fica com os 15% via `application_fee_amount`.

1. **Exigir Connect antes de vender/publicar:**
   - Reaproveite `src/lib/stripe-connect.ts` (`getStripeConnectStatusForProfile` / `getStripeConnectStatusForAccountId`). O instrutor é o `course.instructorUserId`; a conta fica no profile do instrutor (`stripeConnectAccountId`).
   - No endpoint de aprovação/publicação do admin (`src/app/api/admin/courses/[id]/route.ts`), ao mudar status para `PUBLISHED`, verifique se o instrutor tem Connect `active`. Se **não** tiver, bloqueie a publicação com erro claro em PT (ex.: "O instrutor precisa concluir o cadastro de recebimentos (Stripe Connect) antes de publicar."). Só publique quando `active`.
   - Respeite `isStripeConnectEnabled()`: se o Connect estiver **desligado** por env (`STRIPE_CONNECT_ENABLED` != true), NÃO bloqueie a publicação e mantenha o comportamento atual (fundos ficam na plataforma, `instructorPayoutCents` apenas registrado). Assim o deploy continua seguro.

2. **Checkout com split** (`src/app/api/courses/checkout/route.ts`, ramo de curso pago):
   - Busque também `instructorUserId` e `commissionPercent` do curso.
   - Se `isStripeConnectEnabled()` e o instrutor tiver conta Connect `active`, calcule `application_fee_amount = round(finalAmountCents * commissionPercent / 100)` e passe no `stripe.checkout.sessions.create`:
     ```
     payment_intent_data: {
       application_fee_amount: applicationFeeCents,
       transfer_data: { destination: instructorStripeConnectAccountId },
     }
     ```
   - Se o Connect estiver desligado, mantenha o checkout atual sem `transfer_data` (comportamento de hoje).
   - Mantenha `metadata.kind = "course_purchase"`, `userId`, `courseId`, `courseSlug` e adicione `commissionPercent` no metadata para o fulfill usar o mesmo valor.

3. **Fulfill** (`src/lib/fulfill-course-purchase.ts`): já calcula e grava `platformFeeCents`/`instructorPayoutCents`. Garanta que use o `commissionPercent` do curso (já usa). Não precisa mover dinheiro aqui — o split já acontece no Stripe via `transfer_data`. Apenas confirme que os valores gravados batem com o `application_fee_amount` cobrado.

4. **Onboarding Connect do instrutor:** confirme que existe (ou crie, reusando `createOrResumeConnectOnboarding` de `stripe-connect.ts`) um ponto na área do profissional (`/professional/financeiro` ou `/professional/courses`) onde o instrutor inicia/retoma o cadastro Connect e vê o status ("Recebimentos ativos" / "Cadastro pendente"). Se já existir para consultas, apenas reутilize e mostre também na área de cursos.

## FEATURE 3 — Sistema de cupons (desconto e liberação grátis)

Objetivo: gerar códigos de cupom. Cupom de **100% = matrícula grátis** (para demonstração/marketing, sem passar pelo Stripe). Cupons parciais reduzem o valor no checkout.

1. **Schema (`prisma/schema.prisma`):**
   ```prisma
   enum CouponDiscountType {
     PERCENT
     FIXED
   }

   model CourseCoupon {
     id            String   @id @default(cuid())
     code          String   @unique            // guardar em UPPERCASE
     description   String?
     discountType  CouponDiscountType @default(PERCENT)
     discountValue Int                          // PERCENT: 1..100 ; FIXED: centavos
     courseId      String?                      // null = vale para qualquer curso
     course        Course?  @relation(fields: [courseId], references: [id], onDelete: Cascade)
     maxRedemptions Int?                        // null = ilimitado
     redemptionCount Int    @default(0)
     expiresAt     DateTime?
     active        Boolean  @default(true)
     createdBy     String
     createdAt     DateTime @default(now())
     redemptions   CourseCouponRedemption[]

     @@index([courseId])
   }

   model CourseCouponRedemption {
     id           String   @id @default(cuid())
     couponId     String
     coupon       CourseCoupon @relation(fields: [couponId], references: [id], onDelete: Cascade)
     userId       String
     courseId     String
     enrollmentId String?  @unique
     amountOffCents Int
     redeemedAt   DateTime @default(now())

     @@unique([couponId, userId])   // 1 uso por usuário por cupom
     @@index([userId])
   }
   ```
   - Adicione a relação inversa `coupons CourseCoupon[]` no model `Course`.
   - Adicione `COUPON` ao enum `CourseEnrollmentSource`.
   - Crie a migração.

2. **Validação de cupom (novo lib `src/lib/courses/coupons.ts`):**
   - `validateCoupon(code, courseId, userId, priceCents)` → retorna `{ valid, reason?, coupon?, amountOffCents, finalCents }`.
   - Regras: existe, `active`, não expirado (`expiresAt`), não estourou `maxRedemptions`, `courseId` bate (ou é global), usuário ainda não resgatou (`@@unique`), curso está `PUBLISHED`.
   - `PERCENT`: `amountOff = round(priceCents * value/100)`. `FIXED`: `amountOff = min(value, priceCents)`. `finalCents = max(0, priceCents - amountOff)`.

3. **Endpoint de validação (preview) `GET /api/courses/coupons/validate?code=&courseId=`:** autenticado; retorna o preview de desconto para a UI mostrar o novo preço antes de confirmar. Nunca vaza dados sensíveis do cupom.

4. **Checkout (`src/app/api/courses/checkout/route.ts`):** aceite `couponCode?: string` no schema.
   - Se enviado, valide com `validateCoupon`. Se inválido → 400 com motivo em PT.
   - Se `finalCents === 0` (cupom 100% ou fixo ≥ preço): **matricule direto** sem Stripe — crie `CourseEnrollment` com `source = "COUPON"`, crie `CourseCouponRedemption` (com `amountOffCents = priceCents`, `enrollmentId`), incremente `redemptionCount` **de forma atômica dentro de uma transação** para evitar corrida, e dispare `sendCourseEnrollmentEmail`. Retorne `{ enrollmentId, free: true, coupon: true }`.
   - Se `finalCents > 0`: crie o Stripe Checkout usando `finalCents` como `unit_amount`. Recalcule `application_fee_amount` sobre `finalCents` (15%). Coloque `couponId` no `metadata` para o fulfill registrar a redenção após o pagamento e incrementar `redemptionCount` (dentro do fulfill, idempotente).
   - Trave o resgate na transação para respeitar `maxRedemptions` e o `@@unique([couponId, userId])`.

5. **Fulfill (`src/lib/fulfill-course-purchase.ts`):** se `metadata.couponId` presente, crie o `CourseCouponRedemption` ligado ao `enrollment` e incremente `redemptionCount` — tudo idempotente (não duplicar se o webhook reprocessar).

6. **Painel admin de cupons:**
   - API: `src/app/api/admin/coupons/route.ts` (`GET` lista, `POST` cria) e `src/app/api/admin/coupons/[id]/route.ts` (`PATCH` ativar/desativar, `DELETE`). Protegido por `getAdminSession()`. Valide com `zod`. Normalize `code` para UPPERCASE e cheque unicidade.
   - UI: componente `AdminCouponsClient.tsx` e adicione uma seção na página `/admin/courses` (junto de `AdminCourseCreatorGrant` e `AdminCoursesClient`), com formulário (código — ou botão "gerar código aleatório", tipo, valor, curso opcional via dropdown dos cursos publicados, limite de usos, validade) e tabela dos cupons existentes (código, desconto, curso, usos/limite, validade, ativo, ações desativar/excluir). Mensagens em PT.

7. **UI do aluno:** em `CourseDetailClient.tsx`, adicione campo "Tem um cupom?" com botão **Aplicar**, que chama o endpoint de validação e mostra o preço com desconto (ou "Curso liberado gratuitamente com este cupom"). Passe `couponCode` no `POST /api/courses/checkout`. Se voltar `coupon: true / free: true`, redirecione para `/professional/courses/learn/{enrollmentId}`.

## Itens opcionais (fazer se sobrar tempo, não bloqueiam o principal)

- **G5:** em `AdminCourseCreatorGrant`, permitir buscar o profissional por **email** (não só `userId`), retornando o `userId` para liberar.
- **G6:** permitir edição limitada de curso `PUBLISHED` (ex.: corrigir descrição/aulas) sem exigir suporte, mantendo bloqueio de alteração de preço quando houver matrículas pagas.

## Regras gerais / qualidade

- Crie/rode as migrações Prisma e `prisma generate`.
- Tudo em transações onde há contagem/limite (cupom, redenção) para evitar condições de corrida.
- Idempotência no webhook/fulfill (não duplicar matrícula nem redenção se o evento reprocessar).
- Não quebrar: curso grátis (`priceCents=0`), Doctor Connection e compra normal com cartão/Pix/boleto.
- Adicione testes (Vitest/Playwright conforme o padrão do repo) para: cupom 100% → matrícula sem Stripe; cupom parcial → checkout com `finalCents` e fee de 15%; cupom expirado/esgotado/duplicado → erro; publicação bloqueada sem Connect ativo (quando `STRIPE_CONNECT_ENABLED=true`).
- Rode `lint`/typecheck e ajuste o `.env.example`.

**Entregue:** lista dos arquivos criados/alterados, o comando de migração, e um resumo de como testar cada feature manualmente.

---

## 5. Resumo executivo (para você)

O `/cursos` **já funciona** de ponta a ponta para os dois lados — inclusive o pagamento por Stripe (cartão/Pix/boleto), matrícula, progresso e certificado. Faltam três coisas, todas cobertas no prompt acima: (1) baixar a comissão de 30% para **15%**, (2) **ligar o repasse automático** ao instrutor via Stripe Connect (hoje o valor dele é só registrado, não transferido), e (3) criar o **sistema de cupons** — que resolve sua necessidade de liberar cursos grátis para apresentação (cupom 100%) e ainda serve de ferramenta de marketing depois.

Ponto de atenção operacional: para o repasse automático funcionar, cada instrutor precisa concluir o cadastro no **Stripe Connect**; o prompt já pede para bloquear a publicação enquanto isso não estiver ativo (com uma trava por env para não travar o deploy).
