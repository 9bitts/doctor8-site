# Análise — Deploy no Railway + Prompt para o Cursor

**Data:** 12/07/2026 · **Modo:** somente leitura (Cowork não executa nem altera código; execução é no Cursor)

---

## Parte 1 — Estado atual do projeto

O projeto já está bem preparado para Railway:

| Item | Estado |
|---|---|
| `DEPLOY.md` | Guia completo já existe na raiz (GitHub → Railway → Postgres → env vars → domínio → checklist) |
| `package.json` → `start` | `node scripts/railway-start.mjs` — roda `prisma migrate deploy` com recuperação automática de migrations falhas, depois `next start` |
| `package.json` → `build` | `prisma generate && next build` |
| `postinstall` | `prisma generate` (garante client atualizado no build do Railway) |
| Health check | `src/app/api/health` existe (usado pelo checklist de monitoramento) |
| `.env.example` | Lista completa de variáveis necessárias, com comentários |
| Remote git | `origin` já aponta para `https://github.com/9bitts/doctor8-site.git` |

## Parte 2 — Bloqueadores encontrados

1. **Repositório git local corrompido.** `git status` e `git log` retornam `error: improper chunk offset(s) 5c934 and 817bc`. Isso indica um objeto/pack corrompido no `.git` local. Precisa ser diagnosticado (`git fsck`) e corrigido antes de qualquer `push` — senão o push pode falhar ou subir um estado inconsistente.
2. **Dezenas de arquivos modificados e não commitados** (`.env.example`, `DEPLOY.md`, workflows do GitHub Actions, dados de seed, scripts, etc.). Antes do deploy é preciso decidir o que entra no commit e revisar o diff — não deve ser um commit "às cegas" dado o volume.
3. **`.railway-rebuild`** — arquivo de 6 bytes na raiz, provavelmente usado como gatilho manual de rebuild no Railway (trigger vazio). Confirmar se ainda é necessário ou se é resíduo.

## Parte 3 — Passo a passo (resumo do seu próprio `DEPLOY.md`)

1. Resolver a corrupção do git e revisar/commitar as mudanças pendentes.
2. `git push` para `origin main`.
3. No Railway: criar projeto → "Provision PostgreSQL" → copiar `DATABASE_URL`.
4. Criar o serviço da aplicação a partir do repo GitHub (Railway detecta Next.js automaticamente).
5. Colar todas as env vars (lista completa na seção "PARTE 4" do `DEPLOY.md`): `DATABASE_URL`, `AUTH_SECRET`, `ENCRYPTION_KEY`, chaves Stripe, Resend, Daily.co, `NEXT_PUBLIC_APP_URL`, `APP_REGION`, `SESSION_MAX_AGE_SECONDS`.
6. Deploy automático ao salvar variáveis / fazer push. `npm start` já cuida das migrations.
7. Verificar `GET /api/health`, testar cadastro/login, configurar domínio custom (PARTE 5) e revisar o checklist final (PARTE 7) antes de ir ao ar.

---

## Prompt para o Cursor

Cole o texto abaixo no Cursor para resolver os bloqueadores e preparar o push:

```
Preciso preparar este projeto (Doctor8) para deploy no Railway. Antes de qualquer coisa:

1. Diagnostique a saúde do repositório git local: rode `git fsck --full` e `git status`.
   O comando `git log` está retornando o erro "improper chunk offset(s) 5c934 and 817bc",
   o que indica corrupção em algum objeto/pack do .git. Identifique a causa raiz e proponha
   a correção mais segura (ex.: re-clonar a partir do remote https://github.com/9bitts/doctor8-site.git
   preservando as alterações locais não commitadas, ou reparar o pack corrompido).
   NÃO force push nem descarte histórico sem confirmar comigo antes.

2. Depois do repositório saudável, rode `git status` novamente e me mostre um resumo
   categorizado das mudanças pendentes (docs, scripts, config, código de app, dados de seed).
   Não commite nada ainda — só liste e agrupe.

3. Verifique se `.env.example` está sincronizado com todas as env vars realmente lidas pelo
   código (grep por `process.env.` no projeto) e aponte divergências.

4. Confirme se `scripts/railway-start.mjs` e o `package.json` (`build`, `postinstall`, `start`)
   estão corretos para o ambiente do Railway (Node 20.x, Prisma, Next 14) e se falta algum
   arquivo de config do Railway (ex.: `railway.json` ou `railway.toml`) que valha a pena
   adicionar para fixar builder/start command explicitamente.

5. Depois de eu revisar e aprovar, prepare o commit e o push para `origin main`.

Não altere lógica de negócio nem funcionalidades — o escopo aqui é exclusivamente preparar
o repositório e a configuração de build/deploy para o Railway.
```

---

## Referências

- Guia completo já existente: `DEPLOY.md`
- Variáveis de ambiente: `.env.example`
