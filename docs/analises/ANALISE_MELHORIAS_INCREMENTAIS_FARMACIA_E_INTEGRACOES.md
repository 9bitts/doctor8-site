# Análise — Melhorias incrementais (manter estrutura, corrigir falhas)

**Data:** 12 de julho de 2026  
**Princípio:** não reestruturar o monólito; corrigir lacunas nos fluxos existentes reutilizando libs e padrões já adotados (`audit.ts`, `stripe-refund.ts`, `verifyQStashSignature`, templates em `whatsapp.ts`, `handleConsultationFulfillmentError`).

**Escopo desta rodada:** farmácia marketplace + integrações (QStash emissions, WhatsApp loja). Fluxos maduros (consultas, humanitário, prontuário) **não devem ser alterados**.

---

## Diagnóstico resumido

| Área | Estado | Ação |
|------|--------|------|
| Consultas / Stripe / refund | Maduro | Não tocar |
| Humanitário / WhatsApp templates | Maduro | Só config Railway (M2) |
| Farmácia marketplace | Código existe, bugs P0 | Corrigir em lotes |
| QStash emissions | Middleware bloqueia + auth fraca | Patch mínimo |
| WhatsApp farmácia | Texto livre (anti-padrão) | Alinhar com `whatsapp.ts` |

---

## Ordem de execução (lotes independentes)

Execute no Cursor **um lote por sessão**, na ordem abaixo. Cada lote tem critério de aceite e não deve refatorar arquivos fora do escopo.

---

## Lote 1 — Dispensação segura (P0, sem migration)

**Problema:** `POST /api/pharmacy-store/prescriptions/validate` marca `DISPENSED` sem checar pagamento, assinatura ou validade.

### Prompt para o Cursor

```
Contexto: Next.js + Prisma. Manter estrutura atual de farmácia — NÃO criar novos
módulos nem mudar schema. Apenas endurecer validações em rotas existentes.

Arquivo principal: src/app/api/pharmacy-store/prescriptions/validate/route.ts

1. No POST, ANTES da transação, carregar prescription completa (já parcialmente
   feito em rxFull) e validar:
   - signatureStatus === "SIGNED" → senão 400 "Receita não assinada digitalmente"
   - validUntil existe e validUntil >= now → senão 400 "Receita expirada"
   - Se row.pharmacyOrderId existir: buscar order e exigir status === "PAID"
     OU status em ["PAID","CONFIRMED","PREPARING","READY"] (dispensação só após
     pagamento; alinhar com regra de negócio: mínimo PAID)
   - Se não houver pharmacyOrderId (dispensação walk-in com token): permitir
     apenas se signatureStatus SIGNED + validUntil OK (fluxo OTC/token sem pedido
     online continua possível, mas receita deve estar assinada)

2. No GET (lookup), retornar campos já existentes — não mudar contrato JSON.

3. Audit log (padrão src/lib/audit.ts):
   - GET com token: audit.viewRecord(userId, "PharmacyPrescriptionToken", row.id)
   - POST dispensação: audit.updateRecord(userId, "PharmacyPrescriptionToken", row.id,
     { orderId, pharmacyStoreId, prescriptionId })
   - Usar .catch(console.error) no audit para não quebrar request (padrão HIPAA)

4. Em src/app/api/patient/pharmacy/orders/route.ts (POST):
   - Ao criar pedido com prescriptionId, rejeitar 400 se rx.signatureStatus !== "SIGNED"
   - Rejeitar 400 se validUntil < now
   - Manter resto do fluxo igual (quote, token link, PENDING_PAYMENT)

5. Script de verificação (padrão do repo):
   Criar scripts/verify-pharmacy-dispense-guards.ts que documenta as regras
   (pode ser teste estático lendo arquivos ou teste de integração leve).
   Adicionar em package.json: "test:pharmacy-dispense-guards": "tsx scripts/..."

Critério de aceite:
- Pedido PENDING_PAYMENT não pode ser dispensado (POST validate → 400)
- Receita unsigned ou expirada não pode gerar pedido nem ser dispensada
- Audit log chamado em GET e POST validate
- Nenhuma mudança de schema Prisma
```

