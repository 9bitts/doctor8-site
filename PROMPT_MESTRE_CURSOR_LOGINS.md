# Prompt-mestre para o Cursor — Correções de Login/Cadastro (doctor8 + vital8)

Consolida os seis documentos de análise (`ANALISE_*_LOGIN_E_PROMPT_CURSOR.md`). Rodar por fases, de cima para baixo. Antes de começar, decidir os itens da seção "Decisões de produto".

---

## Decisões de produto a confirmar ANTES de rodar (respondê-las guia alguns itens)

1. Profissionais sem registro no conselho (CRN/CRO) devem ficar **ocultos** da busca de pacientes/agendamento? (nutricionista, dentista)
2. B2B em análise (`PENDING_REVIEW`/`SUSPENDED`) pode acessar apps parceiros via SSO (Vital8)? (laboratório, farmácia)
3. Cadastro de clínica via Vital8: **auto-provisionar** conta no primeiro SSO (Opção A) ou **fluxo de vinculação explícito** (Opção B)?
4. ASO de saúde ocupacional: o resultado de aptidão é assinado pelo **médico do trabalho** ou transcrito pela **empresa (RH/SST)**?
5. Multi-papel: um mesmo usuário poderá atuar em mais de um contexto (ex.: profissional de saúde que também é médico do trabalho)? Hoje é bloqueado.

---

## PROMPT (copiar tudo abaixo para o Cursor)

