# Prompt para Cursor — Melhorias nos fluxos voluntário agendado (P8b) e fila humanitária JIT

> Copie tudo abaixo da linha para o Cursor.

---

## Contexto

Este projeto Next.js (App Router + Prisma + Daily.co) tem dois fluxos gratuitos distintos:

1. **Fila humanitária JIT (SOS Venezuela)** — `/humanitarian/[slug]`, modelo `HumanitarianQueueEntry`, atendimento por ordem de chegada, sem `Appointment`.
2. **Atendimento voluntário agendado (P8b)** — `/patient/volunteer-appointments`, modelo `Appointment` com `bookingSource = "volunteer_scheduled"`, slots definidos em `volunteerBlocks` (JSON em `ProfessionalProfile.availability`).

Existe uma auditoria completa em `AUDITORIA_ATENDIMENTO_VOLUNTARIO_AGENDADO.md` na raiz do repo — **leia-a antes de começar**; os IDs AGD-XX abaixo referem-se a ela.

## Regras invioláveis (sistema em produção)

- **Zero breaking changes.** Nenhuma alteração pode quebrar agendamentos existentes, filas ativas ou o fluxo pago.
- Migrações Prisma **apenas aditivas** (novos índices/campos opcionais). Nunca dropar coluna, renomear campo ou alterar enum existente de forma destrutiva.
- Antes de criar índice único (Fase 1, item 3), rodar query de verificação de duplicatas existentes e tratar/reportar antes de aplicar.
- Comportamentos novos visíveis ao usuário devem ser retrocompatíveis; onde houver dúvida, preferir aviso/bloqueio suave a cancelamento automático.
- Não tocar no fluxo de pagamento (Stripe) nem no booking pago.
- Após cada fase: `tsc`, lint e testes existentes passando. Adicionar testes para cada correção.
- Trabalhar **uma fase por vez**, em commits pequenos e revisáveis. Pare ao fim de cada fase e resuma o que mudou.

---

## FASE 1 — Integridade de booking (crítico)

### 1. AGD-19 (ALTO) — Reagendamento não valida slot voluntário
`src/app/api/appointments/[id]/reschedule/route.ts` (~57-78) aceita qualquer `newScheduledAt` ISO, sem validar que o novo horário está num bloco voluntário. Paciente pode mover consulta gratuita para horário pago ou fora da agenda.
**Corrigir:** quando `bookingSource === "volunteer_scheduled"`, reutilizar `assertScheduledVolunteerSlotBooking` (`src/lib/volunteer-slot-booking.ts`) e a mesma verificação anti-conflito transacional usada no create.

### 2. AGD-07 (MÉDIO) — Validação de slot fora da transação (TOCTOU)
`src/app/api/appointments/volunteer-book/route.ts` valida o slot **antes** da transação em `src/lib/fulfill-consultation.ts` (~196-237). Entre a validação e o insert, o bloco pode ser removido.
**Corrigir:** revalidar o slot voluntário **dentro** da transação `Serializable`, antes do `create`.

### 3. AGD-06 (MÉDIO) — Sem constraint única no banco
Anti-double-booking existe só na aplicação. **Corrigir:** migração aditiva com índice único parcial em `Appointment (professionalId, scheduledAt)` para `status IN ('CONFIRMED','PENDING')` (raw SQL na migração, já que Prisma não suporta partial unique nativamente). Verificar duplicatas antes de aplicar.

---

## FASE 2 — Disponibilidade e ciclo de vida

### 4. AGD-01 (ALTO) — Remover bloco voluntário órfã agendamentos confirmados
Em `src/app/api/professional/availability/route.ts` (~105-140), salvar `volunteerBlocks` substitui o JSON sem checar `Appointment` futuros `volunteer_scheduled`. A consulta permanece `CONFIRMED` mas "some" da grade — paciente e profissional não são avisados.
**Corrigir:**
- No PUT, detectar agendamentos futuros dentro dos blocos removidos.
- Se houver: retornar 409 com a lista de consultas afetadas; o front (`AvailabilitySettings.tsx`) mostra modal exigindo que o profissional escolha: manter o bloco, ou confirmar remoção com **cancelamento explícito + notificação** (in-app e e-mail) ao paciente.
- Nunca cancelar silenciosamente.

### 5. AGD-17 (MÉDIO) — `NO_SHOW` nunca usado; auto-`COMPLETED` sem presença
`post-consult-notes.ts` promove `CONFIRMED → COMPLETED` 15 min após o fim sem verificar presença. **Corrigir:** registrar join de cada parte (evento no GET `/api/appointments/[id]/video` quando token é emitido dentro da janela, ou webhook Daily se já configurado). Se ninguém entrou, transicionar para `NO_SHOW` em vez de `COMPLETED`. Campo aditivo (ex.: `patientJoinedAt`, `professionalJoinedAt` opcionais).

