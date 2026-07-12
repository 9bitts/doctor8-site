# Análise — Doctor8 Empresas: logins de Empresa e Médico do Trabalho

**Data:** 12/07/2026 · **Escopo:** `/empresas` (login empresa + login médico do trabalho), integrações entre eles. Login de psicólogo já refinado anteriormente. Somente análise; execução no Cursor.

---

## 1. Mapa da área

**Rotas públicas** (`src/app/empresas/`): landing com hub de 3 logins, `login` (empresa), `cadastro` (empresa, com lookup CNPJ na Receita), `medico/login`, `medico/cadastro` (via token de convite), `medico/aceitar`, `equipe/cadastro|aceitar` (time da empresa), `colaborador` (portal EAP do funcionário), `convite/[token]`, `pesquisa/[token]` (survey anônima), `denuncia/[slug]` (canal de denúncias), `psicologo/login`.

**Dashboards** (`src/app/(dashboard)/empresas/`): empresa tem painel, NR-1, AEP, plano de ação, pesquisas, exames/ASO, PCMSO, colaboradores, equipe, EAP, rede de psicólogos, denúncias, documentação, eSocial, integrações, conteúdo, configurações. Médico tem apenas `medico/painel` (lista de empresas vinculadas) e `medico/empresas/[companyId]` (detalhe: riscos altos, checklist PCMSO, exames pendentes, ASO).

**Auth:** roles globais `EMPLOYER` e `OCCUPATIONAL_PHYSICIAN` (User.role, single-role). Empresa tem RBAC interno via `EmployerMember.role` (OWNER/ADMIN/SST/HR/VIEWER) em `src/lib/employer-auth.ts`. Médico é vinculado por empresa via `EmployerOccupationalPhysician` (N empresas por médico, convite com token de 7 dias enviado pela empresa em `api/employer/pcmso/invite`). Middleware protege as rotas por prefixo corretamente (`src/middleware.ts` linhas 163-184, 648-661).

**Integração principal:** empresa (RH/SST) agenda exames ocupacionais (`api/employer/exams`) → médico completa e assina ASO (`api/occupational-physician/exams` PATCH) → assinatura registrada em `EmployerDocumentSignature` → checklist PCMSO e sign-off do médico alimentam `nr1ComplianceScore` da empresa (`refreshEmployerNr1Compliance`). EAP: empresa vincula psicólogos (`EmployerLinkedPsychologist`), colaboradores usam quota de sessões (`EmployerWorkforceMember.sessionsUsed/Quota`) — médico do trabalho corretamente NÃO tem acesso a EAP nem denúncias.

## 2. Problemas encontrados (por gravidade)

### P1 — Bugs e riscos legais
1. **ASO em PDF quebrado no portal do médico.** `medico/empresas/[companyId]/page.tsx` (linha ~213) linka para `/api/employer/exams/[id]/aso-pdf`, mas essa rota usa `requireEmployerApi()` → exige role `EMPLOYER`. O médico do trabalho recebe **403 ao baixar o ASO que ele mesmo assinou**.
2. **ASO editável após assinatura, sem trava e com assinaturas duplicadas.** `api/occupational-physician/exams` PATCH não tem máquina de estados: exame `COMPLETED` com `asoResult` pode ser re-editado à vontade, e cada PATCH com `asoResult` cria **nova** linha em `EmployerDocumentSignature` (duplicatas). ASO é documento legal — precisa de imutabilidade pós-assinatura + fluxo de retificação auditado.
3. **APTO_COM_RESTRICAO sem campo de restrições.** A UI do médico (`completeExam`, linha ~88) envia só `examId` + `asoResult`. A API aceita `asoRestrictions`, mas não há como preenchê-las na tela — um ASO "apto com restrição" sai sem descrever a restrição.
4. **Aceitar convite sobrescreve a role global do usuário.** `api/occupational-physician/invites/accept` e `api/employer/invites/accept` fazem `user.update({ role: ... })` se a role atual for diferente. Um médico que já é `PROFESSIONAL` na plataforma (caso comum) e aceita convite de PCMSO **vira `OCCUPATIONAL_PHYSICIAN` e perde acesso ao portal profissional** — silenciosamente.

