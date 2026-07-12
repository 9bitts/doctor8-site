# AUDITORIA COMPLETA � Autentica��o, Cadastro e Roteamento P�s-Login

**Modo:** somente leitura � **Data:** 2026-07-03 � **Escopo:** todos os roles, Auth.js v5, middleware, cadastros, verifica��o, cookies humanit�rios.

---

## 1. Sum�rio executivo

### 1.1 Causa raiz prov�vel � Sintoma 1 (ANGEL / INTEGRATIVE_THERAPIST: sem confirma��o, �n�o conseguem acessar�, perdidos)

**ANGEL � sequ�ncia exata:**

1. Submit em `register/angel/page.tsx:159-165` ? API `register-angel/route.ts:333` retorna `{ success: true }` **sem auto-login**.
2. Redirect imediato para `/verify-account` � **n�o h� tela de �cadastro recebido�**; a �nica orienta��o pr�-submit � o par�grafo `angel.register.note` (`register/angel/page.tsx:320-322`, tradu��o em `translations.ts:4601`).
3. Se o e-mail de verifica��o falhar, o erro � s� `console.error` (`register-angel/route.ts:323-325`) � o usu�rio v� `/verify-account` como se tudo tivesse funcionado.
4. Login antes de verificar ? `auth.ts:174-176` lan�a `EmailNotVerified` ? login mostra estado �unverified� (`login/page.tsx:89-94`) � **correto mas f�cil de confundir com �cadastro n�o funcionou�**.
5. Ap�s verificar e-mail, `verify-email/confirmed/VerifyConfirmedClient.tsx:30` monta link de login **sem `callbackUrl`** ? login gen�rico ? home `/humanitarian/angel` (`role-home.ts:23-24`) s� se o usu�rio n�o perder o fluxo.
6. Anjo verificado mas **PENDING** ? `humanitarian/angel/page.tsx:156-181` mostra upload de certificado; mensagem de aprova��o admin existe mas **n�o h� e-mail de boas-vindas p�s-cadastro**.
7. Anjo **APPROVED** sem enrollment (edge) ? API retorna `NOT_ENROLLED` (`angel.ts:41-41`) mas **UI n�o trata esse status** (`humanitarian/angel/page.tsx` � nenhum branch para `NOT_ENROLLED`) ? tela �ativa� vazia.

**INTEGRATIVE_THERAPIST � sequ�ncia exata:**

1. Cadastro via `register/professional/signup` ? `RegisterAccountForm` (`register-shared.tsx:251-328`) ? `register/route.ts:402-439` cria `integrativeTherapistProfile` na mesma transa��o.
2. Sucesso ? redirect para `/verify-account` (`register-shared.tsx:322-328`) � **sem toast/tela de sucesso**; apenas `RegisterVerificationNotice` opcional (`RegisterVerificationNotice.tsx:16-23`).
3. `profileComplete` **deveria** ser `true` ap�s login (`user-profile-complete.ts:40-41`, `auth.ts:368-375`) � role **n�o** cai em `/signup/role` se o perfil existir.
4. Bloqueio real: **conta n�o verificada** ? mesmo `EmailNotVerified` que outros roles; usu�rio interpreta como �n�o consigo entrar�.
5. P�s-verifica��o: link �Entrar� em `VerifyConfirmedClient.tsx:62-68` **n�o preserva `callbackUrl=/integrative-therapist`** ? destino correto s� via `resolveRoleHome` no login sem deep link.

**Ponto onde o fluxo abandona o usu�rio (Sintoma 1):** entre `register-angel/route.ts:333` ou `register/route.ts:483-490` e a chegada efetiva ao painel � gap de **confirma��o expl�cita de sucesso** + depend�ncia de e-mail + verifica��o + (anjos) aprova��o admin sem notifica��o proativa.

---

### 1.2 Causa raiz prov�vel � Sintoma 2 (login cai direto no voluntariado; voltar pisca)

**Causa A � deep link p�s-login intencional ou stale (mais prov�vel para �cair direto no volunt�rio�):**

1. Qualquer acesso n�o autenticado a `/humanitarian/volunteer` ? middleware `middleware.ts:264-268` redireciona para `/login?callbackUrl=/humanitarian/volunteer`.
2. Ap�s login, `login/page.tsx:107-117` chama `safePostLoginUrl(..., savedCallback || callbackUrl)` ? para `PROFESSIONAL`/`PSYCHOANALYST`/`INTEGRATIVE_THERAPIST`, `/humanitarian/volunteer` � permitido (`role-home.ts:40-43`) ? **destino = fila de volunt�rio, n�o painel principal**.
3. Mesmo mecanismo via `persistAuthCallback` (`auth-callback.ts:9-13`) + Google OAuth (`login/page.tsx:133-137` ? `/callback` ? `callback/page.tsx:51-64`).
4. Cookie `doctor8.hum.return` (2h) preenchido ao visitar campanha paciente (`origin-cookie.ts:76-82`, `middleware.ts:134-142`) ? `resolveClientAuthCallback` (`auth-callback.ts:28-36`) usa return path quando `?callbackUrl=` est� vazio (`login/page.tsx:41`) ? profissional pode ir para **fluxo humanit�rio paciente**, n�o volunt�rio, mas mesmo desvio do painel.

