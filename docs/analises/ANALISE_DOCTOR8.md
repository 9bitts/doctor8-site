# An�lise T�cnica � Doctor8

**Data:** 4 de julho de 2026  
**Escopo:** An�lise est�tica do reposit�rio (somente leitura). Configura��es externas (Supabase Dashboard, Railway, AWS, Stripe, Meta, Daily.co) marcadas como *verifica��o manual necess�ria* quando aplic�vel.

---

## Nota metodol�gica importante

O briefing descreve **Supabase + JavaScript vanilla**. O c�digo analisado implementa uma stack diferente:

| Briefing | C�digo real |
|----------|-------------|
| Supabase (Auth + PostgreSQL + RLS) | **PostgreSQL via Prisma** + **NextAuth (Auth.js v5)** |
| JavaScript vanilla | **Next.js 14 + React 18 + TypeScript** |
| Vercel (deploy) | README/DEPLOY referem **Railway**; compat�vel com Vercel |

N�o h� refer�ncias a Supabase, `service_role`, RLS ou fun��es plv8/RPC no reposit�rio. A seguran�a de acesso a dados � **100% na camada de aplica��o** (middleware + handlers de API), n�o no banco.

---

## 1. Vis�o geral da arquitetura

### 1.1 Mapa de m�dulos

```
doctor8/
??? prisma/
?   ??? schema.prisma          # ~100 modelos, PostgreSQL
?   ??? migrations/            # 34 migrations versionadas
??? src/
?   ??? app/
?   ?   ??? (auth)/            # login, register, verify-*, forgot/reset password
?   ?   ??? (dashboard)/       # dashboards por papel (patient, professional, admin, org�)
?   ?   ??? api/               # ~280 rotas REST (Route Handlers Next.js)
?   ?   ??? humanitarian/      # filas SOS Venezuela
?   ?   ??? sos-venezuela/     # landing p�blica
?   ?   ??? video/             # salas de teleconsulta
?   ?   ??? share/             # links p�blicos de prontu�rio
?   ??? components/            # UI React (Radix, Tailwind)
?   ??? lib/                   # auth, encryption, audit, chart-access, i18n, integra��es
?   ??? middleware.ts          # prote��o de rotas por sess�o e papel
??? e2e/                       # 10 specs Playwright
??? scripts/                   # seeds, migra��es auxiliares, cat�logos de medicamentos
```

### 1.2 Pap�is (roles) e �reas

| Role | Prefixo de rota | Fun��o |
|------|-----------------|--------|
| `PATIENT` | `/patient` | hist�rico, medicamentos, consultas, documentos, mensagens |
| `PROFESSIONAL` | `/professional`, `/psychologist` | prontu�rio, prescri��es, agenda, JIT plant�o |
| `PSYCHOANALYST` | `/psychoanalyst` | analisandos, sess�es, recursos |
| `INTEGRATIVE_THERAPIST` | `/integrative-therapist` | clientes integrativos |
| `ORGANIZATION` | `/organization` | cl�nica/empresa: pacientes, RH, ledger, TISS |
| `ANGEL` | `/humanitarian/angel` | acompanhamento humanit�rio |
| `ADMIN` | `/admin` | modera��o, campanhas, auditoria, exporta��es |

Fluxos transversais: **humanit�rio** (`/humanitarian`, `/sos-venezuela`), **FHIR SMART** (`/api/fhir/smart/*`), **pagamentos** (Stripe), **v�deo** (Daily.co / Google Meet).

### 1.3 Comunica��o frontend ? backend

1. **P�ginas React** (`"use client"`) fazem `fetch("/api/...")` com cookie de sess�o httpOnly (NextAuth JWT).
2. **`middleware.ts`** intercepta rotas de p�gina e API privada; redireciona ou retorna 401/403.
3. **Handlers em `src/app/api/`** usam helpers centralizados:
   - `requireAuth`, `requirePatient`, `requireProfessionalApi`, `requireOrganizationApi` (`src/lib/api-auth.ts`)
   - `resolveChartAccess` / `getRecordWithAccess` (`src/lib/chart-access.ts`) para prontu�rios compartilhados
