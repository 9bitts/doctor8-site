# Diagn?stico ? Falha no cadastro de profissionais

**Data:** 2026-07-02  
**Modo:** somente leitura (nenhum c?digo alterado)  
**Sintomas em produ??o:** error boundary gen?rico no cadastro ? retry com mesmo e-mail retorna "Email already in use" ? conta invis?vel no painel admin de profissionais.

---

## 1. Causa raiz mais prov?vel

### Hip?tese original: User criado sem perfil, sem transa??o

**Confirmada para cadastro via Google OAuth. Refutada para cadastro por formul?rio (e-mail/senha).**

O fluxo OAuth em `src/lib/auth.ts` cria o `User` e o perfil em **opera??es sequenciais, fora de `db.$transaction`**. Se qualquer passo ap?s `user.create` falhar, o `User` permanece no banco ? tipicamente **j? verificado** (`emailVerified: new Date()`), o que explica os tr?s sintomas juntos.

**Sequ?ncia exata que produz o sintoma (OAuth, profissional/psic?logo):**

| # | Opera??o | Arquivo:linha | Efeito se falhar |
|---|----------|---------------|------------------|
| 1 | `POST /api/auth/oauth-intent` grava cookie assinado com role/telefone | `src/app/api/auth/oauth-intent/route.ts:27-49` | Cookie ausente/inv?lido ? role cai para `PATIENT` (ver cen?rio B) |
| 2 | `signIn("google")` ? callback `signIn` | `src/components/auth/register-shared.tsx:191-212` ? `src/lib/auth.ts:208` | ? |
| 3 | `db.user.findUnique` por e-mail lowercased | `src/lib/auth.ts:211-214` | ? |
| 4 | **`db.user.create`** (`emailVerified` j? preenchido, `role` do cookie) | `src/lib/auth.ts:229-236` | ? |
| 5 | **`db.professionalProfile.create`** (psic?logo: `specialty: "Psychologist"`) | `src/lib/auth.ts:238-249` | **User ?rf?o (sem perfil)** |
| 6 | `saveRegistrationPhone` (encrypt telefone) | `src/lib/auth.ts:283-285` ? `src/lib/save-registration-phone.ts:16-32` | User ?rf?o se passo 5 OK e 6 falhar (menos prov?vel) |
| 7 | `db.account.create` (v?nculo Google) | `src/lib/auth.ts:305-318` | User pode existir com perfil mas sem Account Google |
| 8 | `catch` ? `return false` | `src/lib/auth.ts:322-324` | NextAuth trata como falha de login; usu?rio v? erro gen?rico |

**Retry com formul?rio ap?s ?rf?o OAuth verificado:**

```145:179:src/app/api/auth/register/route.ts
    if (existing) {
      if (existing.role === role && !isAccountVerified(existing)) {
        // ... reenvia verifica??o, retorna 200 ...
      }

      return NextResponse.json(
        { error: { email: ["Email already in use"] } },
        { status: 409 },
      );
    }
```

Como `isAccountVerified` retorna `true` quando `emailVerified` est? preenchido (`src/lib/account-verified.ts:5-8`), o usu?rio OAuth ?rf?o cai direto no **409 "Email already in use"** ? n?o no caminho de retomar verifica??o.

**Invisibilidade no admin:** listagens partem de `professionalProfile.findMany`, n?o de `User` (`src/lib/admin-providers-list.ts:147-162`). Sem linha em `ProfessionalProfile`, o e-mail n?o aparece em Profissionais.

---

### Cen?rio B (secund?rio, tamb?m compat?vel): cookie OAuth perdido ? conta PATIENT

Se o cookie `oauth_signup_role` expira (600 s, `src/lib/oauth-signup-intent.ts:4`) ou n?o ? lido, `readSignupIntent()` **defaulta para `PATIENT`**:

```46:48:src/lib/auth.ts
    return parsed ?? { role: "PATIENT", professionalKind: null, phoneE164: null };
  } catch {
    return { role: "PATIENT", professionalKind: null, phoneE164: null };
```