**Causa B � loop de redirect �piscando� (mais prov�vel para o flicker ao voltar):**

1. `humanitarian/volunteer/page.tsx:138-146` � se h� consulta `CALLED`/`IN_PROGRESS`, **auto-`router.push` para `/video/humanitarian/{id}`** (coment�rio linhas 133-135 reconhece o risco de loop).
2. Usu�rio clica voltar do v�deo ? retorna ao volunteer ? `load()` roda de novo ? **novo push para v�deo** = loop visual (�piscando�).
3. Guard `doctor8.leftConsult` em `sessionStorage` mitiga s� se setado explicitamente � **back do browser n�o seta**.
4. Bot�o �Home� no shell (`HumanitarianShell.tsx:72-77`, `107-109`) leva a `resolveRoleHome` ? painel correto; **n�o forma ciclo com middleware**. O flicker � **volunteer ? video**, n�o volunteer ? `/professional`.

---

### 1.3 Causa raiz prov�vel � Sintoma 3 (outros roles, redirects/confirma��o an�logos)

Padr�o transversal:

| Mecanismo | Onde | Efeito |
|-----------|------|--------|
| Sem tela de sucesso p�s-cadastro | `register-shared.tsx:322-328`, `register/organization/page.tsx:120-126` | Usu�rio n�o sabe se deu certo |
| `callbackUrl` perdido ap�s verifica��o | `email.ts:52-56`, `VerifyConfirmedClient.tsx:30` | Login p�s-verify n�o restaura destino |
| Cookie humanit�rio sobrevive logout | `logout-cleanup.ts:116-136` (n�o expira `doctor8.hum.*`) | Login posterior herda contexto SOS |
| `readClientHumOriginFlag` ? cookie httpOnly | `origin-cookie.ts:119-122` vs `feature-flags.ts:44-49` | Cliente acha que skip de verifica��o aplica; servidor pode discordar |
| OAuth sem intent | `auth.ts:256-258` | Novo usu�rio Google vai a `/signup/role` sem sess�o; s� �Continuar com Google� de novo |
| Middleware n�o expulsa autenticado de `/register` | `middleware.ts:207-209` | Conta logada ainda v� formul�rios de cadastro |

---

### 1.4 Top 10 problemas mais graves do funil

| # | Severidade | Problema | Arquivo:linha |
|---|------------|----------|---------------|
| 1 | **Cr�tica** | Cookie humanit�rio (`doctor8.hum.origin` / `doctor8.hum.return`) **n�o limpo no logout** � login seguinte herda destino SOS/volunt�rio | `logout-cleanup.ts:116-136` |
| 2 | **Cr�tica** | Loop volunteer ? video ? back ? volunteer (auto-redirect consulta ativa) | `humanitarian/volunteer/page.tsx:138-146` |
| 3 | **Alta** | P�s-login usa `callbackUrl` stale (`/humanitarian/volunteer`) ignorando �painel principal� | `login/page.tsx:107-117`, `role-home.ts:74-111` |
| 4 | **Alta** | Cadastro ANGEL/IT/profissional: **zero confirma��o de sucesso** antes de verify-account | `register/angel/page.tsx:159-165`, `register-shared.tsx:322-328` |
| 5 | **Alta** | Link de verifica��o e tela confirmed **n�o propagam `callbackUrl`** | `email.ts:52-56`, `VerifyConfirmedClient.tsx:30` |
| 6 | **Alta** | Status `NOT_ENROLLED` para anjo aprovado sem enrollment � **sem UI** | `angel.ts:41`, `humanitarian/angel/page.tsx:156-196` |
| 7 | **M�dia** | Register / register-angel / register-organization **sem rate limit** | `register/route.ts`, `register-angel/route.ts`, `register-organization/route.ts` |
| 8 | **M�dia** | Enumera��o de e-mail no register (`Email already in use`) | `register/route.ts:297-301`, `register-angel/route.ts:257-260` |
| 9 | **M�dia** | Diverg�ncia client/server skip verifica��o humanit�ria | `register-shared.tsx:281-286` vs `feature-flags.ts:44-49` |
| 10 | **M�dia** | Google novo usu�rio sem intent ? `/signup/role` sem sess�o; UX �rf� | `auth.ts:256-258`, `signup/role/page.tsx:207-244` |