### P2 — Inconsistências entre logins
5. **`/empresas/medico/login/page.tsx` sem `<Suspense>`.** O form usa `useSearchParams`, mas a page não envolve em Suspense como as de empresa e psicólogo — causa bailout de prerender/CSR no build do Next.
6. **Login da empresa não valida a role pós-login.** `OccupationalPhysicianLoginForm` rejeita role errada com erro claro; `EmployerLoginForm` não — um paciente que loga em `/empresas/login` é redirecionado silenciosamente ao painel de paciente, sem explicação. Padronizar no comportamento do médico/psicólogo.
7. **Médico sem Google OAuth** (empresa tem). Decidir se é intencional; se não, adicionar com a mesma validação de role.

### P3 — Lacunas funcionais e de qualidade
8. **Empresa multi-conta sem seletor.** `getEmployerMembership` usa `findFirst` — usuário membro de 2+ empresas cai numa empresa arbitrária, sem picker. (O lado do médico já suporta N empresas corretamente.)
9. **Portal do médico sem histórico.** Só vê 20 exames pendentes por empresa; não há lista completa de exames, nem histórico de ASOs emitidos por ele.
10. **Erros com `alert()`** no portal do médico — abaixo do padrão de toasts já aplicado nos portais refinados.
11. **Zero testes e2e** para toda a área `/empresas` (empresa, médico, psicólogo, colaborador, denúncia, pesquisa).
12. **Re-convite reseta vínculo ativo**: `api/employer/pcmso/invite` no upsert seta `userId: null` + `INVITED` para link existente não-ativo, e sobrescreve coordenador do PCMSO sem confirmação — comportamento aceitável, mas merece guarda para não derrubar um médico ativo por engano de e-mail.

---

## 3. Prompt para o Cursor

