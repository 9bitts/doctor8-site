# Análise — Login/Cadastro de Laboratório + Prompt para o Cursor

Data: 2026-07-12 · Análise sem alteração de código (conforme CLAUDE.md)
Escopo: doctor8, role `LABORATORY` (portal `/laboratorios`). Integração SSO/Vital8 documentada em `ANALISE_CLINICA_CONSULTORIO_LOGIN_VITAL8_E_PROMPT_CURSOR.md` (laboratório é uma das 4 roles B2B do mesmo fluxo).

---

## 1. Fluxo mapeado

**Cadastro:** `/laboratorios/cadastro` → `POST /api/auth/register-laboratory` → valida CNPJ (dígito verificador), telefone, rate-limit, anti-enumeração (`registerAckResponse`) → cria `User (role LABORATORY, region BR)` + `Laboratory (status PENDING_REVIEW, labType BLOOD/IMAGING/BOTH)` + `LaboratoryMember OWNER (status ACTIVE)` + consentimentos → geocoding do endereço → verificação de e-mail → destino `/laboratorios/painel`.

**Login:** `/laboratorios/login` (`LaboratoryLoginForm`, tema violet) com credentials + botão Google → `signIn("credentials")` → `safePostLoginUrl(role, ...)`. Middleware protege `/laboratorios/{painel,exames,configuracoes}` (role LABORATORY/ADMIN); rotas públicas: `/laboratorios`, `/laboratorios/buscar`, `login`, `cadastro`. Já logado em `/laboratorios/login` é redirecionado.

**Portal:** `painel` (status do lab + banners), `exames` (catálogo/preços do laboratório), `configuracoes`. RBAC interno `LaboratoryMember.role` (OWNER/ADMIN/STAFF) em `src/lib/laboratory-auth.ts` (`requireLaboratory`, `canManageLaboratoryExams`, `canManageLaboratorySettings`).

**Integrações:** rede de laboratórios / cotação (`src/lib/laboratory-network/quote.ts` — filtra `status: "ACTIVE"` na busca pública); SSO OIDC como role B2B (`org_type: LABORATORY`, `verified` = `laboratory.status === "ACTIVE"` em `src/lib/sso/sso-userinfo.ts`); consumido pelo Vital8 (`doctor8Provider`, `registerHref` → `/laboratorios/cadastro`).

**Pontos positivos:** anti-enumeração de e-mail no registro (melhor que o de organização/clínica), rate-limit, CNPJ com dígito verificador, `status PENDING_REVIEW` por padrão (moderação), Suspense correto no login, RBAC interno bem fatorado, busca pública já filtra `ACTIVE`.

## 2. Problemas encontrados

