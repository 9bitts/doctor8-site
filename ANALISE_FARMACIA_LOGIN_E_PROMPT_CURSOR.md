# Análise — Login/Cadastro de Farmácia + Prompt para o Cursor

Data: 2026-07-12 · Análise sem alteração de código (conforme CLAUDE.md)
Escopo: doctor8, role `PHARMACY_STORE` (drogaria) + o farmacêutico que opera na loja (`PROFESSIONAL` com especialidade de farmacêutico). Integração SSO/Vital8: ver `ANALISE_CLINICA_CONSULTORIO_LOGIN_VITAL8_E_PROMPT_CURSOR.md` (farmácia é uma das 4 roles B2B do mesmo fluxo).

---

## 1. Fluxo mapeado

Há **dois logins distintos** sob `/farmacias`:

**A) Loja / drogaria (role `PHARMACY_STORE`):**
`/farmacias/cadastro` → `POST /api/auth/register-pharmacy-store` → valida CNPJ, telefone, rate-limit, anti-enumeração (`handleExistingB2BRegistration`) → cria `User (PHARMACY_STORE, BR)` + `PharmacyStore (status PENDING_REVIEW)` + `PharmacyStoreMember OWNER` + consentimentos → geocoding → verificação de e-mail → `/farmacias/painel`. Login: `/farmacias/login` (`PharmacyStoreLoginForm`, tema teal). Portal: painel, estoque, pedidos, equipe, configuracoes. Guard: `requirePharmacyStore` (RBAC OWNER/ADMIN/STAFF em `src/lib/pharmacy-store-auth.ts`).

**B) Farmacêutico da loja (role `PROFESSIONAL`, especialidade farmacêutico):**
Login próprio `/farmacias/farmaceutico/login` (`PharmacyStorePharmacistLoginForm`) → valida a especialidade pós-login → `/farmacias/farmaceutico/painel` (re-checa `isPharmacistSpecialty`). Cadastro do farmacêutico como profissional de saúde: `?portal=pharmacist&profession=farmaceutico` (fluxo do register profissional, portal separado `/farmaceutico`).

**Integração-chave — validação/dispensação de receita:** `/farmacias/validar/[token]` + `POST /api/pharmacy-store/prescriptions/validate` → marca token `DISPENSED`, grava `pharmacyDispensedAt/StoreId` na `Prescription`. Autorização em `src/lib/pharmacy-prescription-validate-auth.ts` (`authorizePharmacyPrescriptionValidate`). Guards de dispensação (pedido pago) em `src/lib/pharmacy-network/dispense-guards.ts`.

**Pontos positivos:** anti-enumeração de e-mail (loja), rate-limit, CNPJ com dígito verificador, `status PENDING_REVIEW` por padrão, **o login do farmacêutico valida a especialidade pós-login** (melhor que os demais B2B), guard de "pedido pago" antes da dispensação, RBAC interno bem fatorado.

## 2. Problemas encontrados

| # | Severidade | Problema | Arquivo |
|---|-----------|----------|---------|
| F1 | **Alta (segurança/legal)** | Dispensação de receita por **farmacêutico PROFESSIONAL não valida vínculo com a loja**: `authorizePharmacyPrescriptionValidate` só checa `isPharmacistSpecialty`. Qualquer farmacêutico da plataforma pode **marcar como DISPENSED uma receita atribuída a qualquer farmácia** (`storeId` vem do parâmetro/token). Para dispensação de medicamentos (incl. controlados) isso é uma falha de autorização — falta exigir `PharmacyStoreMember` ativo na loja `storeId` | `src/lib/pharmacy-prescription-validate-auth.ts`, `src/app/api/pharmacy-store/prescriptions/validate/route.ts` (ramo PROFESSIONAL, ~linha 157) |
| F2 | **Alta** | `status` da loja **não é aplicado no acesso**: `requirePharmacyStore` e o layout ignoram `store.status`. Loja `PENDING_REVIEW`/`SUSPENDED` gerencia **estoque e pedidos** via API normalmente — só o painel mostra banner | `src/lib/pharmacy-store-auth.ts`, `src/app/(dashboard)/farmacias/layout.tsx`, `src/app/api/pharmacy-store/{inventory,orders}/**` |
| F3 | Média (segurança) | `/farmacias/validar/[token]` está sob o prefixo **público** `/farmacias/validar/` no middleware; o gate de role usa igualdade exata (`pathname === "/farmacias/validar"`) e **nunca cobre a rota com token**. A page só checa presença de sessão, não a role — qualquer usuário autenticado renderiza a tela (a API é o guard real). Tornar a page role-aware | `src/middleware.ts` (linhas ~99, ~678), `src/app/farmacias/validar/[token]/page.tsx` |
| F4 | Média (UX) | `PharmacyStoreLoginForm`: **botão Google** em login B2B (conta Google não tem role/membership) e **sem validação de role pós-login** (`safePostLoginUrl`) — paciente que entra em `/farmacias/login` é redirecionado em silêncio ao painel de paciente. (O login do **farmacêutico** já valida; a **loja** não) | `src/components/pharmacy-store/PharmacyStoreLoginForm.tsx` |
| F5 | Baixa | Layout `/farmacias` libera **qualquer `PROFESSIONAL`** (não só farmacêutico); idem no middleware para `PHARMACY_STORE_PHARMACIST_ROUTES`. Hoje é compensado por checagem de especialidade página a página (ex.: `farmaceutico/painel`), mas o gate amplo é frágil | `src/app/(dashboard)/farmacias/layout.tsx`, `src/middleware.ts` (~linha 687) |
| F6 | Média (compliance) | Consentimento gravado como `GDPR_CONSENT` com `region: "BR"` hardcoded — deveria registrar **LGPD** (mesmo desvio de clínica/laboratório) | `src/app/api/auth/register-pharmacy-store/route.ts` |
| F7 | Média (perf) | `geocodeAddress` **bloqueante** no caminho do cadastro (após a transação, antes de responder) — geocoder lento/instável trava o registro | mesmo arquivo (linhas ~194-209) |
| F8 | Baixa | `409 "CNPJ já cadastrado"` permite enumeração de CNPJ (dado público — decisão a registrar) | mesmo arquivo (linha ~129) |
| F9 | Média (qualidade) | Zero cobertura E2E de farmácia (cadastro loja, login loja/farmacêutico, gate de status, validação de receita, estoque, pedidos) | `e2e/` |