4. **Banco:** Prisma Client singleton (`src/lib/db.ts`) ? PostgreSQL.
5. **Arquivos cl�nicos:** upload POST `/api/uploads` ? AWS S3; leitura via URLs assinadas em endpoints *scoped* (ex.: `/api/patient/documents?documentId=`).
6. **Jobs ass�ncronos:** QStash (Upstash) + cron HTTP com header `x-cron-secret`.

### 1.4 Diagrama textual � fluxo paciente ? consulta ? m�dico ? prontu�rio

```
[Paciente]
    ?
    ?? Registro/login ??? POST /api/auth/register | NextAuth credentials/OAuth
    ?                         ?
    ?                         ?
    ?                    User + PatientProfile (PHI criptografado)
    ?
    ?? TCLE telemedicina ??? POST /api/consent/telemedicine-tcle
    ?
    ?? Agendar consulta ??? GET /api/public/professionals/[slug]/slots (p�blico)
    ?                    POST /api/appointments (+ Stripe se pago)
    ?
    ?? Entrar na video ??? GET /api/appointments/[id]/video
    ?         ?              (valida: paciente OU provider, status CONFIRMED, janela temporal, TCLE)
    ?         ?
    ?    Daily.co room + token OU handoff Google Meet
    ?
    ?? P�s-consulta ??? notifica��es, lembretes QStash, documentos cl�nicos

[M�dico / Volunt�rio]
    ?
    ?? Login (role PROFESSIONAL+) ??? middleware ? /professional
    ?
    ?? Prontu�rio ??? GET/POST /api/professional/records
    ?                    resolveChartAccess(professionalId, recordId)
    ?                    auditChartView ? AuditLog
    ?
    ?? Durante consulta ??? ensurePatientRecord() cria/vincula PatientRecord
    ?                    evolu��es, prescri��es, odontograma, diagn�sticos CID
    ?
    ?? Emiss�es ??? prescri��es PDF, assinatura Lacuna, entrega WhatsApp/email

[Compartilhamento]
    Paciente ??? POST /api/patient/share ? SharedRecord + accessToken
    Link p�blico ??? GET /api/shared/[token] (sem auth, com expira��o opcional)
    Colega m�dico ??? PatientRecordShare (VIEW/EDIT) via chart-access
```

---

## 2. Seguran�a (prioridade m�xima)

### 2.1 Autentica��o e senhas

| Aspecto | Implementa��o | Avalia��o |
|---------|---------------|-----------|
| Provedor | NextAuth v5 (`src/lib/auth.ts`), n�o Supabase Auth | OK |
| Senhas | `passwordHash` com **bcrypt cost 12** (`register`, `reset-password`, `change-password`) | OK |
| Texto plano | N�o encontrado; campo `passwordHash` nullable para OAuth | OK |
| OAuth | Google (`GOOGLE_CLIENT_ID/SECRET`) | OK |
| Magic link | Provider `magic-link` com token em `VerificationToken` | OK |
| Sess�o | JWT, **maxAge 900s (15 min)** � `SESSION_MAX_AGE_SECONDS` | OK (HIPAA-aligned) |
| Lockout | 5 tentativas ? bloqueio 30 min (`auth.ts` L185�201) | OK |
| Invalida��o | `tokenVersion` incrementado em reset de senha | OK |
| MFA | Campos `mfaEnabled`/`mfaSecret` no schema; **nenhum uso no c�digo** | **M�DIO** � gap |

**Trecho � bcrypt e lockout:**

```190:204:src/lib/auth.ts
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          const updated = await db.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: { increment: 1 } },
            select: { failedLoginAttempts: true },
          });
          if (updated.failedLoginAttempts >= 5) {
            await db.user.update({
              where: { id: user.id },
              data: { lockedUntil: new Date(Date.now() + 30 * 60 * 1000) },
            });
          }
          return null;
        }
```

### 2.2 Row Level Security (RLS)

**N�o aplic�vel.** PostgreSQL � acessado exclusivamente pelo servidor via Prisma com credencial `DATABASE_URL`. N�o h� pol�ticas RLS no reposit�rio.

**Implica��o:** Toda prote��o depende de cada handler de API. Um vazamento de `DATABASE_URL` exp�e todos os dados � *verifica��o manual necess�ria* para restringir IP, usar usu�rio DB com privil�gios m�nimos, e secrets rotation.

### 2.3 Inje��o de SQL / RPC din�micas