| # | Severidade | Problema | Arquivo |
|---|-----------|----------|---------|
| L1 | **Alta** | `status` do laboratório **não é aplicado no acesso ao portal nem nas APIs**: o layout só checa a role, e `requireLaboratory` retorna contexto sem olhar `lab.status`. Um lab `PENDING_REVIEW` (ou `SUSPENDED`) acessa `/laboratorios/exames` e **cria/edita exames via API** normalmente — só o painel mostra banner, e a busca pública os oculta. Lab suspenso continua operando o back-office | `src/app/(dashboard)/laboratorios/layout.tsx`, `src/lib/laboratory-auth.ts`, `src/app/api/laboratory/exams/route.ts` |
| L2 | **Média (segurança/UX)** | Botão **Google no login B2B** não faz sentido: uma conta Google não tem role `LABORATORY` nem membership. Quem clica ou cai no home de paciente (se a conta existir como paciente) ou em estado inconsistente. Mesmo padrão já apontado em clínica/empresa | `src/components/laboratory/LaboratoryLoginForm.tsx` |
| L3 | Média (UX) | Login **não valida a role pós-autenticação**: paciente que entra em `/laboratorios/login` é redirecionado em silêncio ao painel de paciente via `safePostLoginUrl`, sem mensagem. Padronizar com erro claro "esta conta não é de laboratório" | mesmo arquivo |
| L4 | Média (compliance) | Consentimento gravado como `GDPR_CONSENT` com `region: "BR"` hardcoded — deveria registrar **LGPD** (mesmo desvio de clínica/organização) | `src/app/api/auth/register-laboratory/route.ts` |
| L5 | Média (perf) | `geocodeAddress` é chamado **de forma bloqueante no caminho da requisição** de cadastro (após a transação, antes de responder). Se o geocoder estiver lento/instável, o cadastro trava ou falha por timeout — deveria ser best-effort assíncrono/fila | mesmo arquivo (linhas ~218-236) |
| L6 | Baixa | `409 "CNPJ já cadastrado"` permite enumeração de CNPJ (dado público — risco baixo; decisão a registrar). Divergente do tratamento anti-enumeração dado ao e-mail no mesmo arquivo | mesmo arquivo (linha ~155) |
| L7 | Baixa (integração) | Round-trip SSO: lab recém-cadastrado é `PENDING_REVIEW` → claim `verified: false`. O Vital8 (`signIn`) **não checa `verified`** — só e-mail verificado, role B2B, CNPJ e membership local. Um lab não aprovado poderia entrar no Vital8 se tivesse membership local. Alinhar a política (bloquear não-`ACTIVE` no SSO ou documentar que é intencional) | `src/lib/sso/sso-userinfo.ts` + `vital8/src/lib/auth/auth.ts` |
| L8 | Média (qualidade) | Zero cobertura E2E do laboratório (cadastro, login, gate de status, exames, busca) | `e2e/` |

*Herdados da análise de clínica/Vital8 (mesmos arquivos, valem para a role LABORATORY): escalonamento de tenant no callback jwt do Vital8 (CRÍTICO), `resolveB2BClaims` usa `findFirst` sem seletor multi-org, hint `account_type` ignorado no authorize. Ver o prompt daquela análise — não repetir.*

---

## 3. PROMPT PARA O CURSOR (copiar tudo abaixo)