O m?dico/psic?logo que clicou "Cadastrar com Google" vira `User` + `patientProfile`, n?o `professionalProfile` (`src/lib/auth.ts:272-280`). No admin de **Profissionais** n?o aparece; retry como profissional ? **409** (role diferente). Script interno documenta o mesmo padr?o: `scripts/inspect-provider-email.mjs:162-164`.

---

### Cadastro por formul?rio (e-mail/senha): transa??o at?mica

O caminho principal de m?dicos/psic?logos **n?o** deixa User ?rf?o em falha de perfil:

```188:277:src/app/api/auth/register/route.ts
    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({ ... });
      // ...
      await tx.professionalProfile.create({ ... });  // linhas 239-248
      await tx.consent.createMany({ ... });
      await saveRegistrationPhone(tx, newUser.id, role as UserRole, phoneParsed.e164);
      return newUser;
    });
```

Falha em qualquer passo dentro da transa??o faz rollback completo. **Exce??o p?s-commit:** falha ao criar `verificationToken` (linhas 291-300) deixa User+perfil persistidos, mas o retry reenvia verifica??o (200), **n?o** "Email already in use".

---

### Sobre a tela "Algo deu errado" (error boundary)

| Origem | Texto | Quando |
|--------|-------|--------|
| `src/app/global-error.tsx:21` | **"Algo deu errado"** (sem "Tente novamente") | Exce??o React n?o tratada (error boundary raiz) |
| `src/lib/i18n/translations.ts:7436` (`reg.genericError`) | "Algo deu errado. Tente novamente." | Falha de rede no `fetch` do formul?rio (`register-shared.tsx:271-272`) |
| `src/app/api/auth/register/route.ts:322-324` | "Something went wrong..." ? mapeado no banner vermelho | 500 da API (n?o error boundary) |
| OAuth falha | redirect NextAuth ? `/login?error=...` (`auth.ts:59-60`) | `signIn` retorna `false` |

O formul?rio de cadastro **trata** erros da API inline (`register-shared.tsx:251-261`); n?o deveria acionar `global-error.tsx` por 409/500 da API. Error boundary indica **crash de renderiza??o** (p?gina/rota), ou o usu?rio pode estar descrevendo mensagens gen?ricas do OAuth/login como "error boundary".

---

## 2. Mapa completo dos fluxos de cadastro

### 2.1 P?ginas e rotas

| Papel | URL de entrada | P?gina | Formul?rio |
|-------|----------------|--------|------------|
| Profissional (m?dico, fisio, etc.) | `/register/professional/signup` | `src/app/(auth)/register/professional/signup/page.tsx` | `RegisterAccountForm` role=`PROFESSIONAL` |
| Psic?logo | `?portal=psychologist` | mesma p?gina, linhas 48-52 | role=`PROFESSIONAL`, `professionalKind="psychologist"` (linhas 236-237) |
| Psicanalista | `?role=PSYCHOANALYST` | linhas 54-57 | role=`PSYCHOANALYST` |
| Terapeuta integrativo | `?role=INTEGRATIVE_THERAPIST` | linhas 58-60 | role=`INTEGRATIVE_THERAPIST` |
| Paciente (compara??o) | `/register` | `src/app/(auth)/register/page.tsx:81-86` | role=`PATIENT` |
| Organiza??o | `/register/organization` | `src/app/(auth)/register/organization/page.tsx` | `POST /api/auth/register-organization` |
| Anjo | `/register/angel` | `src/app/(auth)/register/angel/page.tsx` | `POST /api/auth/register-angel` |

Redirect de roles profissionais legados: `src/middleware.ts` (query `?role=PROFESSIONAL|PSYCHOANALYST|...` ? `/register/professional/signup`).

**P?s-cadastro (verifica??o):** `/verify-account` ? `/verify-email` ou `/verify-sms`  
**P?s-login (completar perfil):** `/onboarding` ? `/professional/settings` ou `/psychologist/settings` (`src/app/onboarding/page.tsx:20-21`)