---

## Lote 2 — QStash emissions deliver (P0, 2 arquivos)

**Problema:** QStash agenda POST em `/api/emissions/deliver`, mas middleware retorna 401; handler pula assinatura se chave ausente.

### Prompt para o Cursor

```
Contexto: alinhar /api/emissions/deliver ao padrão de /api/reminders/send.

1. src/middleware.ts — isPublicApi():
   Adicionar: pathname.startsWith("/api/emissions/deliver")
   (ou "/api/emissions/" se houver só deliver — preferir path exato)

2. src/app/api/emissions/deliver/route.ts:
   - Remover Receiver local duplicado
   - Importar verifyQStashSignature de @/lib/qstash
   - No início do POST: const rawBody = await req.text()
   - Se !(await verifyQStashSignature(req, rawBody)) → 401
   - Parse JSON do rawBody (não chamar req.json() antes do verify)
   - Manter lógica deliverEmissionToPatient e logQStashJob intacta

3. NÃO alterar EmissionPostSaveFlow nem qstash-emission.ts (URLs corretas).

Critério de aceite:
- Request sem upstash-signature → 401
- Request com assinatura inválida → 401
- Sem QSTASH_CURRENT_SIGNING_KEY → 401 (verifyQStashSignature retorna false)
- Fluxo profissional autenticado em /api/professional/emissions/deliver inalterado
```

---

## Lote 3 — Webhook Stripe farmácia: erros permanentes (P0)

**Problema:** `fulfillPharmacyOrderPayment` lança "Payment amount mismatch" / "patient mismatch" e webhook retenta infinitamente (consultas já têm `handleConsultationFulfillmentError`).

### Prompt para o Cursor

```
Contexto: src/app/api/payments/webhook/route.ts

1. Estender isPermanentFulfillmentError() para incluir mensagens de farmácia:
   - "Pharmacy order not found"
   - "Pharmacy order patient mismatch"
   - "Payment amount mismatch" (já existe para consulta — reutilizar)

2. No branch meta.type === "pharmacy_order" (~300-304), envolver
   fulfillPharmacyOrderPayment em try/catch:
   - Se isPermanentFulfillmentError(e): log [WEBHOOK-PERMANENT-FAIL], chamar
     refundPaymentIntentIdempotent(intent.id, "pharmacy_webhook_permanent_fail",
     { triggeredBy: "AUTO_WEBHOOK_FAIL", userId: pharmacyMeta.patientUserId })
     se payment intent succeeded, markEventFailed, throw WebhookReturn200
   - Se isTransientError(e): rethrow (retry Stripe)
   - NÃO copiar handleConsultationFulfillmentError inteiro — extrair helper mínimo
     handlePharmacyFulfillmentError se necessário, ou inline enxuto

3. Mesmo tratamento em fulfillPharmacyCheckoutSession nos eventos
   checkout.session.completed / async_payment_succeeded (wrap try/catch).

Critério de aceite:
- Mismatch de valor em pedido farmácia → refund automático + evento FAILED (não retry loop)
- Consultas e course_purchase inalterados
```

---

## Lote 4 — Cancelamento com reembolso (P1, migration aditiva)

**Problema:** PATCH status CANCELLED em pedido PAID não devolve dinheiro.

### Prompt para o Cursor