- **Nenhuma** ocorr�ncia de `$queryRaw`, `$executeRaw`, `Prisma.sql` ou plv8.
- Queries via Prisma ORM com par�metros tipados.
- Valida��o de entrada predominante com **Zod** nos endpoints cr�ticos.

**Classifica��o:** Risco de SQLi via aplica��o � **BAIXO** (com ressalva de manter disciplina em futuras queries raw).

### 2.4 Exposi��o de chaves/secrets no frontend

Vari�veis `NEXT_PUBLIC_*` encontradas (apenas o esperado para client-side):

| Vari�vel | Uso | Risco |
|----------|-----|-------|
| `NEXT_PUBLIC_APP_URL` | links, redirects | BAIXO |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe.js | BAIXO (by design) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push | BAIXO |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry client | BAIXO |
| `NEXT_PUBLIC_MEETING_ROOM_NISE_URL` | sala Meet fixa | BAIXO |

**N�o encontrado:** `service_role`, `DATABASE_URL`, `AUTH_SECRET`, `ENCRYPTION_KEY`, `STRIPE_SECRET_KEY`, `AWS_SECRET_ACCESS_KEY`, `ANTHROPIC_API_KEY` em c�digo client.

Secrets de servidor permanecem em vari�veis de ambiente server-side � *verifica��o manual necess�ria* para confirmar que `.env` n�o est� commitado e que Vercel/Railway n�o exp�em logs.

### 2.5 Valida��o de input

| Camada | Padr�o observado |
|--------|------------------|
| Cliente | Zod-like rules em formul�rios (ex.: `ResetPasswordForm.tsx`), estados de loading/erro |
| Servidor | Zod schemas na maioria das rotas de auth, patient, professional, humanitarian |
| Uploads | MIME whitelist, 50 MB max (`src/lib/s3.ts`, `src/app/api/uploads/route.ts`) |
| Rate limit | `src/lib/rate-limit.ts` � auth, support, humanitarian intake (via `VerificationToken` como contador) |

**Gaps:**
- Mensagens: valida tamanho (2000 chars) mas n�o rela��o terap�utica (**ALTO** � ver 2.6).
- Nem todas as ~280 rotas usam Zod; algumas usam `req.json()` direto.

### 2.6 Controle de acesso (IDOR / cross-tenant)

**Pontos bem implementados:**

| Recurso | Verifica��o |
|---------|-------------|
| Prontu�rio profissional | `resolveChartAccess` � owner, share direto ou via cl�nica (`chart-access.ts`) |
| Documento paciente | `patientId === me` OR `sharedRecords.sharedWithUserId === me` (`patient/documents/route.ts` L118�131) |
| V�deo consulta | paciente OU provider da appointment (`appointments/[id]/video/route.ts` L76�82) |
| Fila JIT | `patientUserId === session.user.id` ou dono da sess�o (`jit/queue/route.ts` L152�153, L201�218) |
| Fila humanit�ria | `isPatient` / `isVolunteerOnEntry` (`humanitarian/queue/[entryId]/video/route.ts` L56�61) |
| Upload S3 | sem GET gen�rico; coment�rio expl�cito anti-IDOR (`uploads/route.ts` L7�13) |

**Achados negativos:**

| # | Achado | Severidade | Evid�ncia |
|---|--------|------------|-----------|
| S-01 | **Mensagens sem verifica��o de v�nculo cl�nico** � qualquer paciente autenticado pode enviar mensagem criptografada a qualquer profissional (desde que n�o seja outro paciente). N�o exige appointment, link ou consentimento. | **ALTO** | `messages/route.ts` L127�157 � s� verifica `receiver.role !== PATIENT` |
| S-02 | **Links de compartilhamento sem rate limit** � `GET /api/shared/[token]` � p�blico; token `nanoid(32)` � forte, mas sem throttling/brute-force protection. | **M�DIO** | `shared/[token]/route.ts` |
| S-03 | **Compartilhamento sem expira��o permitido** � `expiresInHours: 0` ? `expiresAt: null` (link permanente com PHI). | **ALTO** | `patient/share/route.ts` L19�20, L41�43 |
| S-04 | **Bypass de verifica��o de e-mail no fluxo humanit�rio** � por padr�o, cookie de origem SOS permite login/registro sem e-mail verificado. | **M�DIO** | `humanitarian/feature-flags.ts` L44�49, `auth.ts` L169�182 |
| S-05 | **Audit log falha silenciosamente** � falha de grava��o n�o bloqueia request (coment�rio HIPAA, mas sem alerta automatizado wired). | **M�DIO** | `audit.ts` L35�39 |
| S-06 | **IP em AuditLog n�o criptografado** � schema marca `@encrypted` em `lastLoginIp`/`Consent.ipAddress`, mas `createAuditLog` grava IP em texto claro. | **M�DIO** | `audit.ts` L24�31 vs `schema.prisma` L1410 |
| S-07 | **Admin auth ad hoc** � rotas admin checam `role !== "ADMIN"` inline; sem helper `requireAdmin` centralizado (risco de rota nova esquecer check). | **M�DIO** | ex.: `admin/humanitarian/route.ts` L9 |
| S-08 | **Embed widget: `frame-ancestors *`** � intencional para `/embed/*`, mas amplia superficie XSS se conte�do embedd�vel for comprometido. | **BAIXO** | `middleware.ts` L152�156, `next.config.js` L22�37 |