```
Você vai corrigir e melhorar o login/cadastro e o portal do LABORATÓRIO no projeto doctor8 (Next.js App Router + NextAuth + Prisma). Role global LABORATORY, RBAC interno LaboratoryMember (OWNER/ADMIN/STAFF). Não altere outros portais além do necessário. Commits pequenos por item; rode typecheck + testes ao fim de cada etapa.

NOTA: se as correções do prompt de CLÍNICA/VITAL8 já foram aplicadas (callback jwt do vital8, seletor multi-org no SSO, hint account_type no authorize), NÃO as reimplemente — elas já cobrem a role LABORATORY.

CONTEXTO:
- Cadastro: /laboratorios/cadastro → POST /api/auth/register-laboratory → cria Laboratory status PENDING_REVIEW + LaboratoryMember OWNER.
- Login: /laboratorios/login (src/components/laboratory/LaboratoryLoginForm.tsx).
- Guard de API: requireLaboratory (src/lib/laboratory-auth.ts). Portal: src/app/(dashboard)/laboratorios/*. Status enum: PENDING_REVIEW | ACTIVE | SUSPENDED.

=== CORREÇÕES (ordem de prioridade) ===

1) Aplicar o status do laboratório no acesso (portal + APIs)
Hoje layout e requireLaboratory ignoram lab.status; um lab PENDING_REVIEW ou SUSPENDED opera o back-office normalmente.
Correção:
  a) Em src/lib/laboratory-auth.ts, adicionar opção requireActive (default: exigir status ACTIVE para operações de escrita). requireLaboratory deve expor lab.status (já expõe) e um helper isLaboratoryActive(status).
  b) Nas rotas de ESCRITA de exames/config (POST/PUT/PATCH/DELETE em src/app/api/laboratory/**), bloquear quando status !== "ACTIVE" com 403 e mensagem clara ("Laboratório em análise/suspenso — cadastro de exames indisponível"). Leituras (GET) podem continuar liberadas para o próprio lab ver seus dados.
  c) No layout src/app/(dashboard)/laboratorios/layout.tsx (ou nas páginas exames/configuracoes), quando status !== "ACTIVE", permitir visualizar mas desabilitar ações de escrita e mostrar o banner (o painel já tem os textos). Decidir com o produto se SUSPENDED deve bloquear o acesso por completo — se sim, redirecionar para /laboratorios/painel.
  d) Testes cobrindo PENDING_REVIEW e SUSPENDED tentando criar exame → 403; ACTIVE → 201.

2) Remover/ajustar o botão Google no login de laboratório
Arquivo: src/components/laboratory/LaboratoryLoginForm.tsx
Login Google não faz sentido para conta B2B (sem role LABORATORY nem membership). Remover o GoogleSignInButton e o handleGoogleSignIn deste formulário (manter apenas credentials), OU — se quiser manter SSO Google para membros convidados — só habilitar após confirmar que o fluxo Google resolve para uma conta com membership de laboratório; na dúvida, remover. Aplicar a mesma decisão aos outros logins B2B (empresa, farmácia, clínica) para consistência.

3) Validar a role no pós-login
Mesmo arquivo. Após waitForAuthenticatedSession, se session.user.role !== "LABORATORY" (e !== "ADMIN"), NÃO redirecionar em silêncio: mostrar erro "Esta conta não é de laboratório. Use o login correto." e oferecer link para /login. Reaproveitar o padrão roleOnlyKey/login.invalid já presente em LoginAlerts. (Padronizar com os demais logins B2B.)

4) Consentimento LGPD no cadastro
Arquivo: src/app/api/auth/register-laboratory/route.ts
region é hardcoded "BR" mas grava ConsentType.GDPR_CONSENT. Registrar o consentimento LGPD (alinhar com createRegisterConsents/requiresLgpd usados no registro comum). Fazer o mesmo, se ainda pendente, no register-organization.

5) Geocoding fora do caminho da requisição
Mesmo arquivo (linhas ~218-236). geocodeAddress roda bloqueante antes de responder o cadastro. Tornar best-effort não-bloqueante: responder o sucesso imediatamente e geocodificar em background (fila/after-response) OU envolver em Promise.race com timeout curto e nunca falhar o cadastro por causa disso. Garantir que erro de geocoder jamais derrube o registro.

6) Enumeração de CNPJ (decisão)
Mesmo arquivo. O 409 "CNPJ já cadastrado" revela existência. Decidir: (a) manter (CNPJ é público) e documentar em comentário, ou (b) padronizar com resposta genérica como no e-mail. Registrar a escolha.

7) Política de SSO para laboratório não-ATIVO
Arquivos: src/lib/sso/sso-userinfo.ts (doctor8) e o consumidor vital8.
Hoje claim verified reflete status ACTIVE, mas o vital8 não usa verified para bloquear. Decidir a política e aplicar:
  - Se um lab PENDING_REVIEW/SUSPENDED NÃO deve acessar apps parceiros: no authorize (src/app/api/oauth/authorize/route.ts) negar SSO para LABORATORY cujo laboratório não esteja ACTIVE (access_denied com mensagem), OU no vital8 (src/lib/auth/auth.ts callback signIn) rejeitar quando profile.verified !== true para roles que exigem aprovação.
  - Documentar a decisão nos dois repos.

=== TESTES ===
8) E2E Playwright (e2e/laboratory-portal.spec.ts):
  a) Cadastro /laboratorios/cadastro → verificação de e-mail → login → /laboratorios/painel com banner "em análise".
  b) Lab PENDING_REVIEW tenta criar exame → bloqueado (UI + 403 API).
  c) Paciente logando em /laboratorios/login → mensagem de role inválida (não redirect silencioso).
  d) Busca pública /laboratorios/buscar só mostra labs ACTIVE.
9) Unit: requireLaboratory com requireActive; isLaboratoryActive; role-gate do login.

=== CRITÉRIOS DE ACEITE ===
- Lab não-ACTIVE não consegue escrever exames/config (UI e API).
- Sem regressão nos demais portais nem no SSO (clientes eight/vital8).
- lint + typecheck + testes passando.
- Manter anti-enumeração de e-mail (registerAckResponse) e rate-limit.
- Mudanças de schema apenas se necessário (nenhuma prevista aqui).
```