---

## 2. Matriz de jornadas

Legenda: **Verif.** = verifica��o exigida � **Sucesso** = feedback claro � **Destino** = primeiro landing ap�s auth completa � **OK?** = destino correto para o role.

### 2.1 PATIENT

| Role | M�todo | Entrada | Verif. | Tela sucesso | Destino p�s-login | OK? | Decis�o redirect (arquivo:linha) |
|------|--------|---------|--------|--------------|-------------------|-----|----------------------------------|
| PATIENT | Form e-mail/senha | `/register` site normal | Sim (e-mail) | N�o � vai direto `/verify-account` | Ap�s verify+login: `/patient` | Sim | `register-shared.tsx:322-328` ? login `login/page.tsx:111-117` ? `resolveRoleHome` `role-home.ts:25-27` |
| PATIENT | Form | `/register?callbackUrl=/humanitarian/...` + cookie middleware | **N�o** se `doctor8.hum.origin=1` e flag off | Auto-login silencioso | Campanha humanit�ria | Sim* | Skip: `register/route.ts:204-206`, `feature-flags.ts:44-49`; destino: `register-shared.tsx:303-310`, `patient-home.ts:15-17` |
| PATIENT | Form | `/sos-venezuela` ? register | Idem humanit�rio | Idem | `/humanitarian/{slug}` | Sim* | Cookie: `middleware.ts:134-142`, `origin-cookie.ts:35-38` |
| PATIENT | Google OAuth | `/register` com oauth-intent | Sim (Google marca verified) | N�o | `/callback` ? home ou callback | Sim | Intent: `oauth-intent/route.ts:27-49`; perfil: `auth.ts:266-290`; destino: `callback/page.tsx:51-64` |
| PATIENT | Google OAuth | Sem intent (conta nova) | N/A | N/A | Redirect `/signup/role` **sem sess�o** | **N�o** | `auth.ts:256-258` |
| PATIENT | Google OAuth | `/signup/role` complete | Sim | N�o | `complete-signup` ? home | Sim | `signup/role/page.tsx:176-199`, `complete-signup/route.ts:99-101` |
| PATIENT | Magic link | Embed/booking p�blico | Auto-verify no use | E-mail com link | `/auth/magic` ? sess�o | Sim | `auth.ts:86-113`, `magic-link/route.ts:41-57` |

\*Skip de verifica��o **s�** com cookie httpOnly `doctor8.hum.origin` no servidor; cliente pode enganar com `doctor8.hum.return` sozinho (`origin-cookie.ts:119-122`).

### 2.2 PROFESSIONAL (incl. psic�logo via specialty)

| Role | M�todo | Entrada | Verif. | Tela sucesso | Destino p�s-login | OK? | Decis�o redirect |
|------|--------|---------|--------|--------------|-------------------|-----|------------------|
| PROFESSIONAL | Form | `/register/professional/signup` | Sim | N�o ? verify-account | `/professional` ou `/psychologist` se specialty | Sim | Profile: `register/route.ts:108-120`; home: `role-home.ts:15-16`, `psychologist-portal.ts` |
| PROFESSIONAL | Form | `?portal=psychologist` | Sim | N�o | `/psychologist` | Sim | `register/professional/signup/page.tsx:48-52` |
| PROFESSIONAL | Google | register form | Sim (Google) | N�o | `/callback?portal=psychologist` ou `/callback` | Sim | `register-shared.tsx:229-235`, `callback/page.tsx:51-64` |
| PROFESSIONAL | Credentials login | `/login` | Sim | N/A | `resolveRoleHome` | Sim | `login/page.tsx:111-117`, `middleware.ts:184-194` |
| PROFESSIONAL | Login | `?callbackUrl=/humanitarian/volunteer` | N/A | N/A | **`/humanitarian/volunteer`** (n�o painel) | **Parcial** | `safePostLoginUrl` `role-home.ts:104-108`; volunteer permitido `role-home.ts:40-43` |
| PROFESSIONAL | Login | Cookie hum return 2h ap�s SOS | N/A | N/A | Campanha paciente (path cookie) | **N�o** | `auth-callback.ts:28-36`, `login/page.tsx:41` |

Psic�logo em `/professional/*` ? redirect client `PsychologistPortalRedirect.tsx:12-16` (layout `professional/layout.tsx:18-22`).

### 2.3 PSYCHOANALYST

