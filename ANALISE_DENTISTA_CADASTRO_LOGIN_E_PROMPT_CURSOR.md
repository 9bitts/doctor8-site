# Análise — Cadastro/Login do Dentista + Prompt para o Cursor

Data: 2026-07-12 · Análise sem alteração de código (conforme CLAUDE.md)
Complementa: `ANALISE_NUTRICIONISTA_CADASTRO_LOGIN_E_PROMPT_CURSOR.md` (vários bugs são compartilhados).

---

## 1. Fluxo mapeado

**Cadastro:**
1. Entrada por `/register/professional/signup?portal=dentist&profession=dentista` (`DENTIST_REGISTER` em `src/lib/auth-portals.ts` / `src/lib/dentist-portal.ts`) ou card "Sou dentista" no step 1.
2. `RegisterAccountForm` envia `role: "PROFESSIONAL"` + `profession: "dentista"` → `POST /api/auth/register` cria `ProfessionalProfile { specialty: "Dentist (General)", licenseNumber: "", consultPrice: 0 }` (via `PROFESSION_SIGNUP` em `src/lib/profession-signup.ts`).
3. OAuth Google: `oauth-intent` → `/callback?portal=dentist` → `complete-signup`.

**Login:**
- Login unificado `/login`; legado `/login/odontologo` → middleware → `/login?portal=dentist`.
- Pós-login: `resolveRoleHome` → `isDentistSpecialty(specialty)` (`src/lib/profession-label.ts`, set DENTISTRY inclui "Dentist (General)", "Orthodontist", "Dentista" etc.) → `/odontologo`.

**Portal e ferramentas (mais rico que o do nutricionista):**
- Módulos próprios: anamnese, odontograma, periodontograma, plano de tratamento (com orçamento/aprovação do paciente), prótese, ortodontia, fotos clínicas (S3 + DICOM viewer), cadeiras (chairs); mais páginas re-exportadas de `/professional` (patients, appointments, prescriptions, financeiro, settings, jit, doctor-connection etc., mapeadas em `src/lib/dentist-portal.ts`).
- APIs: `/api/dentist/charts/[id]/{anamnesis,odontogram,periodontogram,treatment-plans,prosthetics,orthodontics,photos}` + `/api/dentist/chairs`, `/api/dentist/procedures`, `/api/dentist/appointments/[id]/chair` — todas com `requireDentistProfessional()` + `requireDentalChartAccess()` (`src/lib/dentistry/dentistry-api.ts`).

**Pontos positivos:** mesma base sólida do nutricionista (Zod, anti-enumeração, rate-limit, gate de specialty nas APIs), e o guard dental cobre todos os endpoints verificados.

## 2. Problemas encontrados

### Compartilhados com o nutricionista (mesmos arquivos — se o prompt do nutricionista já foi executado, itens 1–5 e 8–9 podem já estar corrigidos; verificar antes)

| # | Severidade | Problema |
|---|-----------|----------|
| C1 | Alta (bug) | `chooseRole("PROFESSIONAL")` não limpa `professionSlug` obsoleto — usuário que clicou "Sou dentista", voltou e escolheu "Profissional de saúde" é cadastrado como dentista (`src/app/(auth)/register/professional/signup/page.tsx`) |
| C2 | Média (bug) | Parsing conflitante de `portal=dentist` (seta role DENTIST) vs `profession=dentista` (sobrescreve para PROFESSIONAL) no mesmo `useEffect` |
| C3 | Alta | Layout `/odontologo` não redireciona PROFESSIONAL **sem** perfil para onboarding (`if (profile && ...)`) — subpáginas (odontograma etc.) abrem sem perfil (`src/app/(dashboard)/odontologo/layout.tsx`) |
| C4 | Média | Dashboard expulsa ADMIN para `/patient` embora o layout permita ADMIN (`src/app/(dashboard)/odontologo/page.tsx` linha ~40) |
| C5 | Alta | Specialty obsoleta no JWT após salvar settings (falta `update({ refreshSpecialty: true })`) — dentista que ajusta a profissão continua roteado ao portal antigo |
| C6 | Alta (negócio) | `licenseNumber: ""` (CRO) sem gate/banner de conclusão — usa todo o portal sem registro no conselho |
| C7 | Média (UX) | Step 2 do cadastro com header genérico (estetoscópio/"conta profissional") apesar do botão Google específico (`reg.googleDentist`); sem variante Smile/sky + `reg.dentistAccount` |