```
Contexto: Doctor8 (Next.js App Router + Prisma + NextAuth). Área B2B "/empresas" com dois
portais: empresa (role EMPLOYER, RBAC interno em EmployerMember) e médico do trabalho
(role OCCUPATIONAL_PHYSICIAN, vínculo N:N via EmployerOccupationalPhysician).
Trabalhe em etapas, um commit por etapa, sem alterar o schema do Prisma exceto onde
indicado na Etapa 2. Rode npx tsc --noEmit ao fim de cada etapa.

ETAPA 1 — Corrigir o download do ASO no portal do médico (bug 403)
- src/app/api/employer/exams/[id]/aso-pdf/route.ts usa requireEmployerApi(), mas o portal
  do médico (src/app/(dashboard)/empresas/medico/empresas/[companyId]/page.tsx, link
  "/api/employer/exams/${exam.id}/aso-pdf") também o consome → médico recebe 403.
- Solução: na rota, aceitar TAMBÉM sessão com role OCCUPATIONAL_PHYSICIAN, validando
  acesso à empresa dona do exame via userHasCompanyAccess (src/lib/occupational-physician-auth.ts).
  Manter o comportamento atual para EMPLOYER (escopo pela própria empresa) e ADMIN.
- Adicionar teste (unit ou integração) cobrindo: employer da empresa OK, médico vinculado OK,
  médico de outra empresa 403, paciente 403.

ETAPA 2 — Integridade legal do ASO
- src/app/api/occupational-physician/exams/route.ts (PATCH):
  a) Máquina de estados: proibir edição de exame COMPLETED que já tenha asoResult,
     exceto por fluxo explícito de retificação: aceitar campo booleano "rectify" que
     exige "notes" obrigatório; a retificação registra nova EmployerDocumentSignature
     com notes "RETIFICAÇÃO: ..." e NUNCA apaga a anterior.
  b) Antes de criar EmployerDocumentSignature, verificar se já existe assinatura para
     (docType ASO, docRefId) e só criar nova em caso de retificação — eliminar duplicatas.
  c) Se asoResult === "APTO_COM_RESTRICAO", exigir asoRestrictions não-vazio (400 se faltar).
- UI src/app/(dashboard)/empresas/medico/empresas/[companyId]/page.tsx:
  - completeExam: ao escolher APTO_COM_RESTRICAO, abrir campo obrigatório de restrições;
    para qualquer resultado, permitir notes opcional.
  - Exames já COMPLETED devem exibir resultado + botão ASO (PDF), sem botões de re-completar
    (apenas ação "Retificar" com confirmação e campo de justificativa).
  - Trocar todos os alert() por toasts, no mesmo padrão dos portais psicólogo/integrativo.

ETAPA 3 — Parar de sobrescrever a role global ao aceitar convites
- src/app/api/occupational-physician/invites/accept/route.ts e
  src/app/api/employer/invites/accept/route.ts: hoje, se o usuário logado tem outra role
  (ex.: PROFESSIONAL, PATIENT), o accept faz user.update({ role: ... }) silenciosamente,
  destruindo o acesso ao portal anterior.
- Mudar para: se a role atual NÃO for compatível (PATIENT→ok converter? NÃO: apenas contas
  novas/sem portal), retornar 409 com mensagem clara: "Este e-mail já tem uma conta
  [tipo] no Doctor8. Use outro e-mail para o portal [empresa/médico do trabalho]."
  Regras: conta sem role de portal ativa pode ser convertida; PROFESSIONAL, PSYCHOLOGIST,
  PSYCHOANALYST, INTEGRATIVE_THERAPIST, EMPLOYER, PATIENT etc. NUNCA são convertidas
  silenciosamente.
- Nas páginas de aceite (empresas/medico/aceitar, empresas/equipe/aceitar,
  empresas/convite/[token]), exibir esse erro de forma amigável com orientação.

ETAPA 4 — Padronizar os três logins de /empresas
- src/app/empresas/medico/login/page.tsx: envolver o form em <Suspense> com
  LoginSuspenseFallback (accent teal), igual às pages de empresa e psicólogo
  (o form usa useSearchParams; sem Suspense há bailout de prerender).
- src/components/employer/EmployerLoginForm.tsx: após waitForAuthenticatedSession,
  validar a role como o OccupationalPhysicianLoginForm faz — se role !== "EMPLOYER"
  e !== "ADMIN", signOut + erro "invalid" (mensagem: este acesso é para empresas;
  link para /login geral). Não redirecionar silenciosamente para outro portal.
- Decidir e aplicar: ou adicionar Google OAuth ao login do médico (com a mesma validação
  de role pós-OAuth), ou remover a diferença da documentação. Prefira adicionar.

ETAPA 5 — Melhorias funcionais
- Multi-empresa no lado employer: src/lib/employer-auth.ts getEmployerMembership usa
  findFirst. Adicionar suporte a seleção: listar memberships ativos; se >1, permitir
  escolher via cookie/param "employerCompanyId" validado contra os memberships do
  usuário; requireEmployer/requireEmployerApi passam a respeitar essa seleção.
  UI: seletor simples no header do layout (dashboard)/empresas quando houver >1 empresa.
- Portal do médico — histórico: nova rota GET /api/occupational-physician/exams
  (listar exames das empresas vinculadas com filtros status/empresa, paginação take 50)
  e seção "Histórico de exames/ASOs" em medico/empresas/[companyId] (todos os status,
  não só os 20 pendentes).
- api/employer/pcmso/invite: se já existe vínculo ACTIVE com userId para OUTRO e-mail
  na mesma empresa, exigir confirmação explícita (param replaceActive: true) antes de
  trocar o coordenador; nunca resetar um vínculo ACTIVE sem isso.

ETAPA 6 — Testes e verificação
- Criar e2e/empresas.spec.ts (Playwright, seguindo o padrão dos specs existentes):
  - /empresas renderiza hub com os 3 logins;
  - login empresa com credencial de paciente → erro claro, sem redirect silencioso;
  - login médico sem Suspense error no build;
  - rotas protegidas redirecionam para o login certo quando deslogado
    (/empresas/painel → /empresas/login; /empresas/medico/painel → /empresas/medico/login).
- npx tsc --noEmit, npm run lint, npm run build limpos.
- Resumo final por etapa com arquivos tocados.
```