| M�todo | Entrada | Verif. | Sucesso | Destino | OK? | Redirect |
|--------|---------|--------|---------|---------|-----|----------|
| Form | `/register/professional/signup?role=PSYCHOANALYST` | Sim | N�o | `/psychoanalyst` | Sim | `signup-profile-create.ts:32-41`, `role-home.ts:17-18` |
| Google | Idem + oauth-intent | Sim | N�o | `/callback` ? `/psychoanalyst` | Sim | `auth.ts:266-283` |
| Login volunteer callback | Nav / bookmark | N/A | N/A | `/humanitarian/volunteer` | Parcial | `role-home.ts:40-43` |

### 2.4 INTEGRATIVE_THERAPIST ?? (Sintoma 1)

| M�todo | Entrada | Verif. | Sucesso | Destino | OK? | Redirect |
|--------|---------|--------|---------|---------|-----|----------|
| Form | `/register/professional/signup?role=INTEGRATIVE_THERAPIST` | Sim | **N�o** � verify-account imediato | `/integrative-therapist` | Sim se verify OK | `register/route.ts:123-129`, `register-shared.tsx:322-328` |
| Google | signup/role ou register | Sim | N�o | `/integrative-therapist` | Sim | `signup-profile-create.ts:43-52` |
| profileComplete | JWT | N/A | N/A | Exige `integrativeTherapistProfile` | **Sim** | `user-profile-complete.ts:40-41`, `auth.ts:368-375` |
| OAuth �rf�o | Google sem intent | N/A | N/A | `/signup/role` | **Confuso** | `auth.ts:256-258` |

**Gap Sintoma 1:** usu�rio submete form ? `register-shared.tsx:322` ? `/verify-account` sem mensagem �cadastro OK, verifique e-mail�. Falha de e-mail: `register/route.ts:472-475` s� log.

### 2.5 ANGEL ?? (Sintoma 1)

| M�todo | Entrada | Verif. | Sucesso | Destino p�s-login | OK? | Redirect |
|--------|---------|--------|---------|-------------------|-----|----------|
| Form multipart | `/register/angel` | Sim (e-mail) | **N�o** � nota pequena pr�-submit | `/humanitarian/angel` | Parcial | `register/angel/page.tsx:159-165`, `role-home.ts:23-24` |
| Aprova��o admin | Ap�s verify | Admin PATCH | N/A | Enrollment criado | Sim se aprovado | `admin/humanitarian/angels/route.ts:113-134` |
| PENDING login | Verificado, n�o aprovado | N/A | UI pending | `/humanitarian/angel` status PENDING | **Parcial** | `angel/page.tsx:156-181`, `angel.ts:27` |
| N�o verificado login | � | Bloqueado | Erro unverified | � | Sim (bloqueio) | `auth.ts:174-176` |
| profileComplete | Exempt | N/A | N/A | Nunca `/signup/role` | Sim | `user-profile-complete.ts:9`, `sessionProfileIncomplete` `user-profile-complete.ts:69` |

**register-angel exige certificado + verifica��o e-mail; n�o h� auto-login.** Aprova��o admin obrigat�ria � informada em `angel.register.note` mas **n�o refor�ada p�s-submit**.

### 2.6 ORGANIZATION

| M�todo | Entrada | Verif. | Sucesso | Destino | OK? | Redirect |
|--------|---------|--------|---------|---------|-----|----------|
| Form CNPJ | `/register/organization` | Sim | N�o ? verify-account | `/organization` | Sim | `register/organization/page.tsx:120-126`, `role-home.ts:21-22` |
| Staff invite | `/register/organization/staff?token=` | **N�o** (emailVerified na cria��o) | JSON success � **sem auto-login** | Manual login ? `/organization` | **Parcial** | `register-organization-staff/route.ts:102`, `134` |
| profileComplete | Exempt ORGANIZATION | N/A | N/A | Sem perfil table � via Member | Sim | `user-profile-complete.ts:9` |

### 2.7 ADMIN

Sem cadastro p�blico. Login ? `/admin` (`role-home.ts:13-14`). Middleware `middleware.ts:298-300`.

### 2.8 Magic link (somente PATIENT)

`magic-link/route.ts:69-71` � se role ? PATIENT, responde `{ success: true }` silencioso (anti-enumera��o) mas **n�o envia link**.

---

## 3. Mapa de redirects e loops

### 3.1 Invent�rio de decisores de destino p�s-auth