**Resposta direta:**
- *Paciente v� dados de outro?* **N�o**, nos endpoints analisados com ownership check (documentos, v�deo, filas). Risco residual via mensagens n�o autorizadas (metadata/nome) e links compartilhados vazados.
- *M�dico v� pacientes que n�o s�o dele?* **N�o**, via `resolveChartAccess`, exceto shares expl�citos (colleague/clinic) e role ADMIN.

### 2.7 Headers de seguran�a

`next.config.js`: HSTS, CSP, X-Frame-Options (SAMEORIGIN global), Permissions-Policy para c�mera/mic Daily.co.

**Nota:** CSP inclui `'unsafe-inline'` em scripts (necessidade Next.js); `'unsafe-eval'` apenas em dev.

---

## 3. Integridade do banco de dados

### 3.1 Schema e versionamento

- **100 modelos** Prisma (`schema.prisma`).
- **34 migrations** em `prisma/migrations/` � schema versionado.
- Deploy esperado: `prisma migrate deploy` (README, `package.json` scripts).

### 3.2 Foreign keys, constraints, �ndices

- **~100 rela��es** com `onDelete` expl�cito em muitos modelos (ex.: `ProviderLicenseDocument` ? Cascade).
- �ndices presentes em campos de busca frequente (`User.email`, `SharedRecord.accessToken`, `AuditLog.createdAt`, etc.).
- **`@@unique([userId, type, version])`** em `Consent`.

**Gaps identificados:**

| # | Gap | Risco |
|---|-----|-------|
| D-01 | `SharedRecord.document` sem `onDelete` � documento deletado pode deixar share �rf�o | **M�DIO** |
| D-02 | `DataExportRequest.user` sem `onDelete: Cascade` | **BAIXO** |
| D-03 | Campos JSON (`PatientProfile.notes`, `MedicalDocument.content`) sem schema DB � integridade depende da app | **M�DIO** |
| D-04 | `Message` soft-delete (`deletedAt`) sem pol�tica de purge documentada | **BAIXO** |
| D-05 | Rate limit reutiliza tabela `VerificationToken` com sem�ntica diferente � poss�vel colis�o conceitual | **BAIXO** |

### 3.3 Dados �rf�os e inconsist�ncias

- JIT/humanitarian: l�gica de expira��o no-show (`expireStaleJitNoShows`) mitiga filas presas.
- `patient-chart-link`: vincula charts criados por e-mail no signup � bom para consist�ncia.
- **Anonymization cron** (`cron/account-anonymization/route.ts`) s� anonimiza `User` + profile; **n�o remove** `MedicalDocument`, `Message`, `Appointment`, `HumanitarianIntake` � PHI cl�nico permanece ap�s "exclus�o".

---

## 4. Compliance (LGPD / GDPR / HIPAA)

### 4.1 Onde PHI trafega e repousa

| Dado | Repouso | Tr�nsito |
|------|---------|----------|
| Identifica��o paciente | PostgreSQL, campos AES-256-GCM (`encryption.ts`) | HTTPS (HSTS) |
| Prontu�rio/documentos | PostgreSQL + S3 privado | API JSON + signed URLs |
| Mensagens | PostgreSQL criptografado (`Message.content`) | Polling 5s |
| V�deo | Daily.co / Google Meet (terceiros) | WebRTC/TLS |
| E-mail/SMS/WhatsApp | Resend, AWS SNS, Twilio, Meta | TLS |
| IA cl�nica | Anthropic API (`ai-consult-notes`, `ai-summarize`, support) | TLS � *DPA necess�rio* |

