# Análise — Login/Cadastro de Clínica e Consultório + Integração Vital8

Data: 2026-07-12 · Análise sem alteração de código (conforme CLAUDE.md)
Escopo: doctor8 (role `ORGANIZATION` = "Clínica / Consultório (CNPJ)") como **provedor OIDC/SSO**, e o **Vital8** (ERP de clínicas, pasta `C:\Users\diego\Documents\vital8`) como consumidor do login.

---

## 1. Fluxo mapeado

**Cadastro de clínica (doctor8):**
`/register/organization` → `POST /api/auth/register-organization` → valida CNPJ (dígito verificador), telefone, rate-limit → cria `User (role ORGANIZATION, region BR)` + `Organization` (CNPJ, razão social, endereço) + `OrganizationMember OWNER` + consentimentos → verificação de e-mail → login unificado `/login` (legado `/login/organizacao` → `/login?portal=organization`) → `resolveRoleHome("ORGANIZATION")` → `/organization` (painel: pacientes, agenda, financeiro, TISS, convênios, RH, contabilidade, relatórios, equipe).

**SSO (doctor8 como provedor OIDC):**
`/api/oauth/authorize` + `/token` + `/userinfo` + JWKS. Clients registrados por env: `eight` (profissionais) e `vital8` (roles `ORGANIZATION`, `EMPLOYER`, `PHARMACY_STORE`, `LABORATORY` — `src/lib/sso/sso-config.ts`). Suporta PKCE S256, state, redirect_uri allowlist, gate de role com audit log, claims B2B (`org_type: CLINIC`, `org_cnpj`, `org_name`, `org_razao_social`, `org_member_role` — `src/lib/sso/sso-userinfo.ts`).

**Vital8 (consumidor):**
Login em `/entrar` com credentials locais **ou** botão "Entrar com Doctor8" (`doctor8Provider` OAuth2 com PKCE+state, `prompt=login`). O callback `signIn` exige: `email_verified`, role B2B, `org_cnpj` presente, usuário local existente pelo e-mail e `Membership` ativo em organização vital8 com **mesmo CNPJ**; erros mapeados em pt (`Doctor8SemConta`, `Doctor8CnpjDivergente` etc.). Cadastro local em `/cadastro` (`signupAction`: User + Organization multi-tenant + Membership OWNER + trial 30 dias).

**Pontos positivos:** OIDC bem implementado (PKCE, state, secret, allowlist, audit nos dois lados); validação cruzada de CNPJ entre plataformas; mensagens de erro SSO claras; CNPJ com dígito verificador no doctor8.

## 2. Problemas encontrados

### Vital8 (mais graves)

| # | Severidade | Problema | Arquivo |
|---|-----------|----------|---------|
| B1 | **CRÍTICA (segurança)** | O callback `jwt` com `trigger === "update"` aceita `organizationId`, `role` e `branchId` **vindos do cliente sem revalidar membership**. `useSession().update({...})` envia dados arbitrários ao callback — qualquer usuário logado pode se promover a OWNER de outra organização no token (tenant hopping/escalação). A validação em `switchOrganizationAction` é apenas advisória; o callback confia no que chega | `src/lib/auth/auth.ts` (linhas ~249-263) |
| B2 | **Alta (segurança)** | `LoginForm` chama `signIn("credentials")` direto no cliente, **bypassando o rate-limit** de `loginAction` (`checkLoginRateLimit` fica morto no fluxo real de login). Brute-force sem limite | `src/modules/core/components/login-form.tsx` vs `src/modules/core/actions/auth.actions.ts` |
| B3 | Alta | `signupAction`: sem rate-limit, **enumeração de e-mail** ("E-mail já cadastrado"), sem verificação de e-mail (conta criada e logada direto), CNPJ sem validação de dígito (só min 11/max 18) e **sem unicidade** de `documentNumber` (duas orgs com mesmo CNPJ) | `src/modules/core/actions/auth.actions.ts` |
| B4 | Alta (integração) | Jornada de cadastro de clínica via Doctor8 **quebrada**: o CTA de cadastro da clínica dispara o fluxo OAuth com o comentário "o próprio fluxo OAuth leva ao /register/organization quando não há sessão" — **falso**: o authorize do doctor8 redireciona para `/login`, não para o cadastro. E mesmo registrando a clínica no doctor8, o SSO retorna `Doctor8SemConta` porque o vital8 exige conta local pré-existente + org com mesmo CNPJ. Não há provisioning automático nem tela de vinculação | `src/modules/core/components/doctor8-login-ctas.tsx` + `src/lib/auth/auth.ts` |
| B5 | Média | `signInWithDoctor8` envia `account_type` como parâmetro extra do authorize, mas o doctor8 ignora — o hint de portal se perde (usuário cai no login genérico) | mesmo arquivo |