| Ordem t�pica | Componente | Fun��o | Arquivo:linha |
|--------------|------------|--------|-------------|
| 1 | Middleware | Auth gate, profile incomplete ? `/signup/role`, login autenticado ? home | `middleware.ts:145-369` |
| 2 | Auth.js `signIn` callback | Google sem intent ? `/signup/role`; cria perfil OAuth | `auth.ts:242-332` |
| 3 | Auth.js `jwt` / `session` | `profileComplete`, `tokenVersion`, specialty | `auth.ts:335-449` |
| 4 | Login client | `safePostLoginUrl` + `persistAuthCallback` | `login/page.tsx:107-117` |
| 5 | `/callback` page | Consome callback, profile incomplete ? `/signup/role` | `callback/page.tsx:34-64` |
| 6 | `safePostLoginUrl` | Deep link se role permitido; sen�o home | `role-home.ts:74-111` |
| 7 | `resolvePatientPostLoginUrl` | SOS ? campanha; `/urgent` vazio ? `/patient` | `patient-home.ts:4-22` |
| 8 | Layout profissional | Psic�logo: redirect `/professional` ? `/psychologist` | `professional/layout.tsx:18-22`, `PsychologistPortalRedirect.tsx:12-16` |
| 9 | P�ginas dashboard | Guards role-specific (`redirect("/login")`, onboarding) | ex.: `integrative-therapist/page.tsx:25-34` |
| 10 | HumanitarianShell | Back/Home por role | `HumanitarianShell.tsx:23-36`, `72-77` |
| 11 | Volunteer page | Auto-push v�deo consulta ativa | `humanitarian/volunteer/page.tsx:138-146` |

**N�o existe** callback `redirect` customizado no `NextAuth` config (`auth.ts`) � OAuth usa `callbackUrl: "/callback"` definido no client.

### 3.2 Cookie `doctor8.hum.origin` � quem grava, quem l�

| A��o | Onde | Linha |
|------|------|-------|
| Grava httpOnly origin + return | Middleware em paths paciente SOS/campanha | `middleware.ts:134-142`, `origin-cookie.ts:76-82` |
| Grava **s�** return (client) | Login/register sync callback | `origin-cookie.ts:85-96`, `login/page.tsx:64-66` |
| L� no login client | Fallback callback | `auth-callback.ts:28-36`, `origin-cookie.ts:114-122` |
| L� no login server (credentials) | Skip verify + effective callback | `auth.ts:156-166` |
| L� no register server | Skip verify PATIENT | `register/route.ts:197-206` |
| **N�o limpa no logout** | � | `logout-cleanup.ts:116-136` |

**Risco Sintoma 2:** visita campanha ? cookie 2h ? login gen�rico dias depois (dentro de 2h) em **qualquer role** ainda aplica return path (`origin-cookie.ts:147-155`). Profissional pode ir para UI de **paciente** humanit�rio.

**Volunt�rio:** path `/humanitarian/volunteer` **n�o** grava cookie humanit�rio (`origin-cookie.ts:26-31` exclui volunteer/angel) � mas **`?callbackUrl=/humanitarian/volunteer` persiste na URL** (`middleware.ts:266-267`).

### 3.3 Preced�ncia real (qual regra ganha)

```
Request autenticado
  ? middleware: /login ? ? home ou /signup/role se profileComplete false (middleware.ts:184-204)
  ? middleware: dashboard + profileComplete false ? ? /signup/role (middleware.ts:197-204)
  ? middleware: rota errada para role ? ? denyWrongRole ? home (middleware.ts:278-294)
  ? p�gina client (login/callback) usa safePostLoginUrl(callbackUrl) SE executado
  ? layout psychologist redirect SE /professional/* e specialty psic�logo
```

Conflito documentado: middleware manda incomplete profile para `/signup/role`; callback page idem (`callback/page.tsx:46-48`). **N�o h� ciclo** entre estes dois.

### 3.4 Ciclos encontrados

| Ciclo | Mecanismo | Severidade |
|-------|-----------|------------|
| **volunteer ? `/video/humanitarian/{id}`** | Auto-redirect em `load()` sem guard no browser back | **Confirmado** � `volunteer/page.tsx:138-146` |
| login ? callback | Mitigado: `safePostLoginUrl` rejeita `/callback` | `role-home.ts:65-71`, `callback/page.tsx:59-62` |
| /signup/role ? dashboard | Mitigado: exempt roles redirect out | `signup/role/page.tsx:114-116` |
| /professional ? /psychologist | One-shot replace, n�o loop | `PsychologistPortalRedirect.tsx:12-16` |

---

## 4. Becos sem sa�da e estados �rf�os

### 4.1 Conta criada, n�o verificada

| Role | Chega � verifica��o? | Reenvio | Link expirado |
|------|---------------------|---------|---------------|
| PATIENT/PRO/PSY/IT | Sim � `/verify-account` ? `/verify-email` | `resend-verification/route.ts:10-80` (sem rate limit!) | `verify-email/route.ts:35-42` ? `/verify-email?error=expired` |
| ANGEL | Sim � mesmo fluxo | Idem | Idem |
| ORGANIZATION | Sim | Idem | Idem |
| Staff invite | **Bypass** � `emailVerified: new Date()` | N/A | N/A |