### 4.2 Mecanismos de compliance presentes

| Requisito | Status |
|-----------|--------|
| Consentimento expl�cito (Terms, Privacy, HIPAA/GDPR por regi�o) | ? Registro (`auth/register/route.ts`) |
| TCLE telemedicina | ? `Consent` + `telemedicine-tcle.ts`; exigido antes de v�deo |
| Audit trail | ? `AuditLog` + wrappers `audit.*` � cobertura **parcial** (nem todo READ de PHI) |
| Direito de acesso/portabilidade | ? `GET /api/user/data` � export JSON |
| Direito ao esquecimento | ?? **Parcial** � soft delete 30 dias + anonymization incompleta |
| Criptografia em repouso (app-layer) | ? AES-256-GCM para PHI fields listados em `PHI_FIELDS` |
| Criptografia em repouso (DB/S3) | *Verifica��o manual necess�ria* (RDS encryption, S3 SSE) |
| Criptografia em tr�nsito | ? HTTPS + headers |
| DPO | ? `DPO_EMAIL` em `.env.example` |
| Resid�ncia de dados | ?? `APP_REGION` US/EU; BR/VE mapeados para **S3 us-east-1** (`data-residency.ts` L14�22) |
| MFA | ? Schema preparado, n�o implementado |
| SMART on FHIR | ? OAuth PKCE para apps terceiros (`/api/fhir/smart/*`) |

### 4.3 Gaps internacionais

| Gap | Impacto |
|-----|---------|
| BR/VE ? bucket US | Transfer�ncia internacional de sa�de (LGPD Art. 33) � requer base legal/DPA |
| `s3.ts` usa bucket/regi�o �nicos (`AWS_REGION`, `AWS_S3_BUCKET`) � **n�o implementa** multi-bucket US/EU do `.env.example` | **ALTO** para opera��o multi-regi�o |
| Humanitarian: verifica��o e-mail/telefone desligadas por default | Risco identidade falsa em campanha internacional |
| Grava��o cloud Daily (`DAILY_CLOUD_RECORDING=1`) | Consentimento adicional + reten��o � opt-in via env |
| Anonymization n�o apaga hist�rico cl�nico | Viola expectativa LGPD Art. 16/18 |

---

## 5. Experi�ncia do usu�rio

### 5.1 Fluxos e feedback

**Pontos positivos:**
- Humanitarian: stepper, triage, banners de estado, mensagens i18n detalhadas (`translations.ts` keys `hum.*`).
- Login: estados loading, erros tipados (unverified, locked, oauthFailed).
- Video: erros expl�citos (`TOO_EARLY`, `TCLE_REQUIRED`, `VIDEO_UNAVAILABLE`).

**Problemas:**
- **Mensagens:** polling fixo 5s (`messages/route.ts` L3) � alto consumo em mobile/3G; sem WebSocket/SSE.
- **M�ltiplos portais** (professional, psychologist, psychoanalyst, integrative) � curva de aprendizado alta.
- **Organization module** (HR, ledger, TISS) � p�ginas novas no git status; cobertura i18n provavelmente incompleta nessas telas.
- Feedback de erro inconsistente entre m�dulos (alguns retornam `{ error }`, outros `{ errorCode }`).

### 5.2 Internacionaliza��o (PT / ES / EN)

- Dicion�rio central **`src/lib/i18n/translations.ts`** (~13.000+ linhas) com `Lang = "pt" | "en" | "es"`.
- Humanitarian prioriza ES (Venezuela); switcher dedicado (`HumanitarianLangSwitcher`).
- Script `npm run check:i18n` declarado � *verifica��o manual necess�ria* para % de cobertura por m�dulo.
- Legal pages (`hipaa/page.tsx`) trilingues inline.

**Faltando:** tradu��o sistem�tica de emails transacionais, PDFs cl�nicos, m�dulo organization/admin completo.

### 5.3 Mobile e conectividade fraca