---

*Notas: o item 1 (gate de status) é o mais impactante — hoje a moderação `PENDING_REVIEW`/`SUSPENDED` é só cosmética no back-office. Os itens 2, 3 e 4 são compartilhados com os outros logins B2B; vale corrigir todos juntos para consistência. A parte crítica de segurança da integração (tenant hopping no Vital8) está no prompt de clínica/Vital8 e cobre a role LABORATORY.*

---

## 4. Re-verificação do código (2026-07-12)

Confirmado no repositório — **nada do prompt abaixo foi implementado ainda** (exceto itens herdados de clínica/SSO):

| Item | Status |
|------|--------|
| Gate `lab.status` em APIs/portal | ❌ Pendente |
| Google removido em logins B2B | ❌ Pendente (Google ainda em lab, farmácia, empresa, clínica unificada) |
| Role pós-login laboratório | ❌ Pendente (`EmployerLoginForm` checa role, mas usa `setError("invalid")` — mensagem genérica; `LaboratoryLoginForm` nem checa) |
| LGPD em `register-laboratory` | ❌ Pendente (`GDPR_CONSENT` manual; `register-organization` já usa `createRegisterConsents`) |
| Geocoding não-bloqueante | ❌ Pendente (bloqueante em `register-laboratory` e `company` PATCH) |
| Comentário 409 CNPJ | ❌ Pendente em lab (já existe em `register-organization`) |
| SSO block não-ACTIVE | ❌ Pendente (`verified` claim ok; authorize não bloqueia) |
| E2E `laboratory-portal.spec.ts` | ❌ Arquivo não existe |
| Unit `laboratory-auth.test.ts` | ❌ Arquivo não existe |
| Multi-org SSO + `account_type` | ✅ Feito (`IMPLEMENTACAO_CLINICA_VITAL8_SSO.md`) |
| Busca pública só ACTIVE | ✅ Feito (`searchLaboratories` em `quote.ts` filtra `status: "ACTIVE"`) |

**Rotas de escrita a proteger** (todas usam `requireLaboratory()` sem status):
- `POST` `src/app/api/laboratory/exams/route.ts`
- `PATCH`/`DELETE` `src/app/api/laboratory/exams/[id]/route.ts`
- `POST` `src/app/api/laboratory/exams/import/route.ts`
- `PATCH` `src/app/api/laboratory/company/route.ts`

**Leituras liberadas:** `GET` em exams, company, import?format=template.

---

## 5. Decisões de produto (registrar no código)

| # | Decisão | Escolha |
|---|---------|---------|
| SUSPENDED no portal | **Permitir visualizar** painel/exames/config; **bloquear escrita** (mesmo que PENDING_REVIEW). Não redirecionar por completo — usuário precisa ver status e contatar suporte. |
| CNPJ 409 | **(a) Manter 409** com comentário igual ao `register-organization`: CNPJ é dado público. |
| SSO não-ACTIVE | **Bloquear no authorize (doctor8)** para roles B2B cujo entity status ≠ ACTIVE (`ORGANIZATION` não tem status — manter como hoje). Mensagem: `"Organização ainda não aprovada ou suspensa."` Claim `verified: false` permanece para consumidores. **Vital8:** adicionar checagem `profile.verified === true` no `signIn` callback para roles B2B (documentar em `DECISOES.md` ou equivalente). |
| Google B2B | **Remover** botão Google de logins dedicados B2B (lab, farmácia, empresa). No login unificado (`/login?portal=organization`), **ocultar Google quando `portal=organization`**. |
| Role pós-login | Usar `setError("roleOnly")` (não `"invalid"`) para acionar banner âmbar com `roleOnlyKey`. Adicionar chave i18n `login.laboratoryOnly` (pt/en/es) + link para `/login` abaixo do alerta. |

