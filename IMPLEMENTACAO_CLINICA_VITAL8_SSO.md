# Implementação — Login/Cadastro Clínica + SSO Vital8

Data: 2026-07-12

## Vital8 (`C:\Users\diego\Documents\vital8`)

### Feito
1. **Tenant hopping** — `applyValidatedSessionUpdate()` + uso no callback `jwt` de `auth.ts`; bloco inseguro removido de `auth.config.ts`.
2. **Rate-limit login** — `checkLoginRateLimit` dentro do `authorize()` credentials (e-mail + IP via `headers()`).
3. **signupAction** — rate-limit, anti-enumeração de e-mail, validação CNPJ (`src/lib/cnpj.ts`), unicidade transacional de documento + migração parcial.
4. **Auto-provisioning SSO** — `provisionClinicFromDoctor8()` no callback `signIn`; comentário corrigido em `doctor8-login-ctas.tsx`.
5. **Testes** — `jwt-session-update.test.ts`, `cnpj.test.ts`, `e2e/auth.spec.ts`.
6. **DECISOES.md** — verificação de e-mail adiada; auto-provisioning documentado.

### Commits sugeridos (vital8)
```
fix(auth): revalidate membership on session update
fix(auth): enforce login rate-limit in credentials authorize
fix(auth): harden signup (rate-limit, anti-enum, CNPJ, unique doc)
feat(auth): auto-provision clinic from doctor8 SSO
test(auth): unit and e2e login/SSO coverage
```

### Verificar no workspace vital8
```bash
npm test
npx tsc --noEmit
npx prisma migrate dev
npm run test:e2e -- e2e/auth.spec.ts
```

---

## Doctor8 (`C:\Users\diego\Documents\doctor8`)

### Feito
7. **Multi-org SSO** — `sso-orgs.ts`, `organizationId` em authorization code, página `/sso/select-org`, claims por org escolhida.
8. **account_type hint** — authorize redireciona CLINIC→`/login?portal=organization`, EMPLOYER/PHARMACY/LABORATORY para logins corretos.
9. **verified clínica** — mantido `true` com comentário explicativo (sem campo status em Organization).
10. **register-organization** — `createRegisterConsents` com LGPD; comentário sobre 409 CNPJ.
11. **Testes** — `sso-jwt.test.ts`, `sso-orgs.test.ts`, `e2e/sso-oauth.spec.ts`.

### Commits sugeridos (doctor8)
```
feat(sso): organization picker for multi-org B2B users
feat(sso): accept account_type portal hint on authorize
fix(auth): record LGPD consent on organization registration
test(sso): jwt org claim and OIDC authorize e2e
```

### Verificar no workspace doctor8
```bash
npm run typecheck
npm run test:unit
npm run test:e2e -- e2e/sso-oauth.spec.ts
```

---

## Round-trip esperado
1. Clínica cadastra no doctor8 (`/register/organization`) → verifica e-mail → login.
2. No vital8, “Entrar com Doctor8” (CLINIC) → login doctor8 com `portal=organization`.
3. Primeiro SSO → auto-provision User+Org+Membership no vital8 (mesmo CNPJ).
4. Usuário com 2+ clínicas no doctor8 → tela `/sso/select-org` → claims da org escolhida.