- Tailwind responsive em componentes principais.
- **Humanitarian offline draft** (`lib/humanitarian/offline-draft.ts`, hook `useHumanitarianDraft`) � bom para reconex�o.
- Polling agressivo (mensagens, filas humanit�rias) penaliza redes inst�veis.
- Upload at� 50 MB pode falhar silenciosamente em 3G sem retry UX claro.

### 5.4 Performance

- Cat�logos de medicamentos embutidos em JS (`scripts/drug-catalog-*.js`) � bundle pesado se importados no client.
- Prisma sem connection pool config documentada no c�digo (`.env.example` sugere `connection_limit`).
- Listagens admin carregam contexto completo (`loadPatientMonitoringData`) � pode n�o escalar.

---

## 6. Confiabilidade e escalabilidade

### 6.1 Tratamento de falhas

| Cen�rio | Comportamento |
|---------|---------------|
| Supabase/DB down | Prisma throw ? 500 gen�rico; sem circuit breaker |
| Daily.co indispon�vel | 503 `VIDEO_UNAVAILABLE` com log (`appointments/[id]/video/route.ts` L148�154) |
| Audit falha | Request continua; erro s� em console |
| QStash/cron | Assinatura verificada (`verifyQStashSignature`); fallback cron heal reminders |
| Sess�o expira mid-consulta | `session/consult-keepalive` estende sess�o (config `SESSION_CONSULT_MAX_AGE_SECONDS`) |

### 6.2 Pontos que n�o escalam para milhares simult�neos

1. **Polling de mensagens** � O(n usu�rios � requests/5s).
2. **Rate limit via PostgreSQL** � write por request em endpoints p�blicos.
3. **Prisma singleton** sem read replicas � gargalo DB �nico.
4. **Cron reminders** processa 200 appointments por run sequencialmente.
5. **Humanitarian dispatcher** � *verifica��o manual necess�ria* de locks/transactions sob carga.
6. **Next.js serverless (se Vercel)** � cold starts + limite de conex�es DB.

---

## 7. Qualidade de c�digo

### 7.1 Duplica��o e complexidade

- M�ltiplos portais quasi-duplicados (psychologist ? professional, psychoanalyst, integrative) � l�gica similar espalhada.
- `safeDecrypt` reimplementado em ~20 arquivos (deveria ser import �nico).
- Scripts `migrate-professional-api-auth.mjs`, `fix-professional-api-auth.mjs` indicam refatora��o de auth em andamento.
- Nomenclatura mista PT/EN em RPCs internos e rotas (`financeiro`, `convenios`, `ledger`).

### 7.2 Testes automatizados

| Tipo | Quantidade | Cobertura |
|------|------------|-----------|
| Unit�rios | **0** arquivos `.test.ts` | Nenhuma |
| E2E Playwright | **10** specs (`e2e/*.spec.ts`) | auth, humanitarian, volunteer, payments, smoke |
| i18n/support checks | scripts Node | parcial |

**Gap cr�tico:** zero testes unit�rios para `encryption.ts`, `chart-access.ts`, `resolveChartAccess`, consent, anonymization.

### 7.3 Observabilidade

- Sentry opcional (`SENTRY_DSN`).
- Logs `[AUDIT LOG FAILURE]`, `[video] Daily room error` � sem estrutura uniforme.
- Admin `/admin/integrations` reporta status de integra��es.

---

## 8. Plano de a��o priorizado

### FASE 0 � Bloqueadores cr�ticos de seguran�a (antes de divulga��o p�blica)

| # | A��o | Esfor�o | Risco se n�o corrigir | Depend�ncias |
|---|------|---------|----------------------|--------------|
| 0.1 | **Exigir v�nculo cl�nico para mensagens** (appointment, PatientProfessionalLink ACCEPTED, ou share) | M | Vazamento de comunica��o / spam PHI | Nenhuma |
| 0.2 | **Proibir links de share permanentes** (`expiresInHours` min ? 24h; default 72h) + audit de acesso | P | Links PHI eternos circulando | Nenhuma |
| 0.3 | **Completar pipeline de exclus�o LGPD** � deletar/anonymizar MedicalDocument, Message, Appointment, HumanitarianIntake, S3 objects | G | Multa LGPD/GDPR; dados "fantasma" | Cron job existente |
| 0.4 | **Implementar multi-bucket S3** conforme `.env.example` OU documentar/legalizar transfer�ncia US para BR/VE | M | Transfer�ncia internacional ilegal | Infra AWS |
| 0.5 | **Centralizar `requireAdmin()`** e auditar todas rotas `/api/admin/*` | P | Escalada de privil�gio por rota esquecida | Nenhuma |
| 0.6 | **Rate limit em `/api/shared/[token]`** | P | Brute force / scraping | Nenhuma |
| 0.7 | *Verifica��o manual:* rotacionar secrets, confirmar DB n�o p�blico, WAF/CDN | P | Comprometimento total | Infra |