---

## 6. PROMPT REFINADO v2 PARA O CURSOR (copiar abaixo)

```
Implemente as correções do portal LABORATÓRIO no doctor8. Commits pequenos (1 por item numerado). Após cada commit: npm run typecheck && npm run test:unit.

NÃO reimplementar: multi-org SSO, account_type no authorize, jwt Vital8 — já feitos.

=== COMMIT 1 — Status gate (API + helper) ===

Arquivo: src/lib/laboratory-auth.ts

- export const LABORATORY_WRITE_BLOCKED_MESSAGE =
    "Laboratório em análise ou suspenso — cadastro de exames indisponível";
- export function isLaboratoryActive(status: string): boolean { return status === "ACTIVE"; }
- type RequireLaboratoryOptions = { requireActive?: boolean }; // default false para GET, true implícito só quando passado
- Alterar assinatura:
    requireLaboratory(allowedRoles?: LaboratoryMemberRole[], options?: RequireLaboratoryOptions)
- Após membership OK, se options?.requireActive && !isLaboratoryActive(membership.laboratory.status):
    return { error: NextResponse.json({ error: LABORATORY_WRITE_BLOCKED_MESSAGE }, { status: 403 }) };

Atualizar rotas de ESCRITA:
  requireLaboratory(undefined, { requireActive: true })  // exams POST, PATCH, DELETE, import POST
  requireLaboratory(["OWNER","ADMIN"], { requireActive: true })  // company PATCH

GET permanece requireLaboratory() sem requireActive.

Teste: src/lib/laboratory-auth.test.ts (vitest, mock auth + db ou testar helpers puros isLaboratoryActive + lógica de mensagem).

=== COMMIT 2 — Status gate (UI portal) ===

Criar src/components/laboratory/LaboratoryStatusBanner.tsx (server ou client):
- Props: status: string
- PENDING_REVIEW: banner âmbar (reutilizar textos do painel)
- SUSPENDED: banner vermelho "Laboratório suspenso — entre em contato com o suporte"
- ACTIVE: null

Atualizar src/app/(dashboard)/laboratorios/layout.tsx:
- Buscar membership via getLaboratoryMembership(session.user.id)
- Renderizar <LaboratoryStatusBanner status={...} /> acima de {children}

Passar readOnly para clientes:
- src/app/(dashboard)/laboratorios/exames/page.tsx → buscar status server-side, passar readOnly={!isLaboratoryActive(status)} para LaboratoryExamCatalogClient
- idem configuracoes → LaboratorySettingsClient

LaboratoryExamCatalogClient + LaboratorySettingsClient:
- prop readOnly?: boolean — desabilitar inputs/botões/import/delete/add; mostrar nota "Disponível após aprovação"

=== COMMIT 3 — Login: remover Google + validar role ===

Arquivos B2B (remover GoogleSignInButton, LoginDivider, handleGoogleSignIn, googleLoading state):
- src/components/laboratory/LaboratoryLoginForm.tsx
- src/components/pharmacy-store/PharmacyStoreLoginForm.tsx
- src/components/employer/EmployerLoginForm.tsx

src/app/(auth)/login/page.tsx:
- Se portal === "organization", não renderizar GoogleSignInButton nem LoginDivider

LaboratoryLoginForm (e padronizar PharmacyStoreLoginForm):
- Após waitForAuthenticatedSession, se role !== "LABORATORY" && !== "ADMIN":
    await signOut({ redirect: false }); setError("roleOnly"); setLoading(false); return;
- roleOnlyKey="login.laboratoryOnly"
- Abaixo de LoginAlerts, se error === "roleOnly": Link href="/login"

i18n src/lib/i18n/translations.ts (en/pt/es):
  "login.laboratoryOnly": "This account is not a laboratory. Use the correct login." / "Esta conta não é de laboratório. Use o login correto." / ...

Corrigir EmployerLoginForm: trocar setError("invalid") por setError("roleOnly") + login.employerOnly (nova chave i18n).

Teste unit: exportar função pura validateB2BPortalRole(role, expected, allowAdmin?) ou testar via pequeno helper em src/lib/b2b-login-gate.ts.

=== COMMIT 4 — LGPD + geocoding + CNPJ comment ===

src/app/api/auth/register-laboratory/route.ts:
- import { createRegisterConsents } from "@/lib/consent/register-consents"
- Substituir consent.createMany manual por:
    await createRegisterConsents(tx, newUser.id, ip, userAgent, {
      acceptedTerms: true, acceptedPrivacy: true, acceptedLgpd: true, acceptedGdpr: parsed.acceptedGdpr,
    });
- Comentário antes do 409 CNPJ (copiar de register-organization)
- Geocoding: extrair função scheduleLaboratoryGeocode(labId, addressParts) que roda void (fire-and-forget):
    void geocodeAddress(...).then(geo => geo && db.laboratory.update(...)).catch(err => console.error(...))
  Chamar após responder 201 (ou usar next/server after() se disponível na versão do Next).
  Nunca await geocode no caminho crítico; try/catch interno.

=== COMMIT 5 — SSO block não-ACTIVE ===

src/lib/sso/sso-orgs.ts:
- export async function getB2BOrganizationStatus(userId, role, organizationId): Promise<string | null>
  Retorna status da entidade (Laboratory.status, PharmacyStore.status, etc.) ou null se ORGANIZATION.

src/app/api/oauth/authorize/route.ts:
- Após resolver organizationId, se isB2BSsoRole(role) && role !== "ORGANIZATION":
    const entityStatus = await getB2BOrganizationStatus(...)
    if (entityStatus && entityStatus !== "ACTIVE")
      return oauthError(..., "access_denied", "Organização ainda não aprovada ou suspensa.", state)

src/lib/sso/sso-userinfo.ts:
- Comentário no case LABORATORY: verified=false para PENDING_REVIEW/SUSPENDED; authorize bloqueia SSO; consumidores devem respeitar verified.

Vital8 (repo separado): no signIn callback, se profile.verified !== true && role B2B → return false. Documentar.

Teste: estender sso-orgs.test.ts ou novo teste para getB2BOrganizationStatus.

=== COMMIT 6 — E2E ===

Criar e2e/laboratory-portal.spec.ts seguindo padrão e2e/dentist-portal.spec.ts + helpers auth.ts.

Cenários:
a) Cadastro fluxo (pode usar API + verifyEmailAsAdmin se existir helper admin) → painel com texto "em revisão" / "revisão"
b) Lab PENDING_REVIEW: POST /api/laboratory/exams → 403; UI botão Salvar disabled
c) Paciente em /laboratorios/login → roleOnly, permanece na página
d) GET /api/public/laboratory/network/search?city=São Paulo → resultados só status ACTIVE (assert via seed ou admin activate)

Adicionar em e2e/helpers/auth.ts se necessário: e2eLaboratoryCredentials(), loginLaboratory().

=== CRITÉRIOS FINAIS ===
npm run lint && npm run typecheck && npm run test:unit && npm run test:e2e -- e2e/laboratory-portal.spec.ts
Sem regressão em e2e/sso-oauth.spec.ts.
```

