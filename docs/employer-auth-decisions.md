# Decisões de produto — autenticação empresas (saúde ocupacional)

## Enumeração de CNPJ no cadastro

**Decisão:** manter resposta `409` com mensagem `"CNPJ já cadastrado"` em `POST /api/auth/register-employer`.

**Motivo:** CNPJ é dado público (Receita Federal). A enumeração não expõe informação privada. O e-mail continua protegido por anti-enumeração (`handleExistingB2BRegistration`).

**Implementação:** `src/app/api/auth/register-employer/route.ts`

---

## Multi-papel / conflito de role global

**Decisão (fase atual):** opção **A** — manter bloqueio single-role.

Usuários com role global incompatível (ex.: `PROFESSIONAL`, `PATIENT`) não podem aceitar convites de staff (`EMPLOYER`) nem de médico do trabalho (`OCCUPATIONAL_PHYSICIAN`) sem criar outra conta.

**Mensagem:** `buildRoleConflictMessage` em `src/lib/portal-invite-compat.ts` orienta usar outro e-mail.

**Evolução futura (opção B):** memberships desacoplados da role global — requer migração de schema e revisão de guards em todos os portais B2B.

---

## Autoria do ASO

| Fluxo | Rota | `asoSource` |
|-------|------|-------------|
| Médico vinculado assina | `PATCH /api/occupational-physician/exams` | `PHYSICIAN` |
| Empresa transcreve ASO físico | `PATCH /api/employer/exams/[id]` com `asoSource: TRANSCRITO` | `TRANSCRITO` + audit log |

ASO emitido (`COMPLETED` + `asoResult`) é imutável; retificação exige `rectify: true` + `notes` e gera novo evento eSocial.