### Doctor8 (lado provedor)

| # | Severidade | Problema | Arquivo |
|---|-----------|----------|---------|
| A1 | Média | `resolveB2BClaims` usa `findFirst` (membership mais antigo): usuário membro de 2+ organizações **sempre** emite claims da primeira — sem seletor; se a org "errada" vier primeiro, o vital8 rejeita com `Doctor8CnpjDivergente` sem solução para o usuário | `src/lib/sso/sso-userinfo.ts` |
| A2 | Média | Claim `verified: true` **incondicional** para ORGANIZATION (clínica), enquanto farmácia/laboratório checam o status da entidade — clínica não tem nenhum estado de verificação/aprovação | mesmo arquivo (linha ~103) |
| A3 | Média | Authorize não suporta hint de portal/cadastro: ignora `account_type` e sempre manda para `/login` genérico; não há como um app parceiro direcionar para `/login?portal=organization` nem para `/register/organization` | `src/app/api/oauth/authorize/route.ts` |
| A4 | Baixa | Cadastro de organização: 409 "CNPJ já cadastrado" permite enumeração de CNPJ (risco baixo — decisão a registrar); região hardcoded "BR" mas o consent exigido é `acceptedGdpr` (deveria ser LGPD, ao menos no naming/registro de consentimento) | `src/app/api/auth/register-organization/route.ts` |
| A5 | Média (qualidade) | Zero testes E2E/integração do fluxo SSO (authorize→token→userinfo, gate de roles, PKCE) e do cadastro/login de organização | `e2e/` |

---

## 3. PROMPT PARA O CURSOR (copiar tudo abaixo)

**Atenção:** são DOIS repositórios. Parte 1 = repo `vital8`; Parte 2 = repo `doctor8`. Execute a Parte 1 primeiro (contém a correção crítica).