---

## 7. PROMPT VITAL8 — bloqueio `verified` no SSO Doctor8

Repositório: `C:\Users\diego\Documents\vital8`  
Contexto: Doctor8 envia claim `verified: true` só quando a entidade B2B está `ACTIVE` (lab/farmácia). Clínica (`ORGANIZATION`) e empresa (`EMPLOYER`) permanecem `verified: true` sempre. Hoje o Vital8 checa `email_verified` mas **ignora `verified`** — lab `PENDING_REVIEW` pode entrar após auto-provision ou membership existente.

**Defesa em camadas:** doctor8 bloqueia no `authorize` (commit 5 acima) **e** Vital8 valida `verified` no `signIn` (defesa se authorize for contornado ou token antigo).

### Copiar no Cursor (workspace vital8)

```
Implemente checagem de verified no SSO Doctor8. Commit único; npm test && npx tsc --noEmit ao fim.

=== Arquivo: src/lib/auth/auth.ts — callback signIn ===

Após o bloco email_verified (linha ~318) e ANTES de isDoctor8B2BRole/org_cnpj:

      if (isDoctor8B2BRole(p?.role) && p?.verified !== true) {
        console.warn(
          "SSO doctor8 bloqueado: organização não aprovada ou suspensa (verified=false), sub=",
          p?.sub,
          "role=",
          p?.role,
          "org_type=",
          p?.org_type,
        );
        return "/entrar?error=Doctor8OrgNaoAprovada";
      }

Notas:
- ORGANIZATION/EMPLOYER chegam com verified=true do userinfo — não afetados.
- LABORATORY PENDING_REVIEW/SUSPENDED e PHARMACY_STORE não-ACTIVE → verified=false → bloqueado.
- Não chamar provisionClinicFromDoctor8 para contas bloqueadas (check vem antes do provisioning).

=== Arquivo: src/modules/core/components/doctor8-login-ctas.tsx ===

Em resolveDoctor8SsoError, adicionar case:

    case "Doctor8OrgNaoAprovada":
      return "Sua organização na Doctor8 ainda não foi aprovada ou está suspensa. Aguarde a moderação ou contate o suporte Doctor8.";

=== Arquivo: DECISOES.md ===

Adicionar seção:

## SSO Doctor8 — claim verified (2026-07-12)

**Decisão:** Vital8 rejeita SSO quando `profile.verified !== true` para roles B2B Doctor8.

**Motivo:** Laboratórios e farmácias em `PENDING_REVIEW`/`SUSPENDED` não devem operar ERP parceiro. Doctor8 também bloqueia no `/api/oauth/authorize` (defesa primária).

**Escopo:** Clínica (`ORGANIZATION`) permanece `verified: true` no userinfo Doctor8 — auto-provisioning inalterado.

**Erro UX:** redirect `/entrar?error=Doctor8OrgNaoAprovada`.

=== Testes ===

e2e/auth.spec.ts — adicionar:
  test("maps Doctor8OrgNaoAprovada error code", async ({ page }) => {
    await page.goto("/entrar?error=Doctor8OrgNaoAprovada");
    await expect(page.getByText(/não foi aprovada|moderação/i)).toBeVisible();
  });

Opcional unit (vitest): extrair helper requiresDoctor8OrgVerified(profile) e testar
  - LABORATORY + verified false → false
  - ORGANIZATION + verified true → true
  - undefined verified + B2B → tratar como false (fail-closed)

=== Critérios ===
- Lab PENDING_REVIEW no Doctor8 não completa SSO no Vital8.
- Clínica ACTIVE (verified true) continua auto-provisionando.
- npm test && npx tsc --noEmit passando.
```

### Round-trip esperado após doctor8 + vital8

| Estado lab Doctor8 | authorize doctor8 | userinfo `verified` | Vital8 signIn |
|--------------------|-------------------|---------------------|---------------|
| PENDING_REVIEW     | `access_denied`   | `false`             | `Doctor8OrgNaoAprovada` |
| SUSPENDED          | `access_denied`   | `false`             | `Doctor8OrgNaoAprovada` |
| ACTIVE             | code OK           | `true`              | login OK |
| Clínica ORGANIZATION | code OK         | `true`              | login + provision OK |