```
Contexto: reutilizar src/lib/stripe-refund.ts (refundPaymentIntentIdempotent).

1. prisma/schema.prisma — PaymentRefund:
   - Adicionar pharmacyOrderId String? opcional
   - Relation opcional PharmacyOrder @relation(...)
   - @@index([pharmacyOrderId])
   Migration aditiva apenas.

2. src/lib/stripe-refund.ts:
   - Estender RefundContext com pharmacyOrderId?: string
   - writeRefundAudit: persistir pharmacyOrderId quando presente

3. src/app/api/pharmacy-store/orders/[id]/route.ts PATCH:
   - Se novo status === "CANCELLED" e order.status era PAID (ou CONFIRMED/PREPARING/READY):
     - Se order.stripePaymentIntentId: await refundPaymentIntentIdempotent(...,
       "pharmacy_store_cancel", { triggeredBy: "OTHER", userId: order.patientUserId,
       pharmacyOrderId: order.id })
     - Atualizar status para CANCELLED só após tentativa de refund (refund nunca
       throws — padrão existente)
   - Impedir CANCELLED se status já COMPLETED (400)
   - Impedir transições inválidas simples: ex. COMPLETED → CONFIRMED (400)

4. src/lib/pharmacy-order-notify.ts — STATUS_PATIENT_COPY.CANCELLED:
   - Se refund ocorreu, incluir no email/notificação: "O reembolso foi iniciado
     automaticamente" (texto PT, sem i18n novo neste lote)

5. Script: scripts/verify-pharmacy-cancel-refund.ts (dry-run ou unit leve)

Critério de aceite:
- Loja cancela pedido PAID → Stripe refund disparado + PaymentRefund com pharmacyOrderId
- Pedido COMPLETED não pode ser cancelado
- Sem breaking change em refunds de consulta
```

---

## Lote 5 — WhatsApp farmácia: alinhar com templates (P1)

**Problema:** `sendStoreWhatsApp` em pharmacy-order-notify.ts usa type:text (viola política Meta).

### Prompt para o Cursor

```
Contexto: seguir padrão de src/lib/whatsapp.ts (templates, normalizeWhatsAppPhone,
logWhatsAppDelivery). NÃO remover e-mail/in-app — WhatsApp é canal adicional.

1. src/lib/whatsapp.ts:
   - Adicionar sendPharmacyOrderPaidStoreWhatsApp(opts: { phone, storeName,
     patientName, totalFormatted, fulfillmentLabel, ordersUrl, lang? })
   - Usar template utility aprovado na Meta (nome via env
     WHATSAPP_PHARMACY_ORDER_TEMPLATE, default sugerido:
     pharmacy_order_paid_store_v1 — documentar em .env.example)
   - Parâmetros: nome loja, paciente, total, modalidade, URL pedidos (truncar 256)
   - Reutilizar postWhatsAppMessage / logWhatsAppDelivery existentes

2. src/lib/pharmacy-order-notify.ts:
   - Remover sendStoreWhatsApp local
   - Chamar sendPharmacyOrderPaidStoreWhatsApp no notifyPharmacyOrderPaid
   - Descriptografar firstName/lastName do paciente se vierem criptografados
     (usar safeDecrypt padrão do projeto)

3. scripts/whatsapp-probe.mjs:
   - Remover phone number ID hardcoded; exigir WHATSAPP_PHONE_NUMBER_ID no env

4. .env.example:
   - Adicionar WHATSAPP_PHARMACY_ORDER_TEMPLATE=
   - Nota: template deve ser criado/aprovado na Meta Business antes de prod

Fallback: se template env vazio, skip WhatsApp (como hoje quando !isWhatsAppConfigured)
— NÃO voltar para type:text.

Critério de aceite:
- Nenhum type:"text" em notificações de pedido para loja
- Delivery log registrado em whatsAppDeliveryLog
- Probe script falha sem WHATSAPP_PHONE_NUMBER_ID
```

---

## Lote 6 — Estoque transacional (P1)

**Problema:** `stockQty` nunca decrementa na venda.

### Prompt para o Cursor