Psic?logo **n?o** tem role Prisma separado: ? `User.role = PROFESSIONAL` + `ProfessionalProfile.specialty = "Psychologist"` (`register/route.ts:234-235`).

### 2.2 APIs chamadas no cadastro inicial

| Fase | M?todo | Rota | Arquivo |
|------|--------|------|---------|
| Formul?rio | POST | `/api/auth/register` | `src/app/api/auth/register/route.ts` |
| Google (pr?) | POST | `/api/auth/oauth-intent` | `src/app/api/auth/oauth-intent/route.ts` |
| Google (auth) | ? | NextAuth `signIn("google")` | `src/lib/auth.ts:208-326` |
| Aviso SMS | GET | `/api/auth/sms-status` | `RegisterVerificationNotice.tsx:17` |
| Verifica??o | GET/POST | `/api/auth/verify-email`, `verify-sms-code`, etc. | v?rios em `src/app/api/auth/` |

### 2.3 Ordem de opera??es no banco ? formul?rio (`POST /api/auth/register`)

**Antes da transa??o** (falha ? 400/409, nada persistido):

1. Valida??o Zod ? `route.ts:71-78`
2. Consentimento HIPAA/GDPR ? `98-110`
3. Parse telefone ? `116-126`
4. `findUnique` e-mail lowercased ? `128-143`
5. Duplicata: reenvio (200) ou 409 ? `145-179`
6. `bcrypt.hash` ? `182`

**Dentro de `db.$transaction`** (`189-277`):

1. `tx.user.create` ? `190-199` (campos: email, passwordHash, role, region, language opcional; **sem** timezone/tokenVersion expl?citos ? defaults do schema)
2. Perfil conforme role:
   - `PATIENT` ? `patientProfile.create` + `linkChartsToPatientOnSignup` ? `201-211`
   - `PSYCHOANALYST` ? `psychoanalystProfile.create` ? `212-221`
   - `INTEGRATIVE_THERAPIST` ? `integrativeTherapistProfile.create` ? `222-231`
   - `PROFESSIONAL` / psic?logo ? `professionalProfile.create` (licenseNumber `""`, specialty `"Psychologist"` ou slug) ? `232-248`
3. `tx.consent.createMany` ? `263-272`
4. `saveRegistrationPhone` ? `user.update` + `professionalProfile.updateMany` ? `274`, `save-registration-phone.ts:16-32`

**Ap?s commit** (User+perfil j? existem):

| # | Opera??o | Linhas | Pode lan?ar? | Rollback? |
|---|----------|--------|-------------|-----------|
| 5 | `attachLinkedDocumentsToPatientProfile` | 280-284 | Sim (s? PATIENT) | N?o; erro logado |
| 6 | `verificationToken.deleteMany` | 291-293 | Sim | N?o ? **500** |
| 7 | `verificationToken.create` | 294-300 | Sim | N?o ? **500** |
| 8 | `sendEmailVerification` (Resend) | 303-314 | Sim | N?o; erro logado, cadastro OK |

### 2.4 Ordem ? Google OAuth (`auth.ts` signIn callback)

**Sem transa??o.** Mesma ordem da tabela da se??o 1.

**N?o criado no OAuth:** registros de `Consent`, `verificationToken` (e-mail j? verificado).

### 2.5 Compara??o paciente

Id?ntico em estrutura; diferen?a: `patientProfile` com `firstName`/`lastName` criptografados (`encrypt()`), e p?s-transa??o `attachLinkedDocumentsToPatientProfile`.

---

## 3. Todos os pontos de falha entre `user.create` e conclus?o

### 3.1 Cadastro inicial ? formul?rio (dentro da transa??o)