### Específicos do dentista

| # | Severidade | Problema | Arquivo |
|---|-----------|----------|---------|
| D1 | **Alta (segurança)** | `POST /api/dentist/charts/[id]/photos` aceita `storageKey` arbitrário do cliente e depois o `GET` gera signed URL de leitura para essa chave — um dentista pode registrar uma `storageKey` de objeto S3 de outro tenant/paciente e ler o arquivo (IDOR via storageKey). Falta validar que a chave pertence a um upload do próprio profissional (prefixo/registro de upload) | `src/app/api/dentist/charts/[id]/photos/route.ts` |
| D2 | Média | `generateStaticParams` de `/register/professional/[slug]` **não inclui `dentista`** — landing `/register/professional/dentista` não é pré-gerada (funciona só se `dynamicParams` estiver ativo); divergência com `isValidProfessionSlug` | `src/app/(auth)/register/professional/[slug]/page.tsx` |
| D3 | Baixa (código morto) | `requireDentistProfessional` tem cláusula `&& ctx.session.user.role !== "ADMIN"` que nunca é alcançada (`requireProfessional` já rejeita não-PROFESSIONAL); inconsistente com o guard de nutrição (que não tem a cláusula) | `src/lib/dentistry/dentistry-api.ts` |
| D4 | Baixa | `/odontologo/jit` re-exporta `psychologist/jit`, que por sua vez re-exporta `professional/jit` — dupla indireção frágil; apontar direto para `professional/jit` | `src/app/(dashboard)/odontologo/jit/page.tsx` |
| D5 | Média (duplicação) | `DentistChartWorkspace` é quase cópia do `NutritionChartWorkspace` (mesmo fetch de `/api/professional/records`, mesmo `catch` vazio que engole erros, mesmo corte silencioso em 10 itens) — extrair componente compartilhado | `src/components/dentist/DentistChartWorkspace.tsx` |
| D6 | Baixa (validação) | Schema de fotos sem limites: `caption` sem `max`, `toothNumbers` sem limite de tamanho nem faixa (dentes FDI 11–48 / 51–85) | mesmo arquivo de D1 |
| D7 | Média (qualidade) | Zero cobertura E2E do dentista (cadastro, login, gate de specialty, módulos, orçamento de plano de tratamento) | `e2e/` |

---

## 3. PROMPT PARA O CURSOR (copiar tudo abaixo)