### FASE 1 � Integridade e compliance

| # | A��o | Esfor�o | Risco | Depend�ncias |
|---|------|---------|-------|--------------|
| 1.1 | Criptografar IP em AuditLog/Consent ou remover anota��o `@encrypted` falsa | P | Inconsist�ncia compliance | 0.x |
| 1.2 | Alerting quando audit log falha (Sentry/PagerDuty) | P | HIPAA gap | Sentry |
| 1.3 | Implementar MFA (TOTP) para PROFESSIONAL, ADMIN, ORGANIZATION | M | Account takeover | Auth |
| 1.4 | Cobertura audit **100% reads PHI** � middleware Prisma extension ou wrapper | G | HIPAA incomplete trail | � |
| 1.5 | FK `onDelete` em SharedRecord ? Cascade/SetNull | P | Orphans | Migration |
| 1.6 | Revisar bypass humanit�rio e-mail � exigir SMS ou magic link | M | Contas fake SOS | Product |
| 1.7 | DPA/registro tratamento LGPD + DPIA documentado | M | Operar BR legalmente | Jur�dico |

### FASE 2 � UX e internacionaliza��o

| # | A��o | Esfor�o | Risco | Depend�ncias |
|---|------|---------|-------|--------------|
| 2.1 | Substituir polling mensagens por SSE/Web Push | G | UX mobile ruim | � |
| 2.2 | Completar i18n organization/admin + emails | M | Barreira ES/EN | check:i18n |
| 2.3 | Retry/offline UX para uploads e filas | M | Perda dados 3G | � |
| 2.4 | Unificar error codes API (`errorCode` everywhere) | M | Debug dif�cil | � |
| 2.5 | WCAG audit (contraste, labels, keyboard) | M | Acessibilidade | � |

### FASE 3 � Escala e refinamento

| # | A��o | Esfor�o | Risco | Depend�ncias |
|---|------|---------|-------|--------------|
| 3.1 | Rate limit em Redis/Upstash (n�o PostgreSQL) | M | DB overload | Infra |
| 3.2 | Read replica + connection pooling (PgBouncer) | M | Lat�ncia DB | Infra |
| 3.3 | Testes unit�rios encryption, chart-access, consent | M | Regress�es | � |
| 3.4 | Expandir E2E para IDOR scenarios | M | Security regressions | � |
| 3.5 | Consolidar portais provider (shared layout/hooks) | G | Manuten��o | � |
| 3.6 | Extrair `safeDecrypt` para util �nico | P | Duplica��o | � |

**Legenda esfor�o:** P = pequeno (1�3 dias), M = m�dio (1�2 semanas), G = grande (3+ semanas)

---

## Resumo executivo

Doctor8 � uma plataforma **madura em inten��o de compliance** (criptografia PHI, audit, consent, TCLE, soft delete, headers de seguran�a, controle de acesso em prontu�rios e v�deo), implementada como **monolito Next.js + Prisma + PostgreSQL**, n�o Supabase.

**Principais riscos antes de escala p�blica:**
1. Exclus�o de conta incompleta (PHI cl�nico permanece).
2. Mensagens sem v�nculo terap�utico.
3. Links de compartilhamento potencialmente permanentes.
4. Resid�ncia de dados BR/VE ? US n�o refletida na implementa��o S3 real.
5. Aus�ncia total de testes unit�rios e MFA.

**Pontos fortes:** bcrypt, lockout, sess�o curta, chart-access robusto, anti-IDOR em uploads, valida��o Zod extensiva, migrations versionadas, i18n trilingue extenso no m�dulo humanit�rio.

---

*Relat�rio gerado por an�lise est�tica do reposit�rio. Nenhum arquivo de c�digo foi alterado.*