| Ponto | Arquivo:linha | Risco |
|-------|---------------|-------|
| `user.create` constraint `@unique` email | `register/route.ts:190-199` | Rollback (improv?vel ap?s check linha 130) |
| `professionalProfile.create` campos obrigat?rios | `register/route.ts:239-248` | Rollback; defaults satisfazem schema (`schema.prisma:484-493`, `521`) |
| `consent.createMany` | `register/route.ts:263-272` | Rollback |
| `encryptUserPhone` / `ENCRYPTION_KEY` inv?lida | `save-registration-phone.ts:14-18` ? `encryption.ts:10-15` | Rollback de toda a transa??o |
| `professionalProfile.updateMany` (telefone) | `save-registration-phone.ts:28-32` | Rollback se perfil n?o criado (mesma tx) |

### 3.2 Cadastro inicial ? formul?rio (p?s-transa??o)

| Ponto | Arquivo:linha | Sintoma |
|-------|---------------|---------|
| Token de verifica??o | `register/route.ts:291-300` | 500 gen?rico; User+perfil existem; retry ? **reenvio**, n?o 409 |
| E-mail Resend | `register/route.ts:303-314` | Cadastro OK; usu?rio na `/verify-account` |

### 3.3 Cadastro inicial ? OAuth (sem transa??o) ? **principal risco de ?rf?o**

| Ponto | Arquivo:linha | ?rf?o? |
|-------|---------------|--------|
| `user.create` | `auth.ts:229-236` | ? |
| `professionalProfile.create` | `auth.ts:238-249` | **Sim**, se falhar |
| `psychoanalystProfile` / `integrativeTherapistProfile` / `patientProfile` | `auth.ts:250-280` | **Sim**, perfil errado ou ausente |
| `saveRegistrationPhone` | `auth.ts:283-285` | Perfil j? existe; User n?o ?rf?o de profissional |
| `account.create` | `auth.ts:305-318` | User+perfil existem; login Google pode falhar depois |
| Cookie intent inv?lido ? role PATIENT | `auth.ts:46`, `272-280` | User com **patientProfile**, n?o profissional |

### 3.4 Completar perfil p?s-login (n?o ? cadastro inicial, mas faz parte do onboarding)

| Ponto | Arquivo:linha | Transa??o? |
|-------|---------------|------------|
| `professionalProfile.update` ou `.create` fallback | `professional/profile/route.ts:94-107` | N?o |
| `ensureVirtualCard` | `professional/profile/route.ts:110-117` ? `public-profile.ts` | N?o; pode lan?ar |
| Stripe Connect | n?o no cadastro inicial | ? |
| Upload S3 (CV psic?logo) | settings, n?o signup | ? |

Dashboard redireciona se sem perfil (`professional/page.tsx:64`, `psychologist/page.tsx:70`) ? n?o crasha; vai para `/onboarding`.

### 3.5 Campos `timezone` e `tokenVersion`

| Campo | No cadastro | Default |
|-------|-------------|---------|
| `User.timezone` | N?o setado em register/OAuth | `"America/Sao_Paulo"` (`schema.prisma:313`) |
| `User.tokenVersion` | N?o setado | `0` (`schema.prisma:334`) |
| `ProfessionalProfile.timezone` | N?o setado no signup | `"America/Sao_Paulo"` (`schema.prisma:526`) |

Sync de timezone p?s-login s? para **pacientes** no layout (`src/app/(dashboard)/layout.tsx:62-87`). **Nenhum c?digo de cadastro l? `ProfessionalProfile.timezone` ou falha por timezone ausente.**

`tokenVersion` s? incrementa em troca/reset de senha (`change-password`, `reset-password`); validado no JWT (`auth.ts:394-405`).

### 3.6 Lowercase de e-mail

| Caminho | Cliente lowercases? | Servidor lowercases? |
|---------|--------------------|--------------------|
| Formul?rio register | N?o (`register-shared.tsx:231`) | Sim (`register/route.ts:128`, `192`) |
| Login formul?rio | Sim (`login/page.tsx:68`) | Sim (`auth.ts:139-140`) |
| Google OAuth | N/A | Sim (`auth.ts:211`, `231`) |
| Duplicata check | ? | Sempre `email.toLowerCase()` antes de `findUnique` |

