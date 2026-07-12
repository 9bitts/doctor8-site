# Análise — Login/Cadastro de Empresas de Saúde Ocupacional + Prompt para o Cursor

Data: 2026-07-12 · Análise sem alteração de código (conforme CLAUDE.md)
Escopo: área `/empresas` — foco em **login e cadastro** das 3 personas: empresa (role `EMPLOYER`), médico do trabalho (role `OCCUPATIONAL_PHYSICIAN`) e psicólogo da rede EAP (`PROFESSIONAL`). Complementa o documento anterior `ANALISE_EMPRESAS_LOGINS_E_PROMPT_CURSOR.md` (portal/ASO/PCMSO) — **vários bugs daquele doc já foram corrigidos** (ver seção 1). SSO/Vital8: ver `ANALISE_CLINICA_CONSULTORIO_LOGIN_VITAL8_E_PROMPT_CURSOR.md` (EMPLOYER é uma das 4 roles B2B do mesmo fluxo OIDC).

---

## 1. Fluxo mapeado + o que já foi corrigido

**Cadastro da empresa:** `/empresas/cadastro` → `POST /api/auth/register-employer` → valida CNPJ (dígito verificador), telefone, rate-limit, anti-enumeração de e-mail (`handleExistingB2BRegistration`) → cria `User (EMPLOYER, BR)` + `EmployerCompany` + `EmployerMember OWNER` + `EmployerEapBenefit (6 sessões)` + consentimentos → verificação de e-mail → `/empresas/painel`.

**Médico do trabalho:** convite da empresa (`api/employer/pcmso/invite`, token 7 dias) → `/empresas/medico/cadastro` (novo usuário, `register-occupational-physician`, e-mail vem do convite e já nasce `emailVerified`) **ou** `/empresas/medico/aceitar` (usuário existente, `api/occupational-physician/invites/accept`). Login: `/empresas/medico/login`. Vínculo N:N por empresa via `EmployerOccupationalPhysician`.

**Psicólogo EAP:** `/empresas/psicologo/login` (PROFESSIONAL psicólogo vinculado à rede EAP da empresa).

**RBAC:** `EmployerMember.role` (OWNER/ADMIN/SST/HR/VIEWER) em `src/lib/employer-auth.ts`; médico via `userHasCompanyAccess` (`src/lib/occupational-physician-auth.ts`).

**✅ Já corrigido desde o doc anterior:**
- Login da empresa **valida a role pós-login** e **não tem botão Google** (`EmployerLoginForm` linhas 87-92).
- **Seletor multi-empresa** implementado (`EmployerCompanySwitcher` + cookie `work-context`); `getEmployerMembership` aceita empresa selecionada.
- **Download do ASO pelo médico** funciona: `api/employer/exams/[id]/aso-pdf` agora aceita `OCCUPATIONAL_PHYSICIAN` via `userHasCompanyAccess`.
- **Aceite de convite não sobrescreve mais a role global**: `invites/accept` (empresa e médico) usa `canAcceptEmployerInvite`/`canAcceptOccupationalPhysicianInvite` + `buildRoleConflictMessage`.
- `/empresas/medico/login` agora tem `<Suspense>`.

**Pontos positivos:** anti-enumeração de e-mail, rate-limit, CNPJ validado, convites com token e expiração, e-mail do médico verificado por posse do convite, RBAC granular, multi-empresa com switcher.

## 2. Problemas encontrados (login/cadastro)