SMS alternativo: `/verify-account` mostra SMS se `sms-status` habilitado (`VerifyAccountClient.tsx:61-80`).

### 4.2 Verificada, sem perfil (`profileComplete === false`)

| Role | `/signup/role` funciona? | Exempt? |
|------|--------------------------|---------|
| PATIENT | Sim � complete-signup | N�o |
| PROFESSIONAL | Sim | N�o |
| PSYCHOANALYST | Sim | N�o |
| INTEGRATIVE_THERAPIST | Sim | N�o |
| ANGEL | N/A � exempt | **Sim** `user-profile-complete.ts:9` |
| ADMIN | N/A | **Sim** |
| ORGANIZATION | N/A � exempt (sem profile table) | **Sim** |

OAuth �rf�o: usu�rio User row sem perfil ? middleware ? `/signup/role` (`middleware.ts:202-204`) ? `complete-signup/route.ts:69-88`.

### 4.3 Anjo aguardando aprova��o

- Login funciona ap�s verify (`auth.ts:174-176` passa).
- Portal mostra PENDING (`angel/page.tsx:171-178`) + upload certificado.
- **N�o** bloqueia middleware � acesso � rota `/humanitarian/angel` permitido (`middleware.ts:350-356`).
- Admin s� aprova se e-mail verificado (`admin/humanitarian/angels/route.ts:97-101`).

### 4.4 ORGANIZATION � jornada resumida

1. Register ? verify ? login ? `/organization` (`role-home.ts:21-22`).
2. Staff: token ? register ? **login manual** ? `/organization`.
3. `profileComplete` sempre true (exempt).

### 4.5 Logout e sess�o cruzada

| Item | Limpo no logout? | Arquivo |
|------|------------------|---------|
| sessionStorage authCallback | Sim | `logout-cleanup.ts:11`, `127-125` |
| Drafts/checklists scoped | Sim | `logout-cleanup.ts:120-125` |
| Scope cookies org/pro | Sim | `logout-cleanup.ts:127-129` |
| **doctor8.hum.origin / return** | **N�O** | � |
| doctor8.hum.return set client-side | **N�O** | � |
| JWT tokenVersion revoga | Sim � null session | `auth.ts:417-428` |
| `update({ refreshProfileComplete })` | Sim | `auth.ts:364-375`, `signup/role/page.tsx:198` |

Login pr�-clear: `login/page.tsx:78-79` chama `clearSensitiveClientState` + `signOut` antes de credentials � **bom para shared computers**, mas cookies hum persistem.

---

## 5. Confirma��es e mensagens

| Fluxo | Feedback sucesso | Gap Sintoma 1 |
|-------|------------------|---------------|
| Register PATIENT/PRO/IT | `/verify-account` (t�tulo traduzido) | Sem �conta criada com sucesso� |
| Register ANGEL | Idem + nota pr�-form | Sem confirma��o p�s-submit; falha e-mail silenciosa |
| Register ORG | Idem | Idem |
| Humanitarian PATIENT skip | Auto-login ? redirect | Funciona mas sem mensagem |
| verify-email/confirmed | Tela sucesso + bot�o login | Login **sem** callbackUrl |
| Login erros | Traduzidos PT/EN/ES | `login-shared.tsx:160-168`, `translations.ts` |
| Register erros API | Parcial � `mapRegisterApiErrors` | C�digos phone traduzidos; �Email already in use� **ingl�s fixo** `register/route.ts:299` |
| Angel pending | `angel.portal.pendingCertificate` | Falta �aguarde aprova��o admin� expl�cito no PENDING (s� nota no form) |

---

## 6. Seguran�a (camada auth � r�pido)

| Controle | Status | Arquivo:linha |
|----------|--------|---------------|
| Rate limit login credentials | Lockout 5 tentativas / 30 min | `auth.ts:184-201` |
| Rate limit register | **Ausente** | `register/route.ts` |
| Rate limit register-angel | **Ausente** | `register-angel/route.ts` |
| Rate limit resend-verification | **Ausente** | `resend-verification/route.ts` |
| Rate limit forgot-password | Sim 3/h email, 15/h IP | `forgot-password/route.ts:47-51` |
| Rate limit magic-link | Sim | `magic-link/route.ts:53-57` |
| Enumera��o e-mail register | **Sim** � �Email already in use� | `register/route.ts:297-301` |
| Enumera��o forgot/resend | Mitigado � sempre success | `resend-verification/route.ts:32-35`, `forgot-password` |
| tokenVersion revoga sess�o | Sim � check 60s | `auth.ts:417-428` |
| Skip verify humanit�rio vaza? | S� PATIENT + origin httpOnly + flag off | `feature-flags.ts:44-49`, `register/route.ts:204-206` |
| Cookie hum escopo | path=/, 2h, SameSite Lax | `origin-cookie.ts:62-73` |