```
Contexto: decremento no momento do pagamento (fulfillPharmacyOrderPayment), não na
criação do pedido — evita reserva complexa neste lote.

1. src/lib/fulfill-pharmacy-order.ts — fulfillPharmacyOrderPayment:
   - Após validar amount, dentro de db.$transaction:
     a) Carregar order.items com pharmacyInventoryItemId
     b) Para cada item com pharmacyInventoryItemId, decrementar stockQty em 1
        (ou quantity se campo existir no item — ver schema PharmacyOrderItem)
     c) Se stockQty < 0 após decremento → throw Error("Insufficient stock for ...")
        (erro permanente para webhook — Lote 3 trata refund)
     d) Atualizar status PAID + paidAt na mesma transação
   - wasPending + notify fora da transaction (padrão atual)

2. NÃO alterar quote.ts neste lote (cotação continua best-effort).

3. Opcional: se item.quantity > 1 no schema, decrementar quantity; senão 1 por linha.

Critério de aceite:
- Pagamento confirmado reduz stockQty
- Estoque insuficiente → pagamento não confirma + refund via webhook (Lote 3)
- Pedido PENDING_PAYMENT não altera estoque
```

---

## Lote 7 — Correções P2 (baixo risco, mesmo padrão)

### Prompt para o Cursor

```
Melhorias pontuais — manter arquitetura:

1. src/lib/pharmacy-network/quote.ts:
   - Substituir constante 50 km por store.deliveryRadiusKm ?? 50 na filtragem
     geográfica (função que usa distanceKm / geocodeCep)

2. src/app/api/patient/pharmacy/orders/route.ts:
   - Antes de sobrescrever pharmacyPrescriptionToken.pharmacyOrderId, verificar
     se já existe pedido ativo (status NOT IN [COMPLETED, CANCELLED]) para mesma
     prescription → 409 "Já existe pedido em andamento para esta receita"

3. src/app/api/pharmacist/pharmacy-network/queue/route.ts (se existir):
   - Descriptografar firstName/lastName com decrypt() + safeDecrypt

4. src/lib/whatsapp-webhook.ts:
   - Trocar: if (!secret) return process.env.NODE_ENV !== "production"
   - Por: if (!secret) return false (rejeitar POST sem assinatura sempre)
   - GET challenge Meta continua usando WHATSAPP_WEBHOOK_VERIFY_TOKEN

5. src/lib/whatsapp-webhook-events.ts:
   - Não persistir texto completo de inbound message; guardar só
     { hasText: true, length: N } ou hash — sem PHI em log

Critério de aceite:
- deliveryRadiusKm respeitado na cotação
- Segundo pedido na mesma receita bloqueado se anterior ativo
- Webhook WhatsApp rejeita POST sem secret em todos os ambientes
```

---

## Lote 8 — E2E farmácia (opcional, após Lotes 1–4)

### Prompt para o Cursor

```
Criar e2e/pharmacy-marketplace.spec.ts (Playwright):
- Requer seed ou mock de farmácia + estoque + receita assinada
- Fluxo mínimo: criar pedido → simular PAID (ou mock Stripe) → validar que
  validate POST falha antes de PAID e succeeds após PAID
- Seguir padrão de e2e/payments.spec.ts e e2e/security-audit.spec.ts
- Adicionar ao workflow e2e.yml se estável

Não bloquear deploy dos lotes 1–7 se E2E for flaky — marcar @slow se necessário.
```

---

## O que NÃO fazer nesta rodada

- Não dividir o monólito em microserviços
- Não unificar os 11 roles / refatorar middleware global
- Não mudar fluxo humanitário, consultas, Lacuna, SMART FHIR
- Não ativar `PHARMACY_MARKETPLACE_ENABLED=true` em prod até Lotes 1–4 em produção
- Não reescrever `quote.ts` matching de medicamentos (risco alto; lote futuro)

---

## Checklist pós-deploy

| Verificação | Como |
|-------------|------|
| Dispensação bloqueada sem pagamento | Script `test:pharmacy-dispense-guards` |
| QStash emissions | Admin → Integrações → QStash stats; teste manual retry |
| Refund cancelamento | Stripe dashboard + tabela PaymentRefund |
| WhatsApp loja | Admin probe + template Meta aprovado |
| Estoque | Inventário farmácia antes/depois pedido teste |

---

## Atualizar após cada lote

Marcar item correspondente em `docs/IMPROVEMENTS.md` como concluído quando o lote for mergeado.