```
Você vai corrigir e melhorar o login/cadastro de clínica e consultório em dois projetos integrados:
- doctor8 (Next.js App Router + NextAuth + Prisma): provedor OIDC/SSO. Role ORGANIZATION = clínica/consultório. Endpoints /api/oauth/{authorize,token,userinfo}, config em src/lib/sso/.
- vital8 (Next.js 14 + Auth.js v5 + Prisma multi-tenant): ERP de clínicas que consome o SSO do doctor8 (provider em src/lib/auth/doctor8-provider.ts, callbacks em src/lib/auth/auth.ts).
Commits pequenos por item. Rode typecheck + testes ao fim de cada etapa.

########################
PARTE 1 — REPO VITAL8
########################

1) CRÍTICO — Revalidar membership no callback jwt (tenant hopping)
Arquivo: src/lib/auth/auth.ts
O bloco `trigger === "update"` copia organizationId/role/branchId do objeto session (controlado pelo cliente via useSession().update) direto para o token, sem verificar membership. Qualquer usuário autenticado pode escalar para OWNER de outra org.
Correção:
  a) No callback jwt, quando trigger === "update" e updateSession.organizationId presente: chamar resolveActiveMembership(token.id, updateSession.organizationId) e usar APENAS organizationId/role retornados do banco; ignorar o role enviado pelo cliente. Se não houver membership ativo, manter o token como está (ou invalidar).
  b) branchId: validar que a branch pertence à organização do token antes de aceitar.
  c) Teste: usuário com membership em org A tenta update({organizationId: orgB, role: "OWNER"}) sem membership em B → token permanece em A.

2) Rate-limit no login real
O LoginForm (src/modules/core/components/login-form.tsx) chama signIn("credentials") direto, bypassando checkLoginRateLimit de loginAction.
Correção: mover checkLoginRateLimit para DENTRO do authorize() do provider Credentials em src/lib/auth/auth.ts (usar e-mail + IP via headers()), garantindo que qualquer caminho de login passe pelo limite. Manter o retorno null (sem vazar motivo). Remover o rate-limit duplicado de loginAction ou mantê-lo como primeira barreira.

3) Endurecer signupAction (src/modules/core/actions/auth.actions.ts)
  a) Rate-limit por e-mail + IP (reutilizar checkLoginRateLimit ou criar checkSignupRateLimit).
  b) Anti-enumeração: quando o e-mail já existe, retornar resposta genérica de sucesso pedindo verificação de e-mail (ver item 3c) em vez de "E-mail já cadastrado".
  c) Verificação de e-mail: criar token de verificação e enviar e-mail; bloquear login credentials de contas não verificadas (campo emailVerified no User; migração Prisma necessária — criar). Se o produto preferir manter login imediato no trial, no mínimo implementar (a), (b) e (d) e registrar a decisão em DECISOES.md.
  d) Validar CNPJ com dígito verificador quando documentType for CNPJ (portar isValidCnpj do doctor8: src/lib/cnpj.ts) e impor unicidade de documentNumber por organização ativa (índice único parcial ou verificação transacional).

4) Consertar a jornada de cadastro de clínica via Doctor8
Arquivo: src/modules/core/components/doctor8-login-ctas.tsx e src/lib/auth/auth.ts
Hoje: CTA "cadastrar clínica" abre o OAuth que cai no LOGIN do doctor8 (o comentário no código está errado), e mesmo quem registra a clínica no doctor8 recebe Doctor8SemConta no retorno (vital8 exige conta local + org com mesmo CNPJ).
Correção (decidir com o produto e implementar UMA das duas):
  OPÇÃO A (recomendada) — Auto-provisioning no primeiro SSO: no callback signIn, quando o usuário doctor8 é B2B com org_type CLINIC, e-mail verificado e org_cnpj válido, mas não existe usuário/org local: criar User (sem passwordHash), Organization (name = org_name, documentNumber = org_cnpj, type = CLINICA, trial 30 dias) e Membership OWNER, com audit log "user.provisioned_from_doctor8". Se o usuário existe mas não tem org com aquele CNPJ, criar a org + membership OWNER apenas se org_member_role do claim for OWNER/ADMIN; senão manter erro atual.
  OPÇÃO B — Fluxo explícito: trocar o CTA de cadastro da clínica para levar a https://app.doctor8.org/register/organization?callbackUrl=<authorize-url> e criar em /entrar uma tela de vinculação pós-SSO ("crie sua conta vital8 para esta clínica") em vez do erro Doctor8SemConta.
Em ambas: atualizar o comentário incorreto no código.

5) Propagar o hint de portal
signInWithDoctor8 já envia account_type; após a Parte 2 item 8 (doctor8 passa a aceitar), garantir que o valor enviado seja um dos aceitos (CLINIC/EMPLOYER/PHARMACY/LABORATORY) e adicionar teste de que o parâmetro chega na URL do authorize.

6) Testes
  a) Unit: callback jwt (item 1), signupAction (rate-limit, anti-enum, CNPJ), authorize credentials com rate-limit.
  b) E2E: login credentials ok/errado/limitado; SSO doctor8 mockado (happy path + cada erro Doctor8*).

########################
PARTE 2 — REPO DOCTOR8
########################

7) Seleção de organização no SSO multi-org
Arquivo: src/lib/sso/sso-userinfo.ts
resolveB2BClaims usa findFirst — usuário em 2+ organizações sempre emite claims da mais antiga, sem escolha (vital8 então rejeita com CnpjDivergente).
Correção mínima: quando o usuário ORGANIZATION/EMPLOYER/PHARMACY_STORE/LABORATORY tiver mais de um membership ativo, o authorize (src/app/api/oauth/authorize/route.ts) deve exibir uma tela intermediária de escolha da organização (nova página, ex. /sso/select-org, listando as orgs; a escolha é gravada junto ao authorization code — estender createSsoAuthorizationCode/consumeSsoAuthorizationCode em src/lib/sso/sso-codes.ts com organizationId opcional) e getSsoUserClaims/resolveB2BClaims passam a aceitar organizationId para emitir os claims da org escolhida. Com 1 org, comportamento atual inalterado.

8) Aceitar hint de portal no authorize
Arquivo: src/app/api/oauth/authorize/route.ts
Aceitar parâmetro opcional account_type (CLINIC | EMPLOYER | PHARMACY | LABORATORY). Ao redirecionar para login, mapear para o destino certo: CLINIC → /login?portal=organization, EMPLOYER → /empresas/login, PHARMACY → /farmacias/login, LABORATORY → /laboratorios/login (preservando callbackUrl de resume). Ignorar valores desconhecidos (fallback /login).

9) Claim verified consistente para clínica
Arquivo: src/lib/sso/sso-userinfo.ts (case ORGANIZATION)
Hoje verified: true incondicional; farmácia/lab usam o status da entidade. Verificar se Organization tem campo de status/verificação no schema; se tiver, usar; se não tiver, decidir com o produto: (a) adicionar status em Organization (migração) ou (b) manter true e documentar no código o porquê da diferença. Não quebrar o contrato com o vital8 (que hoje não usa verified para B2B — confirmar antes).

10) Registro de organização — ajustes menores
Arquivo: src/app/api/auth/register-organization/route.ts
  a) Consent: região é hardcoded BR mas grava GDPR_CONSENT; registrar também/em vez o consentimento LGPD (alinhar com createRegisterConsents usado no registro comum — requiresLgpd("BR")).
  b) Documentar (comentário) a decisão de responder 409 para CNPJ duplicado (enumeração aceitável por ser dado público) ou trocar por resposta genérica — escolher e registrar.

11) Testes
  a) Integração dos endpoints OIDC: authorize (client inválido, redirect_uri fora da allowlist, role não permitida → access_denied com audit, prompt=login, multi-org → tela de escolha), token (PKCE ok/errado, code reuse), userinfo (claims B2B de clínica com org_cnpj normalizado).
  b) E2E: cadastro de organização (/register/organization) → verificação de e-mail → login → /organization; e /login/organizacao → /login?portal=organization.

=== CRITÉRIOS DE ACEITE (ambos) ===
- Round-trip SSO completo funcionando: clínica cadastrada no doctor8 entra no vital8 (conforme a opção escolhida no item 4).
- Nenhuma regressão no SSO do client "eight" nem nos logins locais dos dois apps.
- lint + typecheck + testes passando nos dois repos.
- Mudanças de schema Prisma somente as indicadas (emailVerified/unicidade no vital8; status de Organization no doctor8 se optado), com migrações.
```

---

*Notas: (1) B1 do vital8 é a correção mais urgente de toda a análise — escalação de privilégio entre tenants. (2) O item 4 (provisioning) e o item 9 (verified) são decisões de produto; o prompt oferece opções para o Cursor implementar após sua escolha. (3) "vira8ep" foi interpretado como o Vital8 ERP — pasta conectada em C:\Users\diego\Documents\vital8.*