---

## 7. Falhas (detalhado)

### F-01 � Cookie humanit�rio sobrevive logout
- **Arquivo:linha:** `logout-cleanup.ts:116-136`
- **Severidade:** Cr�tica
- **Impacto:** Login subsequente (mesmo outro usu�rio no browser) herda destino SOS/volunt�rio via `resolveClientAuthCallback` (`auth-callback.ts:28-36`).
- **Corre��o sugerida:** Expirar `doctor8.hum.origin` e `doctor8.hum.return` em `clearSensitiveClientState` e no evento `signOut` server-side.

### F-02 � Loop volunteer / video
- **Arquivo:linha:** `humanitarian/volunteer/page.tsx:138-146`
- **Severidade:** Cr�tica
- **Impacto:** Flicker ao voltar de consulta ativa (Sintoma 2).
- **Corre��o sugerida:** Setar `doctor8.leftConsult` no unmount/back do video; ou desabilitar auto-redirect ap�s navega��o manual; bot�o expl�cito �Retomar consulta�.

### F-03 � Login profissional cai em volunt�rio via callbackUrl
- **Arquivo:linha:** `login/page.tsx:107-117`, `role-home.ts:104-108`, `middleware.ts:266-267`
- **Severidade:** Alta
- **Impacto:** Sintoma 2 � bypass do painel principal.
- **Corre��o sugerida:** P�s-login default sempre `resolveRoleHome`; reservar deep link volunteer s� para navega��o expl�cita p�s-dashboard; limpar callbackUrl volunteer ap�s primeiro uso.

### F-04 � Sem confirma��o p�s-cadastro ANGEL/IT/PRO
- **Arquivo:linha:** `register/angel/page.tsx:159-165`, `register-shared.tsx:322-328`
- **Severidade:** Alta
- **Impacto:** Sintoma 1 � usu�rio perdido.
- **Corre��o sugerida:** Tela `/register/success` com pr�ximos passos (verificar e-mail, aguardar aprova��o para anjos).

### F-05 � callbackUrl perdido na cadeia verify
- **Arquivo:linha:** `email.ts:52-56`, `VerifyConfirmedClient.tsx:30`, `verify-email/route.ts:52`
- **Severidade:** Alta
- **Impacto:** P�s-verifica��o login n�o restaura destino pretendido (`/humanitarian/angel`, `/integrative-therapist`).
- **Corre��o sugerida:** Propagar `callbackUrl` assinado no token ou query at� confirmed e login href.

### F-06 � Angel NOT_ENROLLED sem UI
- **Arquivo:linha:** `angel.ts:41`, `humanitarian/angel/page.tsx:196+`
- **Severidade:** Alta
- **Impacto:** Anjo �aprovado� sem enrollment v� dashboard vazio.
- **Corre��o sugerida:** Branch UI + mensagem �contate suporte / aguarde enrollment�.

### F-07 � Falha envio e-mail cadastro silenciosa
- **Arquivo:linha:** `register-angel/route.ts:323-325`, `register/route.ts:472-475`
- **Severidade:** Alta
- **Impacto:** Usu�rio em verify-account sem e-mail recebido.
- **Corre��o sugerida:** Retornar flag `emailSent: false` e UI de retry inline.

### F-08 � readClientHumOriginFlag usa return cookie como proxy
- **Arquivo:linha:** `origin-cookie.ts:119-122`
- **Severidade:** M�dia
- **Impacto:** Client-side pensa estar em contexto humanit�rio sem stamp middleware; diverge do server em skip verify.
- **Corre��o sugerida:** Alinhar client flag ao httpOnly origin ou documentar que skip s� server-side.

### F-09 � Register endpoints sem rate limit
- **Arquivo:linha:** `register/route.ts:166`, `register-angel/route.ts:161`
- **Severidade:** M�dia
- **Impacto:** Abuso/spam de contas.
- **Corre��o sugerida:** Reutilizar `RATE_LIMITS.authEmail/authIp` de `rate-limit.ts:96-99`.

### F-10 � Enumera��o de e-mail no register
- **Arquivo:linha:** `register/route.ts:297-301`, `register-organization/route.ts:92-96`
- **Severidade:** M�dia
- **Impacto:** Descoberta de contas existentes.
- **Corre��o sugerida:** Resposta gen�rica + e-mail �voc� j� tem conta�.