Inconsist?ncia de **case no banco** s? afetaria registros legados criados antes da normaliza??o (constraint `@unique` exact-match, `schema.prisma:305`). Fluxo atual grava lowercase.

---

## 4. "Email already in use" ? onde e quando

**Mensagem exata:** `{ error: { email: ["Email already in use"] } }`, HTTP **409**.

| Rota | Linha |
|------|-------|
| `src/app/api/auth/register/route.ts` | 177 |
| `src/app/api/auth/register-organization/route.ts` | 94 |
| `src/app/api/auth/register-angel/route.ts` | 258 |

**L?gica (`register/route.ts:145-179`):**

- Mesmo `role` + **n?o verificado** ? reenvia e-mail, retorna **200** `pendingVerification` (n?o bloqueia).
- Caso contr?rio ? **409**.

Portanto **409 + conta invis?vel no admin de profissionais** indica fortemente:

1. Usu?rio **j? verificado** (`emailVerified` ou `phoneVerified`) ? t?pico de OAuth; ou  
2. **Role diferente** (ex.: PATIENT por cookie OAuth perdido); ou  
3. User ?rf?o verificado sem `ProfessionalProfile`.

Check ? **case-insensitive na pr?tica** (sempre lowercases antes do lookup); n?o usa `mode: "insensitive"` do Prisma.

---

## 5. Por que o admin n?o v? a conta

### 5.1 Query principal

`listAdminProviders` / `searchAdminProviders` ? `loadRawAdminRows()` em `src/lib/admin-providers-list.ts:121-210`:

```147:162:src/lib/admin-providers-list.ts
        db.professionalProfile.findMany({
          where: { user: ACTIVE_USER },
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { email: true, region: true, emailVerified: true, ... } },
            ...
          },
        }),
```

`ACTIVE_USER = { deletedAt: null }` (linha 82).

**Profissionais s? existem na listagem se houver linha em `ProfessionalProfile`.** `User` com `role: PROFESSIONAL` sem perfil **nunca entra** na query.

Psicanalistas e terapeutas integrativos usam tabelas pr?prias (`psychoanalystProfile`, `integrativeTherapistProfile`, linhas 169-208). Anjos: `angelProfile` (linha 128).

### 5.2 Busca por e-mail/nome

`searchAdminProviders` (`admin-providers-list.ts:388-419`) filtra **sobre os arrays j? carregados** de perfis ? n?o consulta `User` diretamente. Sem perfil ? busca vazia.

### 5.3 Outros filtros (n?o explicam invisibilidade total)

- Aba ativa (`pendentes`, `medicos`, `psicologos`, ?): filtra por specialty/license **depois** de carregar perfis; aba **"todos"** inclui todos os perfis.
- `verified: false` no cadastro inicial ? normal; ainda aparecem (contados em `pendentes`).
- `user.deletedAt != null`: exclu?dos mesmo com perfil.

### 5.4 Tela admin para usu?rios ?rf?os

**N?o existe.** Nenhuma rota em `src/app/(dashboard)/admin/` lista `User` sem perfil. Ferramenta CLI: `scripts/inspect-provider-email.mjs:162-164`.

Admin home (`AdminHomeClient.tsx`): integra??es, audit, doctors, **patients**, etc. ? sem "usu?rios incompletos".

**Nota:** User ?rf?o com `patientProfile` (cen?rio cookie OAuth) pode aparecer em **`/admin/patients`** (`patientProfile.findMany` em `src/lib/admin/patient-monitoring.ts`), mas n?o em Profissionais.

---

## 6. Proposta de corre??o em fases

### Fase 1 ? Corrigir atomicidade OAuth (prioridade alta, sem migration)

**Objetivo:** eliminar User ?rf?o no caminho Google.

1. Envolver passos 4?7 da se??o 1 em `db.$transaction` dentro de `auth.ts:221-318`, espelhando `register/route.ts:189-277`.
2. Incluir `consent.createMany` no OAuth (hoje ausente) ou documentar exce??o GDPR consciente.
3. Se `signIn` falhar ap?s rollback, retornar erro expl?cito (n?o deixar User parcial).