| # | Severidade | Problema | Arquivo |
|---|-----------|----------|---------|
| E1 | **Alta (legal)** | **ASO editável após conclusão, sem máquina de estados nem imutabilidade** e re-enfileira eSocial: `PATCH /api/employer/exams/[id]` atualiza um exame `COMPLETED` com `asoResult` sem trava; cada PATCH com `COMPLETED + asoResult` dispara `buildAndQueueS2220FromExam` → **eventos S-2220 duplicados**. Além disso, o `asoResult` (documento de aptidão médica) é preenchido por papéis da **empresa** (`requireEmployerApi(["OWNER","ADMIN","SST","HR"])`), não pelo médico — o portal do médico só lê (GET). ASO é documento médico-legal | `src/app/api/employer/exams/[id]/route.ts` |
| E2 | Média (UX/segurança) | **Botão Google no login do médico do trabalho** (`OccupationalPhysicianLoginForm`): a conta do médico é criada por convite + senha, sem vínculo Google — o SSO Google não resolve para `OCCUPATIONAL_PHYSICIAN`. Inconsistente com o login da empresa (que já removeu o Google). Remover ou condicionar | `src/components/employer/OccupationalPhysicianLoginForm.tsx` |
| E3 | Média (compliance) | Os **três** registros (`register-employer`, `register-employer-staff`, `register-occupational-physician`) gravam `ConsentType.GDPR_CONSENT` com `region: "BR"` hardcoded — deveria ser **LGPD** | `src/app/api/auth/register-employer*/route.ts`, `register-occupational-physician/route.ts` |
| E4 | Baixa (segurança) | Os endpoints **GET** de convite (`register-occupational-physician?token=`, `register-employer-staff?token=`) retornam e-mail/nome/CRM do convidado a qualquer portador do token; token em querystring pode acabar em logs. Considerar POST/JSON e não logar querystring | mesmos arquivos |
| E5 | Baixa | `register-employer` responde `409 "CNPJ já cadastrado"` (enumeração de CNPJ — dado público; decisão a registrar). O e-mail já tem tratamento anti-enumeração no mesmo arquivo | `src/app/api/auth/register-employer/route.ts` |
| E6 | Média (produto) | Um `PROFESSIONAL`/paciente convidado como staff de empresa ou como médico é **bloqueado** pelo `canAccept*` (conflito de role global single-role). Correto como segurança, mas **não há caminho** para um usuário atuar em mais de um contexto (ex.: médico que também é PROFESSIONAL na plataforma). Decidir se haverá multi-papel | `src/lib/*` dos `canAccept*` + fluxos de convite |
| E7 | Média (qualidade) | Zero cobertura E2E dos fluxos de login/cadastro de empresa, médico do trabalho e staff | `e2e/` |

*Herdados do SSO/Vital8 (EMPLOYER é role B2B): tenant hopping no callback jwt do Vital8 (CRÍTICO) e `resolveB2BClaims`/`resolveB2BClaims` usando `findFirst` (a empresa tem switcher no portal, mas o **SSO emite claims da empresa mais antiga** — pode divergir do CNPJ esperado no app parceiro). Ver o prompt de clínica/Vital8 — não repetir.*

---

## 3. PROMPT PARA O CURSOR (copiar tudo abaixo)