### F-11 � Google OAuth sem intent ? signup/role �rf�o
- **Arquivo:linha:** `auth.ts:256-258`, `signup/role/page.tsx:247-252`
- **Severidade:** M�dia
- **Impacto:** Usu�rio Google novo cai em role picker sem sess�o; s� bot�o Google.
- **Corre��o sugerida:** Mensagem expl�cita + preservar e-mail Google em sess�o tempor�ria.

### F-12 � Org staff register sem auto-login
- **Arquivo:linha:** `register-organization-staff/route.ts:133`, staff page client
- **Severidade:** M�dia
- **Impacto:** Convite aceito mas usu�rio n�o sabe que deve ir ao login.
- **Corre��o sugerida:** Redirect `/login?registered=1` ou auto signIn.

### F-13 � resend-verification sem rate limit
- **Arquivo:linha:** `resend-verification/route.ts:10-80`
- **Severidade:** M�dia
- **Impacto:** Spam de e-mails / DoS Resend.
- **Corre��o sugerida:** `checkRateLimits` por email/IP.

### F-14 � Middleware permite autenticado em /register
- **Arquivo:linha:** `middleware.ts:207-209`
- **Severidade:** Baixa
- **Impacto:** Confus�o UX contas logadas.
- **Corre��o sugerida:** Redirect autenticado para home (exceto fluxos especiais).

### F-15 � verify-email/confirmed login perde contexto humanit�rio
- **Arquivo:linha:** `VerifyConfirmedClient.tsx:30`
- **Severidade:** M�dia
- **Impacto:** Paciente SOS p�s-verify n�o retorna � campanha automaticamente.
- **Corre��o sugerida:** Incluir callbackUrl no link de login confirmed.

---

## 8. Plano de corre��o em fases (pequenas, sem schema primeiro)

### Fase 1 � Quick wins UX (baixo risco auth)
1. Tela `/register/success` com copy por role (anjos: verify + aprova��o admin; IT: verify + login).
2. Branch `NOT_ENROLLED` + copy PENDING mais expl�cita em `humanitarian/angel/page.tsx`.
3. Bot�o �Retomar consulta� no volunteer em vez de auto-redirect (`volunteer/page.tsx:138-146`).
4. Propagar `callbackUrl` em `VerifyConfirmedClient.tsx:30` e links de e-mail verify.

**Teste obrigat�rio:** cadastro anjo + IT form; login p�s-verify; back do video volunteer.

### Fase 2 � Cookies e callbacks (risco m�dio)
1. Limpar `doctor8.hum.*` no logout (`logout-cleanup.ts`).
2. `resolveClientAuthCallback`: n�o aplicar cookie hum a roles ? PATIENT **ou** exigir origin httpOnly.
3. Consumir e limpar `callbackUrl` volunteer ap�s primeiro login profissional.
4. Alinhar `readClientHumOriginFlag` com server (`origin-cookie.ts:119-122`).

**Teste obrigat�rio:** visita SOS ? logout ? login profissional; login volunteer com callback stale.

### Fase 3 � Hardening (auth.ts / middleware � risco m�ximo, cir�rgico)
1. Rate limits em register, register-angel, resend-verification.
2. Respostas anti-enumera��o no register.
3. Middleware: autenticado em `/login` j� OK; adicionar redirect de `/register*` se session exists.
4. Google sem intent: mensagem + fluxo guiado em `/signup/role`.

**Teste obrigat�rio:** regress�o completa login todos roles; OAuth Google novo/existente; tokenVersion revoke; humanitarian skip s� PATIENT.

### Fase 4 � Congelados (n�o tocar neste ciclo)
- Zona humanit�ria fila/v�deo (exceto fix loop F-02).
- Schema / migrations.
- Refactor amplo de `auth.ts` callbacks.

---

## 9. Refer�ncia r�pida � homes por role

| Role | Home | Arquivo |
|------|------|---------|
| PATIENT | `/patient` | `role-home.ts:25-27` |
| PROFESSIONAL | `/professional` | `role-home.ts:15-16` |
| PROFESSIONAL (Psychologist) | `/psychologist` | `psychologist-portal.ts`, `role-home.ts:15-16` |
| PSYCHOANALYST | `/psychoanalyst` | `role-home.ts:17-18` |
| INTEGRATIVE_THERAPIST | `/integrative-therapist` | `role-home.ts:19-20` |
| ORGANIZATION | `/organization` | `role-home.ts:21-22` |
| ANGEL | `/humanitarian/angel` | `role-home.ts:23-24` |
| ADMIN | `/admin` | `role-home.ts:13-14` |

---

*Auditoria gerada por an�lise est�tica do reposit�rio doctor8. Nenhum arquivo de c�digo foi modificado.*
