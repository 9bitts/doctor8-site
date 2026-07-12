# Análise — Prontuário automático ao agendar (Portal do Psicólogo)

**Data:** 12 de julho de 2026
**Objetivo:** quando o paciente agenda uma consulta, todas as informações dele devem aparecer automaticamente em Pacientes.
**Decisão de produto:** agendamento confirmado SEMPRE cria o prontuário, ignorando o limite free de 3 pacientes (o limite continua valendo só para adição manual).

---

## Diagnóstico

A automação já existe parcialmente, mas o gatilho tem um furo:

1. Todos os agendamentos convergem em `fulfillConsultationPayment` (`src/lib/fulfill-consultation.ts`, ~480-535).
2. Para psicólogo (providerType `"health"`), o prontuário só é criado dentro de `onAppointmentBooked` (`src/lib/post-booking.ts`), que **retorna cedo** (`{ chartId: null }`) quando o paciente não preencheu o motivo da consulta (`!intake?.visitReason?.trim()`). Sem motivo → sem `PatientRecord` → paciente não aparece em Pacientes.
3. Psicanalista e integrativo não têm esse problema: `ensureAnalysandForPatient` / `ensureIntegrativeClientForPatient` rodam incondicionalmente.
4. A chamada para `"health"` é fire-and-forget (`.catch(console.error)`) — falha silenciosa.
5. Quando o registro é criado, `ensurePatientRecord` (`src/lib/ensure-patient-record.ts`) já copia nome, e-mail, telefone, nascimento, sexo, CPF e endereço do `patientProfile`, e roda `syncChartDocuments`. A cópia de dados já está correta; o problema é só o gatilho.

---

## Prompt para o Cursor

```
Contexto: Next.js + Prisma. Hoje, quando um paciente agenda consulta com um
profissional de saúde (incluindo psicólogos), o PatientRecord (prontuário que
alimenta a página Pacientes) só é criado se o paciente preencheu o "motivo da
consulta" no agendamento. Precisamos que o prontuário seja criado SEMPRE que
um agendamento for confirmado, com todos os dados do paciente.

NÃO altere o schema do Prisma. Mudanças:

1. src/lib/post-booking.ts — onAppointmentBooked:
   - Para providerType "health": chamar ensurePatientRecord(providerId,
     patientUserId) ANTES de qualquer early-return de intake. O early-return
     por falta de visitReason deve valer apenas para a criação da nota de
     pré-consulta (medicalDocument), não para a criação do prontuário.
   - Mesmo quando já existe medicalDocument para o appointmentId, garantir
     que ensurePatientRecord foi chamado (hoje o early-return de documento
     existente também pula o ensure quando o record ainda não existe).
   - Para providerType "integrative": manter comportamento atual (o
     integrativeClientRecord já é garantido por ensureIntegrativeClientForPatient
     no fulfill-consultation).
   - Retornar { chartId } com o id do record criado/encontrado.

2. src/lib/fulfill-consultation.ts (~518-535):
   - No branch "health", trocar o fire-and-forget por await com try/catch:
     a criação do prontuário não pode falhar silenciosamente. Em caso de erro,
     logar com prefixo [POST-BOOKING] incluindo appointmentId, e NÃO derrubar
     o fluxo do agendamento (a consulta já está paga/criada).

3. Limite freemium (src/lib/psychology-plan-limits.ts):
   - assertCanAddPsychologyPatient NÃO deve ser aplicado ao caminho de
     agendamento. Verificar que ensurePatientRecord não chama esse assert
     (hoje não chama — apenas garantir que ninguém o adicione nesse caminho
     e deixar um comentário explicando: "prontuário criado por agendamento
     confirmado ignora o limite free; o limite vale só para adição manual
     em /api/professional/records").

4. Backfill (scripts/):
   - Criar script idempotente scripts/backfill-patient-records-from-appointments.ts:
     para cada appointment com professionalId != null e userId de paciente,
     sem PatientRecord correspondente (professionalId + linkedUserId), chamar
     ensurePatientRecord. Logar contagem de criados/pulados. Suportar --dry-run.

5. Testes:
   - Unit test de onAppointmentBooked: booking "health" SEM visitReason cria
     PatientRecord e NÃO cria medicalDocument; COM visitReason cria ambos.
   - Teste de que psicólogo free com 3 pacientes recebe o 4º via agendamento.

Critério de aceite: paciente agenda consulta com psicólogo (com ou sem motivo
preenchido, pago ou preço zero) → aparece imediatamente em /psychologist/patients
com nome, e-mail, telefone, nascimento, sexo, CPF e endereço vindos do perfil.
```

---

## Observações

- `ensurePatientRecord` retorna `null` se o `patientProfile` não existir ou não tiver nome — nesse caso não há o que exibir; o backfill vai pular esses casos.
- Dados faltantes em Pacientes (ex.: telefone vazio) refletem perfil incompleto do paciente, não é bug do fluxo.
- Relacionado: AGD-01/AGD-19 do relatório de voluntário agendado se aplicam aqui, pois as páginas de appointments são re-exportadas para o portal do psicólogo.
