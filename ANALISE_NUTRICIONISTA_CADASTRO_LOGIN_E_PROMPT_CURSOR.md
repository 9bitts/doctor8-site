# Análise — Cadastro/Login do Nutricionista + Prompt para o Cursor

Data: 2026-07-12 · Análise sem alteração de código (conforme CLAUDE.md)

---

## 1. Fluxo mapeado

**Cadastro:**
1. Entrada por `/register/professional/signup?portal=nutritionist&profession=nutricionista` (link `NUTRITIONIST_REGISTER` em `src/lib/auth-portals.ts` e `buildProfessionalSignupHref` em `src/lib/profession-signup.ts`), ou seleção do card "Sou nutricionista" no step 1 da página.
2. `RegisterAccountForm` (`src/components/auth/register-shared.tsx`) envia `role: "PROFESSIONAL"` + `profession: "nutricionista"` para `POST /api/auth/register`.
3. A rota (`src/app/api/auth/register/route.ts`) cria `User` (role PROFESSIONAL) + `ProfessionalProfile { specialty: "Nutritionist", licenseNumber: "", consultPrice: 0 }`, consentimentos (LGPD/GDPR/HIPAA por região), telefone, rate-limit, anti-enumeração e envia verificação de e-mail.
4. Alternativa OAuth Google: `POST /api/auth/oauth-intent` (grava profession) → `signIn("google", callbackUrl: /callback?portal=nutritionist)` → `/api/auth/complete-signup` cria o perfil e resolve o destino.

**Login:**
- Login unificado em `/login`; `/login/nutricionista` (legado) é redirecionado pelo middleware para `/login?portal=nutritionist`.
- Pós-login: `resolveRoleHome(role, professionalSpecialty)` (`src/lib/role-home.ts`) → se `isNutritionistSpecialty(specialty)` → `/nutricionista`. A specialty vem do JWT (`token.professionalSpecialty`, carregada em `src/lib/auth.ts`).

**Portal e ferramentas:**
- `/nutricionista` (dashboard) + módulos próprios: anamnese, antropometria, planos alimentares, diário alimentar (todos via `NutritionChartWorkspace`), e páginas re-exportadas do portal `/professional` (settings, patients, appointments, messages, financeiro etc., mapeadas por `src/lib/nutritionist-portal.ts`).
- APIs: `/api/nutritionist/charts/[id]/{anamnesis,anthropometry,meal-plans,food-diary,intake-forms,adherence}` protegidas por `requireNutritionProfessional()` (exige specialty de nutrição) + `requireChartAccess()`. Lado do paciente: `/api/patient/nutrition/*`.
- Onboarding: se o PROFESSIONAL não tem perfil, o dashboard redireciona a `/onboarding?portal=nutritionist` → `/nutricionista/settings`.

**Pontos positivos:** anti-enumeração no registro, rate-limit por e-mail/IP, consentimentos por região, validação de specialty nas APIs (defesa em profundidade além do middleware), Zod em todos os endpoints analisados.

## 2. Problemas encontrados

| # | Severidade | Problema | Arquivo |
|---|-----------|----------|---------|
| 1 | **Alta (bug)** | `chooseRole("PROFESSIONAL")` não limpa `professionSlug` obsoleto: usuário clica "Sou nutricionista" → volta → clica "Sou profissional de saúde" → é cadastrado como nutricionista | `src/app/(auth)/register/professional/signup/page.tsx` (fn `chooseRole` e prop `professionSlug` no step 2) |
| 2 | **Média (bug)** | Parsing de query params conflitante: `portal=nutritionist` seta role `NUTRITIONIST`, depois `profession=nutricionista` sobrescreve para `PROFESSIONAL`; estado inconsistente e frágil | mesmo arquivo, `useEffect` inicial |
| 3 | **Alta** | Layout `/nutricionista` não trata PROFESSIONAL **sem** perfil (`if (profile && ...)`): subpáginas (anamnese, antropometria etc.) abrem sem perfil criado; só o dashboard redireciona ao onboarding | `src/app/(dashboard)/nutricionista/layout.tsx` |
| 4 | **Média** | Dashboard redireciona ADMIN para `/patient` (layout permite ADMIN; página expulsa). Usar `resolveRoleHome(role)` | `src/app/(dashboard)/nutricionista/page.tsx` linha ~35 |
| 5 | **Alta** | Specialty obsoleta no JWT: o settings salva `specialty` mas não dispara `update({ refreshSpecialty: true })` (suportado em `src/lib/auth.ts`); ao mudar a profissão, o roteamento pós-login fica errado até relogar | `src/app/(dashboard)/professional/settings/page.tsx` |
| 6 | **Alta (negócio/compliance)** | Perfil criado com `licenseNumber: ""` e `consultPrice: 0`, sem gate nem banner de conclusão: o nutricionista usa todo o portal sem informar CRN | `createRegisterProfile` em `src/app/api/auth/register/route.ts` + portal |
| 7 | Baixa | `generateStaticParams` de `/register/professional/[slug]` não inclui `dentista` (conferir paridade com `isValidProfessionSlug`) | `src/app/(auth)/register/professional/[slug]/page.tsx` |
| 8 | Média (UX) | Step 2 do cadastro mostra header genérico (estetoscópio + "conta de profissional") para nutricionista, embora o botão Google seja específico; sem variante visual (Utensils/amber) nem `reg.nutritionistAccount` | `src/components/auth/register-shared.tsx` |
| 9 | Baixa | Dois `useEffect` duplicados de idioma; o segundo pode sobrescrever o `?lang=` da URL se o localStorage falhar | `src/app/(auth)/register/professional/signup/page.tsx` |
| 10 | Média (UX) | `NutritionChartWorkspace` engole erros de fetch (`catch { /* ignore */ }`) — sem estado de erro/retry; lista limitada a 10 sem indicação | `src/components/nutritionist/NutritionChartWorkspace.tsx` |
| 11 | Baixa (UX) | Acento visual do formulário sempre emerald (focus rings, checkboxes) mesmo no fluxo do nutricionista (tema amber do portal) | `src/components/auth/register-shared.tsx` |
| 12 | Média (qualidade) | Zero cobertura E2E do fluxo do nutricionista (cadastro, login por portal, gate de specialty, módulos) | `e2e/` |