### 6. AGD-20 (MÉDIO) — Desligar voluntário JIT não afeta P8b
Sem reconciliação entre `HumanitarianVolunteer` e `Appointment` P8b. **Corrigir (mínimo viável):** ao desativar voluntário, listar agendamentos P8b futuros e notificar admin (não cancelar automaticamente).

---

## FASE 3 — Privacidade (LGPD)

### 7. AGD-14 + AGD-15 (MÉDIO) — Motivo da consulta exposto cedo e listagem ampla
`GET /api/appointments` (~62-74, 96-118) retorna `chiefComplaint`/`notes` descriptografados na listagem do profissional; motivo visível dias antes da consulta.
**Corrigir:** `select` mínimo na listagem (sem `chiefComplaint`/`notes`); expor intake apenas via endpoint dedicado, liberado dentro da janela de join (reutilizar `appointment-join-window.ts`). Manter compatibilidade do shape da resposta (campos ausentes, não renomeados).

---

## FASE 4 — UX, fuso e ponte entre fluxos

### 8. AGD-04 (MÉDIO) — Preview de horários no fuso errado
`src/app/api/patient/volunteer-professionals/route.ts` (~58-68): `timeLabel` dos cards usa `pro.timezone`; o seletor de slots usa o fuso do paciente — horários inconsistentes entre card e confirmação.
**Corrigir:** formatar `timeLabel` no fuso do paciente (mesma fonte `userTz` de `VolunteerAppointmentsClient.tsx` ~446-450), usando `src/lib/timezone.ts`. Se o fuso do paciente não estiver disponível no servidor, mover a formatação para o cliente.

### 9. AGD-35 (MÉDIO) — Fila humanitária sem ponte para o agendado
`/humanitarian/[slug]` não menciona o voluntário agendado. Pior: quando **não há voluntário online**, a tela só avisa, sem alternativa.
**Corrigir:**
- No estado "nenhum voluntário disponível", exibir CTA para `/patient/volunteer-appointments` ("agende um horário gratuito com um voluntário"), com copy nos 3 idiomas (`translations.ts`), prioridade ES.
- **Melhoria adicional — "me avise":** botão opt-in que registra interesse (campo/tabela aditiva simples) e envia notificação/e-mail quando um voluntário da campanha fica online. Se o esforço for alto, entregar primeiro só o CTA e deixar o opt-in como TODO documentado.

### 10. Pré-check de mídia unificado (AGD-28 invertido + fila JIT)
O JIT (`video/jit/[queueId]/page.tsx` ~20-40) faz `getUserMedia` antes; o agendado (`video/[id]/page.tsx`) não. E a fila humanitária exige conta completa + login antes de qualquer contato.
**Corrigir (escopo seguro):** extrair o pré-check de câmera/microfone do JIT para componente compartilhado e usá-lo também na página de vídeo agendada. **Não** mexer no requisito de conta da fila humanitária nesta rodada (decisão de produto) — apenas deixar comentário/TODO.

### 11. AGD-34 (BAIXO) — "Dr." hardcoded
`VolunteerAppointmentsClient.tsx` (~266, 302, 524): psicólogos aparecem como "Dr.". **Corrigir:** usar rótulo por profissão via i18n (ex.: `getProfessionLabel` se existir).

### 12. AGD-32 (BAIXO) — Sem e-mail de cancelamento
`cancel/route.ts` (~127-147) só cria notificação in-app. **Corrigir:** e-mail de cancelamento simétrico ao de confirmação, no fuso e idioma do destinatário, com try/catch tolerante a falha (padrão de `fulfill-consultation.ts` ~267-286).

---

## Fora de escopo (não implementar; documentar apenas)

- AGD-11 — exigir vínculo humanitário/Acura para ofertar slots gratuitos: **decisão de negócio pendente**.
- AGD-22 — estender P8b a psicanalista/terapeuta integrativo: requisito de produto.
- AGD-21 — `onDelete` explícito em `Appointment`: adiar para janela de manutenção com backup.
- Remover exigência de conta completa na fila humanitária.

## Critérios de aceite globais

- Reagendamento voluntário fora da grade retorna erro claro (testado).
- Dois bookings simultâneos no mesmo slot: um 201, um 409 — agora garantido também pelo banco.
- Remoção de bloco com consulta futura: bloqueada com 409 + fluxo de confirmação; nenhum cancelamento silencioso.
- Card e seletor de slots mostram o mesmo horário para paciente em fuso diferente do profissional (testar com America/Sao_Paulo × Europe/Lisbon).
- `chiefComplaint` não aparece mais em `GET /api/appointments`; intake acessível só na janela de join.
- Fila humanitária sem voluntário online mostra CTA para o agendado, em ES/PT/EN.
- Fluxo pago e agendamentos existentes intactos (regressão manual + testes).