```
Você vai corrigir e melhorar o login/cadastro da área de EMPRESAS DE SAÚDE OCUPACIONAL no projeto doctor8 (Next.js App Router + NextAuth + Prisma). Personas: empresa (role EMPLOYER, RBAC EmployerMember OWNER/ADMIN/SST/HR/VIEWER), médico do trabalho (role OCCUPATIONAL_PHYSICIAN, vínculo N:N EmployerOccupationalPhysician) e psicólogo EAP (PROFESSIONAL). Não altere outros portais além do necessário. Commits pequenos por item; typecheck + testes ao fim de cada etapa.

NOTA 1: vários itens do doc anterior de empresas JÁ foram corrigidos (login da empresa valida role e não tem Google; switcher multi-empresa; aso-pdf acessível ao médico; invites/accept com canAccept*/RoleConflict; Suspense no login do médico). NÃO refaça esses.
NOTA 2: se o prompt de CLÍNICA/VITAL8 já foi aplicado (callback jwt do vital8, seletor de org no SSO), NÃO reimplemente — cobre a role EMPLOYER.

=== CORREÇÕES (ordem de prioridade) ===

1) LEGAL — Imutabilidade e autoria do ASO + eSocial idempotente
Arquivo: src/app/api/employer/exams/[id]/route.ts (PATCH)
Problemas: (i) um exame COMPLETED com asoResult pode ser re-editado sem trava; (ii) cada PATCH COMPLETED+asoResult chama buildAndQueueS2220FromExam → duplica eventos eSocial S-2220; (iii) o asoResult (aptidão médica) é definido por papéis da empresa (HR/SST), não pelo médico.
Correção:
  a) Máquina de estados: uma vez que o exame esteja COMPLETED COM asoResult (ASO emitido), bloquear novas edições dos campos do ASO (asoResult, asoRestrictions, physicianName, physicianCrm, completedAt) → 409 "ASO já emitido; use retificação". Permitir apenas um fluxo explícito de RETIFICAÇÃO auditado (novo campo/estado, ex. asoRetifiedAt + motivo), que gere um novo evento eSocial de correção — não uma sobrescrita silenciosa.
  b) Idempotência do eSocial: só enfileirar S-2220 na TRANSIÇÃO para COMPLETED+asoResult (comparar com o estado anterior existing), nunca em re-PATCH; registrar que o evento já foi enfileirado (flag/tabela) para não duplicar.
  c) Autoria do ASO: decidir com o produto quem assina. Recomendado: o asoResult só pode ser definido/assinado por um OCCUPATIONAL_PHYSICIAN vinculado à empresa (userHasCompanyAccess), não por HR. Se o preenchimento pela empresa for intencional (empresa transcreve o ASO físico), gravar explicitamente physicianCrm/physicianName obrigatórios e marcar origem "transcrito", mantendo trilha de auditoria (createAuditLog).
  d) APTO_COM_RESTRICAO: exigir asoRestrictions não-vazio (hoje é opcional) quando asoResult === "APTO_COM_RESTRICAO".
  e) Testes: re-PATCH de ASO emitido → 409; um único S-2220 por conclusão; APTO_COM_RESTRICAO sem restrições → 400.

2) Remover/condicionar o botão Google no login do médico do trabalho
Arquivo: src/components/employer/OccupationalPhysicianLoginForm.tsx
A conta do médico é criada por convite + senha; não há vínculo Google e o SSO Google não resolve para OCCUPATIONAL_PHYSICIAN. Remover GoogleSignInButton/handleGoogleSignIn (manter só credentials), alinhando com o EmployerLoginForm. Manter a validação de role já existente (canAccess → OCCUPATIONAL_PHYSICIAN/ADMIN).

3) Consentimento LGPD nos cadastros de empresa/médico/staff
Arquivos: src/app/api/auth/register-employer/route.ts, register-employer-staff/route.ts, register-occupational-physician/route.ts
region é hardcoded "BR" mas grava GDPR_CONSENT. Registrar consentimento LGPD (alinhar com createRegisterConsents/requiresLgpd). Fazer de forma consistente com os demais register-* B2B (clínica/laboratório/farmácia).

4) Endurecer os endpoints GET de convite
Arquivos: register-occupational-physician/route.ts e register-employer-staff/route.ts (handlers GET)
Hoje retornam email/nome/CRM do convidado a qualquer portador do token via querystring. Mudanças:
  a) Não logar a querystring com o token (revisar logging/observabilidade).
  b) Preferir validar o token via POST/JSON ou header; se mantiver GET, minimizar os dados retornados (só o necessário para a tela).
  c) Garantir expiração e uso único do token (já parcial: link.userId/expiresAt) e rate-limit por token/IP no GET.

5) Enumeração de CNPJ (decisão)
Arquivo: register-employer/route.ts — decidir manter 409 "CNPJ já cadastrado" (documentar, CNPJ é público) ou padronizar resposta genérica como no e-mail. Registrar a escolha.

6) Multi-papel / conflito de role (decisão de produto)
Hoje canAcceptEmployerInvite/canAcceptOccupationalPhysicianInvite bloqueiam usuários com role global conflitante (ex.: um PROFESSIONAL não vira staff de empresa). Isso é seguro, mas impede um mesmo usuário de atuar como médico do trabalho E profissional de saúde. Decidir com o produto:
  - (A) manter o bloqueio e exibir mensagem clara com orientação (usar outro e-mail), OU
  - (B) evoluir para vínculos por contexto (memberships) desacoplados da role global — mudança maior; se escolhida, planejar migração. Apenas documentar a decisão nesta etapa.

=== TESTES ===
7) E2E (e2e/empresas-auth.spec.ts):
  a) Cadastro empresa → verificação de e-mail → login → /empresas/painel.
  b) Login da empresa com conta de paciente → erro "conta inválida" (não redirect silencioso). [regressão do fix já aplicado]
  c) Convite de médico → /empresas/medico/cadastro (novo) → login → /empresas/medico/painel; e /empresas/medico/aceitar (usuário existente) com role conflitante → mensagem de conflito.
  d) Switcher multi-empresa: OWNER de 2 empresas alterna e os dados do painel mudam.
8) Integração: PATCH de ASO (item 1) — imutabilidade, S-2220 único, APTO_COM_RESTRICAO.

=== CRITÉRIOS DE ACEITE ===
- ASO emitido é imutável (retificação só por fluxo auditado); um único evento eSocial por conclusão.
- Sem regressão nos fixes já aplicados (login empresa, switcher, aso-pdf do médico, invites/accept).
- lint + typecheck + testes passando.
- Manter anti-enumeração de e-mail e rate-limit. Mudanças de schema só se necessárias (flag de eSocial enfileirado / campos de retificação), com migração.
```

---

*Notas: (1) o item 1 (ASO) é o mais crítico — é documento médico-legal com transmissão ao eSocial; hoje é editável e duplica eventos. (2) A maior parte dos problemas de login/cadastro apontados no doc anterior de empresas já foi resolvida — esta análise reflete o estado atual e concentra o que resta. (3) A falha crítica de segurança da integração (tenant hopping no Vital8) cobre a role EMPLOYER e está no prompt de clínica/Vital8.*