---

## 3. PROMPT PARA O CURSOR (copiar tudo abaixo)

```
Você vai corrigir e melhorar o fluxo de cadastro/login e o portal do NUTRICIONISTA neste projeto Next.js (App Router) + NextAuth + Prisma. Não altere fluxos de outros perfis além do estritamente necessário. Não mude schema do Prisma sem necessidade. Faça commits pequenos por item.

CONTEXTO DO FLUXO (já mapeado):
- Cadastro: /register/professional/signup?portal=nutritionist&profession=nutricionista → RegisterAccountForm (src/components/auth/register-shared.tsx) → POST /api/auth/register → cria ProfessionalProfile { specialty: "Nutritionist", licenseNumber: "", consultPrice: 0 }.
- Login unificado /login; pós-login resolveRoleHome(role, professionalSpecialty) → /nutricionista quando isNutritionistSpecialty (src/lib/role-home.ts, src/lib/profession-label.ts, src/lib/nutritionist-portal.ts).
- Portal: src/app/(dashboard)/nutricionista/* ; APIs em src/app/api/nutritionist/* protegidas por requireNutritionProfessional (src/lib/nutrition/nutrition-api.ts).

=== CORREÇÕES (ordem de prioridade) ===

1) BUG — professionSlug obsoleto no seletor de perfil
Arquivo: src/app/(auth)/register/professional/signup/page.tsx
Na função chooseRole, quando r === "PROFESSIONAL" o professionSlug anterior NÃO é limpo. Reprodução: clicar "Sou nutricionista" → voltar (onBack) → clicar "Sou profissional de saúde" → a conta é criada com profession=nutricionista e specialty "Nutritionist".
Correção: em chooseRole("PROFESSIONAL"), setProfessionSlug(undefined). Revise também o ternário que monta a prop professionSlug no step 2 para não repassar slug obsoleto.

2) BUG — parsing conflitante de query params no mesmo arquivo
No useEffect inicial, portal=nutritionist seta role "NUTRITIONIST", depois profession=nutricionista sobrescreve para "PROFESSIONAL", e role=PROFESSIONAL pula para o step 2 sem limpar slug. Refatore para um resolver único e determinístico: derive { role, professionSlug, step } a partir de (portal, role, profession) numa única função pura (com precedência documentada: portal > role > profession), e aplique o resultado uma única vez. Adicione teste unitário dessa função cobrindo as combinações de nutricionista, enfermeiro, farmacêutico, dentista, psicólogo, psicanalista, terapeuta integrativo.

3) Gate de perfil ausente no layout do portal
Arquivo: src/app/(dashboard)/nutricionista/layout.tsx
Hoje: `if (profile && !isNutritionistSpecialty(...)) redirect("/professional")` — PROFESSIONAL SEM perfil acessa qualquer subpágina (/nutricionista/anamnese etc.); só o dashboard redireciona ao onboarding.
Correção: no layout, se role === "PROFESSIONAL" e não houver professionalProfile, redirect("/onboarding?portal=nutritionist"). Manter o redirect para /professional quando o perfil existir com specialty de outra área. Aplicar o mesmo padrão, se existir o mesmo gap, nos layouts /enfermeiro, /farmaceutico e /odontologo.

4) Redirect inconsistente para ADMIN no dashboard
Arquivo: src/app/(dashboard)/nutricionista/page.tsx (linha ~35)
`if (session.user.role !== "PROFESSIONAL") redirect("/patient")` expulsa ADMIN (que o layout permite) para /patient. Trocar por redirect(resolveRoleHome(session.user.role)) e permitir ADMIN visualizar, ou alinhar layout e página numa única regra.

5) Specialty obsoleta na sessão após editar o perfil
Arquivo: src/app/(dashboard)/professional/settings/page.tsx
O save envia specialty ao backend, mas não dispara refresh do JWT. O callback jwt em src/lib/auth.ts já suporta `trigger === "update"` com `refreshSpecialty: true`. Correção: após salvar com sucesso, chamar `update({ refreshSpecialty: true })` do useSession() (next-auth/react). Sem isso, quem muda a profissão continua sendo roteado pelo portal antigo até relogar. Verifique se as settings dos outros portais reutilizam esta página (as rotas /nutricionista/settings etc. são re-exports) — a correção deve valer para todos.

6) Perfil incompleto sem CRN — gate/banner de conclusão
O cadastro cria ProfessionalProfile com licenseNumber: "" e consultPrice: 0 e nada força a conclusão.
Implementar (sem bloquear o onboarding):
  a) Banner persistente no dashboard /nutricionista (e /professional) quando licenseNumber estiver vazio: "Complete seu registro profissional (CRN)" com link para settings.
  b) Impedir que o profissional fique visível/listável para pacientes (busca de providers, agendamento) enquanto licenseNumber estiver vazio — verifique src/lib/providers.ts e as rotas de listagem pública e adicione o filtro se não existir.
  c) Validação de formato do CRN no settings (CRN-XX 12345 — dígitos + UF), reaproveitando o padrão do council prefix já existente em src/lib/profession-label.ts (councilKey "crn_nutrition").

7) UX do step 2 do cadastro específico por profissão
Arquivo: src/components/auth/register-shared.tsx
O header do formulário mostra estetoscópio + "conta de profissional" para nutricionista, enquanto o botão Google já é específico (reg.googleNutritionist). Adicionar variantes de header para nutricionista (ícone Utensils, tema amber, chave i18n reg.nutritionistAccount), e o equivalente para enfermeiro, farmacêutico e dentista. Adicionar as chaves i18n em pt/en/es em src/lib/i18n/translations (seguir convenção existente). Opcional: propagar o acento visual (amber) para focus rings e checkboxes via prop accent já suportada por getLoginAccentStyles.

8) Limpeza dos efeitos de idioma
Arquivo: src/app/(auth)/register/professional/signup/page.tsx
Há dois useEffects que setam lang (um lê ?lang= da URL, outro chama detectInitialLang) — o segundo pode sobrescrever o parâmetro. Unificar em um único efeito: URL param > localStorage > navigator.

9) Robustez do NutritionChartWorkspace
Arquivo: src/components/nutritionist/NutritionChartWorkspace.tsx
- O catch vazio esconde falhas do fetch de /api/professional/records: adicionar estado de erro com mensagem i18n e botão "Tentar novamente".
- Sem busca ativa a lista corta em 10 sem indicação: mostrar contador ("mostrando 10 de N") ou aumentar com scroll.

10) Paridade de slugs na página de landing por profissão
Arquivo: src/app/(auth)/register/professional/[slug]/page.tsx
generateStaticParams não inclui "dentista"; conferir a lista contra isValidProfessionSlug (src/lib/professional-landing-content.ts) e igualar (gerar a lista a partir da mesma fonte para não divergir de novo).

=== TESTES (obrigatório) ===

11) E2E Playwright — criar e2e/nutritionist-portal.spec.ts cobrindo:
  a) Cadastro via /register/professional/signup?portal=nutritionist&profession=nutricionista → sucesso → verificação de e-mail simulada → login → aterrissa em /nutricionista.
  b) Regressão do bug 1: selecionar nutricionista, voltar, selecionar "profissional de saúde", cadastrar → deve aterrissar em /professional (NÃO /nutricionista).
  c) Login legado /login/nutricionista redireciona para /login?portal=nutritionist.
  d) PROFESSIONAL com specialty "General Practice" acessando /nutricionista → redirect para /professional.
  e) Navegação dos 4 módulos (anamnese, antropometria, planos, diário) com seleção de paciente.
  Use os helpers existentes em e2e/helpers e o padrão de e2e/psychologist-portal.spec.ts como referência.

12) Testes unitários para: resolver de params do item 2; isNutritionistSpecialty (variações "Nutritionist", "Dietitian", "Nutrition", null, "Nurse"); mapProfessionalPathForNutritionistSpecialty.

=== CRITÉRIOS DE ACEITE ===
- Nenhuma regressão nos fluxos de médico, psicólogo, psicanalista, terapeuta integrativo, enfermeiro, farmacêutico e dentista (rodar e2e existentes).
- lint + typecheck + testes passando.
- Não expor mensagens que permitam enumeração de e-mails no registro (manter registerAckResponse).
- Não alterar contratos das APIs /api/nutritionist/* (apenas UI/fluxo/guards).
```

---

*Nota: itens 6b/6c têm impacto de produto (visibilidade de profissionais sem CRN) — validar a regra de negócio antes de executar.*