```
Você vai corrigir e melhorar o fluxo de cadastro/login e o portal do DENTISTA neste projeto Next.js (App Router) + NextAuth + Prisma. Não altere fluxos de outros perfis além do necessário. Commits pequenos por item.

IMPORTANTE: se as correções do prompt do NUTRICIONISTA já foram aplicadas (professionSlug obsoleto, parsing de params, gate de perfil no layout, redirect de ADMIN, refreshSpecialty no settings, banner de licença, header do step 2), NÃO as reimplemente — apenas ESTENDA cada uma para o dentista onde indicado abaixo. Se ainda não foram aplicadas, implemente-as conforme descrito (mesma especificação, trocando nutricionista→dentista, /nutricionista→/odontologo, CRN→CRO, tema amber→sky/fuchsia).

CONTEXTO DO FLUXO (já mapeado):
- Cadastro: /register/professional/signup?portal=dentist&profession=dentista → RegisterAccountForm → POST /api/auth/register → ProfessionalProfile { specialty: "Dentist (General)", licenseNumber: "", consultPrice: 0 }.
- Login unificado /login (legado /login/odontologo redirecionado pelo middleware); pós-login resolveRoleHome → isDentistSpecialty → /odontologo (src/lib/role-home.ts, src/lib/profession-label.ts, src/lib/dentist-portal.ts).
- Portal: src/app/(dashboard)/odontologo/* (odontograma, periodontograma, plano de tratamento, prótese, ortodontia, fotos, cadeiras, anamnese) ; APIs em src/app/api/dentist/* protegidas por requireDentistProfessional + requireDentalChartAccess (src/lib/dentistry/dentistry-api.ts).

=== CORREÇÕES (ordem de prioridade) ===

1) SEGURANÇA — IDOR via storageKey nas fotos clínicas
Arquivo: src/app/api/dentist/charts/[id]/photos/route.ts
O POST aceita storageKey livre do cliente e grava em dentalClinicalPhoto; o GET depois gera getSignedReadUrl(photo.storageKey). Um profissional autenticado pode registrar uma chave S3 de outro paciente/tenant e obter URL assinada de leitura.
Correção:
  a) Identifique como /api/uploads emite chaves (prefixo por usuário/sessão) e valide no POST que a storageKey pertence a um upload feito pelo próprio profissional (verificação de prefixo E, se existir tabela/registro de uploads, verificação de propriedade). Rejeitar com 403 caso contrário.
  b) Verifique se o mesmo padrão existe em outros endpoints que aceitam storageKey do cliente (buscar "storageKey" em src/app/api/**) e aplique a mesma validação — ex.: diário alimentar do nutricionista, documentos etc.
  c) Adicionar teste cobrindo a rejeição de storageKey de outro usuário.

2) Landing do dentista fora do generateStaticParams
Arquivo: src/app/(auth)/register/professional/[slug]/page.tsx
A lista estática não inclui "dentista". Gere generateStaticParams a partir da MESMA fonte usada por isValidProfessionSlug (src/lib/professional-landing-content.ts) para nunca divergir.

3) Gate de perfil ausente no layout do portal
Arquivo: src/app/(dashboard)/odontologo/layout.tsx
Hoje `if (profile && !isDentistSpecialty(...))` deixa PROFESSIONAL SEM perfil acessar /odontologo/odontograma etc.; só o dashboard redireciona.
Correção: se role === "PROFESSIONAL" e não houver professionalProfile → redirect("/onboarding?portal=dentist"). Manter redirect para /professional quando o perfil existir com outra specialty.

4) Redirect inconsistente para ADMIN no dashboard
Arquivo: src/app/(dashboard)/odontologo/page.tsx
`if (session.user.role !== "PROFESSIONAL") redirect("/patient")` conflita com o layout (que permite ADMIN). Usar redirect(resolveRoleHome(session.user.role)) e alinhar com a decisão tomada no portal do nutricionista.

5) BUG compartilhado — professionSlug obsoleto e parsing de params
Arquivo: src/app/(auth)/register/professional/signup/page.tsx
(Se ainda não corrigido pelo prompt do nutricionista): chooseRole("PROFESSIONAL") deve limpar professionSlug; consolidar o parsing de (portal, role, profession) num resolver puro único com precedência portal > role > profession. Garantir nos testes o caso dentista: selecionar "Sou dentista" → voltar → "Sou profissional de saúde" → conta NÃO pode sair com specialty "Dentist (General)".

6) Specialty obsoleta na sessão (compartilhado)
(Se ainda não corrigido): após salvar o perfil em src/app/(dashboard)/professional/settings/page.tsx, chamar update({ refreshSpecialty: true }) do useSession — o callback jwt em src/lib/auth.ts já suporta. Vale para /odontologo/settings (re-export).

7) Gate/banner de CRO (compartilhado, estender ao dentista)
Perfil nasce com licenseNumber: "" e consultPrice: 0.
  a) Banner persistente no dashboard /odontologo quando licenseNumber vazio: "Complete seu registro profissional (CRO)" → link para settings.
  b) Excluir profissionais com licenseNumber vazio das listagens públicas/agendamento de pacientes (verificar src/lib/providers.ts e rotas de listagem).
  c) Validação de formato CRO (dígitos + UF) no settings, usando o councilKey "cro" já existente em src/lib/profession-label.ts.

8) UX do step 2 do cadastro (compartilhado, estender)
Arquivo: src/components/auth/register-shared.tsx
Adicionar variante do header para dentista: ícone Smile, tema sky, chave i18n reg.dentistAccount (pt/en/es em src/lib/i18n/translations, seguindo convenção). Fazer junto com nutricionista/enfermeiro/farmacêutico se ainda não feito.

9) Higiene de código do portal dental
  a) src/lib/dentistry/dentistry-api.ts: remover a cláusula morta `&& ctx.session.user.role !== "ADMIN"` de requireDentistProfessional (requireProfessional já rejeita não-PROFESSIONAL), ou — se a intenção era permitir ADMIN — implementar de fato o caminho ADMIN de forma consistente com requireNutritionProfessional. Escolher UMA semântica e aplicar aos dois guards.
  b) src/app/(dashboard)/odontologo/jit/page.tsx: re-exportar diretamente de "@/app/(dashboard)/professional/jit/page" (hoje passa por psychologist/jit, dupla indireção).
  c) Extrair componente compartilhado ProfessionalChartWorkspace a partir de DentistChartWorkspace e NutritionChartWorkspace (mesma lógica de fetch de /api/professional/records, busca, seleção e deep-link): props { titleKey, descKey, backHref, accent, children(chart) }. Corrigir nos dois: catch vazio que engole erro de fetch (adicionar estado de erro i18n + botão tentar novamente) e corte silencioso em 10 itens (mostrar "mostrando 10 de N").

10) Validações da API de fotos
Arquivo: src/app/api/dentist/charts/[id]/photos/route.ts
caption: max(2000); toothNumbers: máx. 64 itens, inteiros na faixa FDI válida (11–48 e 51–85); rejeitar takenAt futuro além de tolerância razoável.

=== TESTES (obrigatório) ===

11) E2E Playwright — criar e2e/dentist-portal.spec.ts cobrindo:
  a) Cadastro via /register/professional/signup?portal=dentist&profession=dentista → login → aterrissa em /odontologo.
  b) Regressão do item 5 (dentista → voltar → profissional genérico → /professional).
  c) /login/odontologo redireciona para /login?portal=dentist.
  d) PROFESSIONAL com specialty "General Practice" em /odontologo → redirect /professional.
  e) Fluxo odontograma: selecionar paciente, salvar dente, recarregar e verificar persistência.
  f) API: POST photos com storageKey de outro usuário → 403 (teste de integração/route).
  Usar helpers de e2e/helpers e e2e/psychologist-portal.spec.ts como referência.

12) Unitários: resolver de params (caso dentista); isDentistSpecialty ("Dentist (General)", "Orthodontist", "Dentista", null, "Nutritionist"); mapProfessionalPathForDentistSpecialty (incluindo /professional/prescriptions e /professional/jit).

=== CRITÉRIOS DE ACEITE ===
- Sem regressões nos demais portais (rodar e2e existentes) e nos módulos dentais (odontograma, periodontograma, planos, prótese, ortodontia, fotos, cadeiras).
- lint + typecheck + testes passando.
- Manter anti-enumeração no registro (registerAckResponse).
- Não alterar contratos públicos das APIs /api/dentist/* além da validação de storageKey/limites (documentar no PR).
```

---

*Nota: o item 1 (storageKey) é o mais crítico — validar a hipótese lendo `/api/uploads` antes de corrigir. Itens 7b têm impacto de produto (ocultar dentistas sem CRO); confirmar regra de negócio.*