```
Você vai corrigir e endurecer os fluxos de LOGIN e CADASTRO de dois projetos integrados:
- doctor8: Next.js (App Router) + NextAuth + Prisma. Provedor OIDC/SSO. Portais de profissionais de saúde (nutricionista, dentista, farmacêutico...) e B2B (ORGANIZATION=clínica, EMPLOYER=empresa ocupacional, PHARMACY_STORE=farmácia, LABORATORY=laboratório).
- vital8: Next.js 14 + Auth.js v5 + Prisma (ERP multi-tenant de clínicas) que consome o SSO do doctor8 (provider em src/lib/auth/doctor8-provider.ts, callbacks em src/lib/auth/auth.ts).

REGRAS GERAIS:
- Trabalhe em fases, na ordem abaixo. Um commit pequeno por item. Ao fim de cada item rode lint + typecheck + testes.
- Não altere schema Prisma exceto onde indicado (e sempre com migração).
- Não vaze mensagens que permitam enumeração de e-mail (manter os registerAckResponse/handleExistingB2BRegistration existentes).
- Não altere contratos públicos de API sem necessidade; quando alterar, documente no PR.
- Preserve os comportamentos B2B que JÁ estão corretos (ex.: no doctor8 o login de EMPRESA já valida role e não tem Google; o login do FARMACÊUTICO já valida especialidade; existe EmployerCompanySwitcher; aso-pdf já aceita o médico; invites/accept já usam canAccept*/RoleConflict). Não regrida esses.

============================================================
FASE 0 — SEGURANÇA CRÍTICA (fazer primeiro)
============================================================

0.1 [vital8] Tenant hopping no callback jwt
Arquivo: src/lib/auth/auth.ts
O bloco trigger === "update" copia organizationId/role/branchId do objeto session (controlado pelo cliente via useSession().update) direto para o token, sem validar membership → qualquer usuário logado pode se promover a OWNER de outra organização.
Correção: quando trigger === "update" e updateSession.organizationId presente, chamar resolveActiveMembership(token.id, updateSession.organizationId) e usar SOMENTE organizationId/role retornados do banco; ignorar o role do cliente. Validar branchId pertence à org do token. Sem membership ativo → manter token atual.
Teste: usuário de org A tenta update({organizationId: orgB, role: "OWNER"}) sem membership em B → token permanece em A.

0.2 [doctor8] Farmácia: dispensação de receita sem vínculo com a loja
Arquivos: src/lib/pharmacy-prescription-validate-auth.ts, src/app/api/pharmacy-store/prescriptions/validate/route.ts
Hoje, para role PROFESSIONAL só se checa isPharmacistSpecialty — qualquer farmacêutico dispensa em QUALQUER loja.
Correção: exigir PharmacyStoreMember ATIVO na loja storeId (resolver storeId de row.pharmacyStoreId prioritariamente; não confiar em pharmacyStoreId do body divergente). Sem vínculo → 403 "Farmacêutico não vinculado a esta farmácia". Auditar a dispensação (createAuditLog: userId, storeId, prescriptionId, tokenId).
Teste: farmacêutico vinculado → OK; não vinculado → 403.

0.3 [doctor8] Dentista: IDOR via storageKey nas fotos clínicas
Arquivo: src/app/api/dentist/charts/[id]/photos/route.ts
O POST aceita storageKey livre do cliente; o GET gera signed URL para ela → possível leitura de objeto S3 de outro paciente/tenant.
Correção: validar no POST que a storageKey pertence a um upload do próprio profissional (prefixo por usuário e/ou registro de upload). Buscar "storageKey" em src/app/api/** e aplicar a mesma validação onde houver o mesmo padrão. Limitar caption (max 2000) e toothNumbers (máx 64, faixa FDI 11-48/51-85). Teste: storageKey de outro usuário → 403.

0.4 [vital8] Login sem rate-limit + signup fraco
Arquivos: src/lib/auth/auth.ts, src/modules/core/actions/auth.actions.ts
(a) LoginForm chama signIn("credentials") direto, driblando checkLoginRateLimit. Mover o rate-limit para DENTRO do authorize() do provider Credentials (email + IP), garantindo que todo login passe pelo limite.
(b) signupAction: adicionar rate-limit (email+IP); anti-enumeração (e-mail já existente → resposta genérica pedindo verificação, não "E-mail já cadastrado"); validar CNPJ com dígito verificador (portar isValidCnpj do doctor8) e impor unicidade de documentNumber; criar verificação de e-mail (campo emailVerified + migração) e bloquear login de conta não verificada — se o produto preferir manter login imediato no trial, implementar ao menos rate-limit + anti-enum + CNPJ e registrar a decisão em DECISOES.md.

0.5 [doctor8] Empresas: imutabilidade e autoria do ASO + eSocial idempotente
Arquivo: src/app/api/employer/exams/[id]/route.ts (PATCH)
Hoje um exame COMPLETED com asoResult pode ser reeditado sem trava e cada PATCH re-enfileira S-2220 (duplica).
Correção:
  - Máquina de estados: ASO emitido (COMPLETED + asoResult) fica imutável (asoResult, asoRestrictions, physicianName/Crm, completedAt) → 409 "ASO já emitido; use retificação". Retificação só por fluxo explícito e auditado (novo estado/campo + motivo) que gere evento eSocial de correção.
  - eSocial idempotente: só enfileirar S-2220 na TRANSIÇÃO para COMPLETED+asoResult (comparar com existing) e registrar que já foi enfileirado.
  - APTO_COM_RESTRICAO exige asoRestrictions não-vazio.
  - Autoria (conforme decisão de produto 4): se o ASO é ato médico, permitir asoResult apenas a OCCUPATIONAL_PHYSICIAN vinculado (userHasCompanyAccess); se transcrito pela empresa, exigir physicianName/Crm e marcar origem "transcrito", sempre com auditoria.
  - Testes: re-PATCH de ASO emitido → 409; um único S-2220 por conclusão; APTO_COM_RESTRICAO sem restrição → 400.

============================================================
FASE 1 — GATES DE ACESSO (status e perfil)
============================================================

1.1 [doctor8] Nutricionista: gate de perfil ausente no layout
Arquivo: src/app/(dashboard)/nutricionista/layout.tsx
Hoje `if (profile && !isNutritionistSpecialty(...))` deixa PROFESSIONAL SEM perfil acessar submódulos (anamnese, antropometria...). Corrigir: sem professionalProfile → redirect("/onboarding?portal=nutritionist"); manter redirect para /professional quando o perfil existir com outra specialty. Aplicar o mesmo padrão em /enfermeiro, /farmaceutico e /odontologo se tiverem o mesmo gap.

1.2 [doctor8] Laboratório: aplicar status no acesso
Arquivos: src/lib/laboratory-auth.ts, src/app/(dashboard)/laboratorios/layout.tsx, src/app/api/laboratory/**
requireLaboratory e o layout ignoram lab.status. Adicionar isLaboratoryActive(status) e opção requireActive; bloquear ESCRITA (POST/PUT/PATCH/DELETE) quando status !== "ACTIVE" (403 com mensagem); nas páginas, desabilitar ações de escrita e mostrar banner; decidir se SUSPENDED bloqueia acesso total (redirect ao painel). Testes: PENDING/SUSPENDED cria exame → 403; ACTIVE → 201.

1.3 [doctor8] Farmácia (loja): aplicar status no acesso
Arquivos: src/lib/pharmacy-store-auth.ts, src/app/(dashboard)/farmacias/layout.tsx, src/app/api/pharmacy-store/{inventory,orders,members,...}
Mesmo padrão do 1.2: isPharmacyStoreActive(status)/requireActive; bloquear escrita de estoque/pedidos quando status !== "ACTIVE"; banner + ações desabilitadas.

1.4 [doctor8] Farmácia: proteger a página de validação de receita por role
Arquivos: src/middleware.ts, src/app/farmacias/validar/[token]/page.tsx
A rota /farmacias/validar/[token] cai no prefixo público e o gate de role usa igualdade exata (nunca cobre o token); a page só checa sessão presente. Corrigir: na page, validar role (PHARMACY_STORE membro ativo, ou PROFESSIONAL farmacêutico, ou ADMIN) e redirecionar caso contrário; no middleware, cobrir as subrotas com token (startsWith) mantendo login obrigatório.

1.5 [doctor8] Estreitar gates amplos de PROFESSIONAL na área de farmácia
Arquivos: src/app/(dashboard)/farmacias/layout.tsx, src/middleware.ts
O layout e o middleware liberam QUALQUER PROFESSIONAL para as rotas do farmacêutico; só o painel re-checa isPharmacistSpecialty. Centralizar a checagem de especialidade em um util e aplicá-la em todas as páginas /farmacias/farmaceutico/**.

============================================================
FASE 2 — CONSISTÊNCIA DOS LOGINS B2B (aplicar a TODOS de uma vez)
============================================================
Portais afetados: laboratório, farmácia (loja), médico do trabalho. (Empresa e clínica já estão OK em role/Google — não regredir.)

2.1 Remover o botão Google dos logins B2B onde não faz sentido
Arquivos: src/components/laboratory/LaboratoryLoginForm.tsx, src/components/pharmacy-store/PharmacyStoreLoginForm.tsx, src/components/employer/OccupationalPhysicianLoginForm.tsx
Contas B2B/por-convite não têm vínculo Google nem membership resolvível pelo Google. Remover GoogleSignInButton/handleGoogleSignIn (manter só credentials).

2.2 Validar role no pós-login onde falta
Arquivos: LaboratoryLoginForm.tsx, PharmacyStoreLoginForm.tsx
Após waitForAuthenticatedSession, se a role não for a esperada (LABORATORY / PHARMACY_STORE, além de ADMIN), NÃO redirecionar em silêncio: mostrar erro "Esta conta não é de <portal>" e link para /login. Reaproveitar o padrão já usado em EmployerLoginForm / PharmacyStorePharmacistLoginForm (roleOnlyKey/canAccess...).

2.3 Consentimento LGPD (não GDPR) em todos os cadastros BR
Arquivos: src/app/api/auth/register-organization/route.ts, register-laboratory, register-pharmacy-store, register-employer, register-employer-staff, register-occupational-physician
region é hardcoded "BR" mas grava ConsentType.GDPR_CONSENT. Registrar consentimento LGPD, alinhando com createRegisterConsents/requiresLgpd.

2.4 Geocoding fora do caminho da requisição
Arquivos: register-laboratory/route.ts, register-pharmacy-store/route.ts
geocodeAddress roda bloqueante antes de responder o cadastro. Tornar best-effort (background/fila ou timeout curto) que nunca derrube ou atrase o registro.

2.5 Enumeração de CNPJ (decisão registrada)
Arquivos: register-organization, register-laboratory, register-pharmacy-store, register-employer
Decidir: manter 409 "CNPJ já cadastrado" (documentar em comentário, CNPJ é público) ou padronizar resposta genérica como no e-mail. Aplicar de forma consistente.

2.6 Endurecer os endpoints GET de convite
Arquivos: register-occupational-physician/route.ts, register-employer-staff/route.ts (handlers GET)
Retornam email/nome/CRM ao portador do token via querystring. Minimizar dados retornados, não logar a querystring, garantir expiração + uso único + rate-limit por token/IP.

============================================================
FASE 3 — BUGS E UX DO CADASTRO DE PROFISSIONAL (nutricionista/dentista)
============================================================

3.1 professionSlug obsoleto + parsing de params no cadastro profissional
Arquivo: src/app/(auth)/register/professional/signup/page.tsx
Bug: chooseRole("PROFESSIONAL") não limpa professionSlug → quem escolhe "nutricionista"/"dentista", volta e escolhe "profissional de saúde" é cadastrado com a specialty errada. Também há parsing conflitante de (portal, role, profession). Corrigir: consolidar num resolver puro único com precedência portal > role > profession, aplicado uma vez; chooseRole("PROFESSIONAL") deve limpar o slug; unificar os dois useEffect de idioma (URL > localStorage > navigator). Teste de regressão: nutricionista/dentista → voltar → profissional genérico → aterrissa em /professional (não /nutricionista nem /odontologo).

3.2 Specialty desatualizada no JWT após editar settings
Arquivo: src/app/(dashboard)/professional/settings/page.tsx
Ao salvar specialty, chamar update({ refreshSpecialty: true }) do useSession (o callback jwt em src/lib/auth.ts já suporta). Vale para os re-exports (/nutricionista/settings, /odontologo/settings, etc.).

3.3 Redirect de ADMIN nos dashboards de portal
Arquivos: src/app/(dashboard)/nutricionista/page.tsx, src/app/(dashboard)/odontologo/page.tsx
`if (role !== "PROFESSIONAL") redirect("/patient")` expulsa ADMIN que o layout permite. Trocar por redirect(resolveRoleHome(role)) e alinhar layout+página.

3.4 Banner/gate de registro no conselho (CRN/CRO)
Perfis nascem com licenseNumber:"" e consultPrice:0. Adicionar banner persistente no dashboard (/nutricionista, /odontologo, /professional) com link para settings; validar formato do conselho no settings (councilKey crn_nutrition/cro já existe em src/lib/profession-label.ts). Ocultar da busca pública/agendamento profissionais com licenseNumber vazio — conforme decisão de produto 1 (verificar src/lib/providers.ts e rotas de listagem).

3.5 Header do step 2 por profissão + landing slugs
Arquivos: src/components/auth/register-shared.tsx, src/app/(auth)/register/professional/[slug]/page.tsx
Adicionar variantes de header (ícone/tema + chave i18n reg.nutritionistAccount/dentistAccount/... em pt/en/es) para nutricionista, dentista, enfermeiro, farmacêutico (o botão Google já é específico). Gerar generateStaticParams a partir da MESMA fonte de isValidProfessionSlug (inclui "dentista", hoje ausente).

3.6 Higiene de código dos portais
- src/lib/dentistry/dentistry-api.ts: remover a cláusula morta `&& role !== "ADMIN"` de requireDentistProfessional (ou implementar de fato o caminho ADMIN, escolhendo UMA semântica consistente com requireNutritionProfessional).
- src/app/(dashboard)/odontologo/jit/page.tsx: re-exportar direto de professional/jit (hoje passa por psychologist/jit).
- Extrair componente compartilhado ProfessionalChartWorkspace de NutritionChartWorkspace + DentistChartWorkspace (mesmo fetch de /api/professional/records): corrigir o catch vazio (estado de erro i18n + "tentar novamente") e o corte silencioso em 10 itens ("mostrando 10 de N").

============================================================
FASE 4 — SSO / INTEGRAÇÃO doctor8 ↔ vital8
============================================================

4.1 [doctor8] Seleção de organização no SSO multi-org
Arquivos: src/lib/sso/sso-userinfo.ts, src/app/api/oauth/authorize/route.ts, src/lib/sso/sso-codes.ts
resolveB2BClaims usa findFirst — usuário em 2+ organizações sempre emite claims da mais antiga (vital8 rejeita com CnpjDivergente). Quando houver >1 membership ativo, o authorize deve exibir uma tela de escolha (ex. /sso/select-org); gravar a org escolhida no authorization code; getSsoUserClaims/resolveB2BClaims passam a aceitar organizationId. Com 1 org, comportamento inalterado.

4.2 [doctor8] Aceitar hint de portal no authorize
Arquivo: src/app/api/oauth/authorize/route.ts
Aceitar account_type (CLINIC|EMPLOYER|PHARMACY|LABORATORY) e mapear o redirect de login: CLINIC→/login?portal=organization, EMPLOYER→/empresas/login, PHARMACY→/farmacias/login, LABORATORY→/laboratorios/login (preservando o resume/callbackUrl). Valor desconhecido → /login.

4.3 [vital8] Jornada de cadastro de clínica via Doctor8
Arquivos: src/modules/core/components/doctor8-login-ctas.tsx, src/lib/auth/auth.ts
Hoje o CTA de cadastro de clínica cai no LOGIN do doctor8 (comentário no código está errado) e o SSO retorna Doctor8SemConta. Implementar conforme decisão de produto 3:
  - Opção A (auto-provisioning): no callback signIn, quando usuário doctor8 B2B CLINIC, e-mail verificado e org_cnpj válido, mas sem conta/org local → criar User (sem passwordHash), Organization (name=org_name, documentNumber=org_cnpj, type=CLINICA, trial 30d) e Membership OWNER, com audit "user.provisioned_from_doctor8".
  - Opção B (explícito): CTA leva a app.doctor8.org/register/organization?callbackUrl=<authorize>, e criar tela de vinculação pós-SSO em vez do erro.
  Corrigir o comentário incorreto.

4.4 [doctor8] Política de SSO para B2B não-ATIVO e claim verified
Arquivos: src/lib/sso/sso-userinfo.ts, src/app/api/oauth/authorize/route.ts (+ vital8/src/lib/auth/auth.ts)
Conforme decisão de produto 2: se B2B PENDING_REVIEW/SUSPENDED não deve entrar em apps parceiros, negar no authorize (access_denied) ou exigir profile.verified no callback do vital8. Revisar o claim verified da clínica (hoje true incondicional): usar status real se existir campo, ou documentar a diferença. Não quebrar o contrato atual com o vital8.

============================================================
FASE 5 — TESTES (E2E + unit)
============================================================
Criar specs Playwright por portal (usar e2e/helpers e e2e/psychologist-portal.spec.ts como referência):
- e2e/nutritionist-portal.spec.ts, dentist-portal.spec.ts, laboratory-portal.spec.ts, pharmacy-portal.spec.ts, empresas-auth.spec.ts, e no vital8 os fluxos de login/SSO.
Cobrir, no mínimo: cadastro→verificação→login→home correta; regressão do bug de professionSlug (3.1); legado /login/<portal> → /login?portal=...; role errada no login B2B → mensagem (não redirect silencioso); gate de status (B2B não-ACTIVE não escreve); dispensação de farmácia com/sem vínculo; ASO imutável + S-2220 único; SSO doctor8→vital8 (happy path + cada erro Doctor8*).
Unit: resolver de params (3.1); isNutritionist/Dentist/Pharmacist/LaboratorySpecialty; require*Active; authorizePharmacyPrescriptionValidate (vínculo de loja); callback jwt do vital8 (0.1).

============================================================
CRITÉRIOS DE ACEITE GLOBAIS
============================================================
- Fase 0 sem regressões e com testes cobrindo cada falha corrigida.
- B2B não-ACTIVE não escreve; farmacêutico só dispensa em loja vinculada; ASO emitido imutável com um único evento eSocial.
- Round-trip SSO doctor8→vital8 funcionando conforme a opção escolhida em 4.3.
- Sem enumeração de e-mail; rate-limit preservado; consentimento LGPD nos cadastros BR.
- lint + typecheck + testes passando nos DOIS repositórios.
- Mudanças de schema apenas as indicadas (vital8: emailVerified + unicidade documentNumber; doctor8: flag de eSocial enfileirado / campos de retificação de ASO / status de Organization se optado), sempre com migração.
```