**Arquivos:** `src/lib/auth.ts:221-318`.

### Fase 2 ? Retomada de cadastro quando e-mail existe sem perfil (sem migration)

**Objetivo:** resolver 409 para contas ?rf?s.

1. Em `register/route.ts:145-179`, antes do 409, detectar:
   - `existing.role === PROFESSIONAL` (ou role solicitado)
   - `!existing.professionalProfile` (include no `findUnique`, linha 130-142)
2. Responder com fluxo dedicado: criar perfil faltante **em transa??o** com dados do formul?rio, ou retornar `{ incompleteSignup: true }` e UI "Retomar cadastro".
3. Mesma l?gica para psicanalista/integrativo (`psychoanalystProfile`, `integrativeTherapistProfile`).

**Arquivos:** `src/app/api/auth/register/route.ts`, `register-shared.tsx` (tratar novo c?digo de resposta).

### Fase 3 ? Erros vis?veis no front (sem migration)

1. Mapear c?digos OAuth (`AccessDenied`, falha de perfil) para mensagens i18n em `/login` e `/callback` ? hoje timeout gen?rico (`callback/page.tsx:39-41`, `80`).
2. Diferenciar 500 p?s-transa??o (token) de falha real ? mensagem "Conta criada; clique para reenviar verifica??o" em vez de banner gen?rico.
3. Confirmar em Sentry se crashes s?o `global-error` vs. mensagens de API.

### Fase 4 ? Visibilidade admin para ?rf?os (sem migration de schema)

1. Nova se??o em admin ou filtro "Cadastro incompleto": query expl?cita:

   ```ts
   db.user.findMany({
     where: {
       deletedAt: null,
       role: { in: ["PROFESSIONAL", "PSYCHOANALYST", "INTEGRATIVE_THERAPIST"] },
       professionalProfile: null,
       psychoanalystProfile: null,
       integrativeTherapistProfile: null,
     },
   })
   ```

2. A??es: completar perfil, reenviar verifica??o, ou soft-delete/anonymize.

**Arquivos sugeridos:** novo endpoint `src/app/api/admin/incomplete-signups/route.ts`, UI em admin.

### Fase 5 ? Cookie OAuth mais robusto (opcional)

1. N?o defaultar silenciosamente para `PATIENT` (`auth.ts:46`) ? falhar signup se cookie ausente/expirado com mensagem clara.
2. Aumentar TTL ou revalidar role na URL de callback (`/callback?portal=psychologist`).

### Contas ?rf?s j? existentes (operacional, n?o c?digo)

1. **Diagn?stico:** `node scripts/inspect-provider-email.mjs <email>` (Railway/produ??o).
2. **Com perfil faltante + role PROFESSIONAL:** criar `ProfessionalProfile` manualmente ou via script; specialty `"Psychologist"` se aplic?vel.
3. **Com role PATIENT errada:** avaliar migra??o de role + cria??o de perfil profissional (cuidado com FKs/consent).
4. **Verificados sem senha (s? Google):** orientar login Google ou fluxo "definir senha".

---

## 7. Resumo executivo

| Pergunta | Resposta |
|----------|----------|
| Formul?rio deixa User ?rf?o? | **N?o** (transa??o at?mica User+perfil+consent+telefone) |
| Google OAuth deixa User ?rf?o? | **Sim** (sem transa??o; User verificado antes do perfil) |
| Por que "Email already in use"? | User verificado ou role diferente; ?rf?o OAuth cai aqui |
| Por que admin n?o v?? | Queries em `*Profile`, n?o em `User` |
| timezone/tokenVersion causam falha? | **N?o** no cadastro (defaults DB) |
| Error boundary no form? | Improv?vel; OAuth/login mais prov?veis para erro gen?rico |

**A??o imediata recomendada:** Fase 1 (transa??o OAuth) + Fase 2 (retomada quando e-mail existe sem perfil) + auditoria de ?rf?os em produ??o via script existente.