*Herdados da análise de clínica/Vital8 (valem para a role PHARMACY_STORE): tenant hopping no callback jwt do Vital8 (CRÍTICO), `resolveB2BClaims` com `findFirst` sem seletor multi-loja, hint `account_type` ignorado no authorize. Ver aquele prompt — não repetir.*

---

## 3. PROMPT PARA O CURSOR (copiar tudo abaixo)

```
Você vai corrigir e melhorar o login/cadastro e os portais de FARMÁCIA no projeto doctor8 (Next.js App Router + NextAuth + Prisma). Há dois atores: a LOJA (role PHARMACY_STORE, RBAC PharmacyStoreMember OWNER/ADMIN/STAFF) e o FARMACÊUTICO da loja (role PROFESSIONAL com especialidade de farmacêutico). Não altere outros portais além do necessário. Commits pequenos por item; typecheck + testes ao fim de cada etapa.

NOTA: se o prompt de CLÍNICA/VITAL8 já foi aplicado (callback jwt do vital8, seletor multi-org no SSO, hint account_type), NÃO reimplemente — já cobre a role PHARMACY_STORE.

CONTEXTO:
- Cadastro loja: /farmacias/cadastro → POST /api/auth/register-pharmacy-store → PharmacyStore status PENDING_REVIEW.
- Logins: /farmacias/login (loja) e /farmacias/farmaceutico/login (farmacêutico).
- Guards: requirePharmacyStore (src/lib/pharmacy-store-auth.ts); dispensação em src/lib/pharmacy-prescription-validate-auth.ts + src/app/api/pharmacy-store/prescriptions/validate/route.ts. Status enum PharmacyStore: PENDING_REVIEW | ACTIVE | SUSPENDED.

=== CORREÇÕES (ordem de prioridade) ===

1) SEGURANÇA — exigir vínculo do farmacêutico com a loja na dispensação
Arquivos: src/lib/pharmacy-prescription-validate-auth.ts e src/app/api/pharmacy-store/prescriptions/validate/route.ts
Hoje, no ramo role === "PROFESSIONAL", só se verifica isPharmacistSpecialty — qualquer farmacêutico da plataforma pode validar/dispensar uma receita atribuída a QUALQUER loja (storeId vem do parâmetro/token).
Correção:
  a) Em authorizePharmacyPrescriptionValidate, quando role === "PROFESSIONAL", exigir também que o usuário seja PharmacyStoreMember ATIVO da loja storeId (o storeId resolvido de pharmacyStoreId || rowPharmacyStoreId). Se não houver storeId ou não houver vínculo ativo → 403 "Farmacêutico não vinculado a esta farmácia".
  b) Garantir que o storeId usado na autorização seja o MESMO gravado no DISPENSED (não confiar em um pharmacyStoreId do body que difira do row.pharmacyStoreId quando o token já tem loja). Preferir row.pharmacyStoreId quando existir.
  c) Auditar a dispensação (createAuditLog) com userId, storeId, prescriptionId, tokenId.
  d) Testes: farmacêutico vinculado à loja → dispensa OK; farmacêutico NÃO vinculado → 403; membro STAFF da loja → conforme política; paciente/role errada → 403.

2) Aplicar o status da loja no acesso (portal + APIs)
requirePharmacyStore e o layout ignoram store.status; loja PENDING_REVIEW/SUSPENDED opera estoque/pedidos normalmente.
Correção:
  a) Em src/lib/pharmacy-store-auth.ts, adicionar helper isPharmacyStoreActive(status) e opção requireActive.
  b) Bloquear operações de ESCRITA (POST/PUT/PATCH/DELETE) em src/app/api/pharmacy-store/{inventory,orders,members,...} quando status !== "ACTIVE" → 403 com mensagem clara. GET liberado para o próprio.
  c) No layout/páginas (estoque, pedidos, configuracoes), quando status !== "ACTIVE", exibir banner e desabilitar ações de escrita; decidir com o produto se SUSPENDED bloqueia o acesso por completo (redirect para /farmacias/painel).
  d) Testes: PENDING_REVIEW/SUSPENDED tentando criar item de estoque → 403; ACTIVE → 201.

3) Proteger a página de validação de receita por role
Arquivos: src/middleware.ts e src/app/farmacias/validar/[token]/page.tsx
A rota /farmacias/validar/[token] cai no prefixo público /farmacias/validar/, e o gate de role do middleware usa igualdade exata (=== "/farmacias/validar"), nunca cobrindo o token. A page só checa sessão presente.
Correção:
  a) Na page, além de exigir sessão, validar a role: permitir apenas PHARMACY_STORE (membro ativo) ou PROFESSIONAL farmacêutico (ou ADMIN); caso contrário, redirecionar para /farmacias/login com mensagem. (A API já valida; isto evita expor a tela.)
  b) Ajustar o middleware para que o gate de PHARMACY_VALIDATE_HUB cubra também as subrotas com token (usar startsWith em vez de igualdade exata), mantendo a rota acessível a PHARMACY_STORE/PROFESSIONAL/ADMIN e exigindo login.

4) Login da LOJA — remover Google e validar role pós-login
Arquivo: src/components/pharmacy-store/PharmacyStoreLoginForm.tsx
  a) Remover GoogleSignInButton/handleGoogleSignIn (conta Google não tem role PHARMACY_STORE nem membership). Manter só credentials. (Aplicar a mesma decisão aos outros logins B2B: laboratório, empresa, clínica.)
  b) Após waitForAuthenticatedSession, se role !== "PHARMACY_STORE" (e !== "ADMIN"), mostrar erro "Esta conta não é de farmácia" e link para /login — não redirecionar em silêncio. Reaproveitar o padrão que o PharmacyStorePharmacistLoginForm já usa (canAccessPharmacyPharmacistPortal).

5) Endurecer os gates de rota amplos
  a) O layout src/app/(dashboard)/farmacias/layout.tsx libera qualquer PROFESSIONAL; e o middleware libera qualquer PROFESSIONAL para PHARMACY_STORE_PHARMACIST_ROUTES. Estreitar para farmacêutico: onde a checagem depende de especialidade, mover a verificação isPharmacistSpecialty para um ponto comum (guard util) e garantir que todas as páginas /farmacias/farmaceutico/** a apliquem (hoje só o painel aplica).

6) Consentimento LGPD no cadastro
Arquivo: src/app/api/auth/register-pharmacy-store/route.ts — registrar consentimento LGPD (não GDPR) para region BR, alinhando com createRegisterConsents/requiresLgpd. Idem nos outros register-* B2B se pendente.

7) Geocoding fora do caminho da requisição
Mesmo arquivo (linhas ~194-209): tornar geocodeAddress best-effort não-bloqueante (background/fila ou timeout curto que nunca derruba o cadastro).

8) Enumeração de CNPJ (decisão)
Mesmo arquivo: decidir manter 409 "CNPJ já cadastrado" (documentar) ou padronizar resposta genérica como no e-mail.

=== TESTES ===
9) E2E (e2e/pharmacy-portal.spec.ts):
  a) Cadastro loja → verificação de e-mail → login → /farmacias/painel com banner "em análise".
  b) Loja PENDING_REVIEW tenta criar item de estoque → bloqueado (UI + 403 API).
  c) Paciente logando em /farmacias/login → mensagem de role inválida.
  d) Farmacêutico NÃO vinculado tentando dispensar receita da loja X → 403; vinculado → sucesso.
  e) Busca pública /farmacias/buscar só mostra lojas ACTIVE.
10) Unit: authorizePharmacyPrescriptionValidate (vínculo de loja); requirePharmacyStore com requireActive; role-gate do login da loja.

=== CRITÉRIOS DE ACEITE ===
- Farmacêutico só dispensa receita em loja onde tem vínculo ativo.
- Loja não-ACTIVE não escreve estoque/pedidos (UI e API).
- Sem regressão nos demais portais nem no SSO (eight/vital8).
- lint + typecheck + testes passando.
- Manter anti-enumeração de e-mail e rate-limit. Sem mudanças de schema previstas.
```

---

*Notas: o item 1 (vínculo do farmacêutico na dispensação) é o mais crítico — é um fluxo de dispensação de medicamentos com implicação legal. O item 2 (status da loja) repete o padrão já visto em laboratório. Itens 4, 6, 7, 8 são comuns aos logins B2B; vale corrigir todos juntos. A falha crítica de segurança da integração (tenant hopping no Vital8) está no prompt de clínica/Vital8 e cobre a role PHARMACY_STORE.*
