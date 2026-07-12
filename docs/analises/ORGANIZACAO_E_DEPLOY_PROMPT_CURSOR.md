# Prompt Cursor — Reparo do git, organização do repo e deploy mais rápido

**Data:** 12/07/2026 · Gerado no Cowork (somente análise; execução no Cursor)

Cole o bloco abaixo no Cursor:

```
Projeto Doctor8 (Next.js + Prisma + Capacitor), desenvolvido no Windows, deploy no Railway.
Objetivo: reparar o git, commitar o trabalho pendente, organizar o repositório e acelerar o build/deploy.
NÃO altere lógica de negócio. Execute em etapas, com um commit separado por etapa, e me mostre um resumo do diff antes de cada commit.

ETAPA 0 — Reparar o git (bloqueador de tudo)
- `git log`/`git status` retornam "error: improper chunk offset(s) 5c934 and 817bc" (corrupção de pack ou commit-graph local).
- Tente na ordem, do menos ao mais invasivo:
  1. Apagar `.git/objects/info/commit-graph` e rodar `git commit-graph write --reachable`.
  2. `git fsck --full` para localizar objetos ruins; `git repack -a -d -f`.
  3. Último recurso: re-clonar de https://github.com/9bitts/doctor8-site.git e transplantar o working tree atual por cima (preservando TODAS as alterações não commitadas).
- Só prossiga quando `git log` e `git status` rodarem sem erro.

ETAPA 1 — Revisar e commitar as mudanças reais pendentes
- `git diff --ignore-cr-at-eol --stat` mostra ~160 arquivos com mudanças reais (o resto do status é ruído de fim de linha; ignore por enquanto).
- Pontos de atenção obrigatórios:
  a) `prisma/schema.prisma` tem ~96 linhas alteradas. Verifique se existe migration correspondente em `prisma/migrations`. Se não existir, gere com `npx prisma migrate dev --create-only`, revise o SQL e inclua no commit. Schema alterado sem migration = drift entre banco e código.
  b) `package.json` tem ~60 linhas alteradas — confirme que `package-lock.json` está consistente (`npm install` sem diff extra).
  c) Vários `.tsx` aparecem como "Bin" no diff (ex.: `src/app/(dashboard)/professional/jit/page.tsx`, páginas do psychoanalyst) — provavelmente foram salvos como UTF-16/BOM pelo PowerShell. Converta todos para UTF-8 sem BOM antes de commitar.
- Agrupe em commits lógicos por área (schema, portais, testes, config) e commite.

ETAPA 2 — Matar o ruído de CRLF de uma vez por todas
- Criar `.gitattributes` na raiz:
    * text=auto
    *.png binary
    *.jpg binary
    *.ico binary
    *.woff binary
    *.woff2 binary
    *.xlsx binary
    *.pdf binary
    *.jks binary
    *.keystore binary
- Rodar `git add --renormalize .` e commitar sozinho: "chore: normalize line endings".
- Resultado esperado: `git status` limpo em qualquer sistema operacional. Hoje o falso diff de 1.250 arquivos torna qualquer revisão lenta.

ETAPA 3 — Organizar a raiz do repositório
- Criar `docs/analises/` e mover para lá com `git mv` todos os documentos de análise da raiz:
  ANALISE_*.md, AUDITORIA_*.md, DIAGNOSTICO_*.md, PRO-1A_RELATORIO.md, PRO-1B_RELATORIO.md,
  PRO-2_RELATORIO.md, PROMPT_CURSOR_*.md, UX_ANALISE_E_PROMPTS_DOCTOR8.md,
  ORGANIZACAO_E_DEPLOY_PROMPT_CURSOR.md.
  Manter na raiz apenas README.md, DEPLOY.md e CLAUDE.md.
- Deletar resíduos (todos já ignorados ou obsoletos): e2e-run.log, test-e2e-full.log,
  test-e2e-full2.log, test-e2e-full3.log, test-e2e-latest.log, tsc.log, prisma-generate.log,
  prisma-migrate.log, git-out.txt, tsconfig.tsbuildinfo, test-results/,
  src/app/globals-backup.css.
- `.railway-rebuild`: se não for mais usado como trigger manual de rebuild no Railway, deletar.
- Apagar branches já mergeadas em main, local e no origin:
  feat/angel-patient-dashboard, feat/angel-patient-journey, feat/treinamento-doctor8-room.

ETAPA 4 — Acelerar o build e o deploy no Railway
- Criar `.dockerignore` na raiz para reduzir o contexto de build (o android/ sozinho tem 66 MB
  e não participa do deploy web):
    .git
    node_modules
    .next/cache
    android
    e2e
    test-results
    docs
    data/cmed
    data/cum-co
    *.log
    coverage
- `next.config.js`: avaliar `output: "standalone"` para reduzir a imagem e o tempo de boot.
  ATENÇÃO: `scripts/railway-start.mjs` hoje roda `next start`; standalone exige
  `node .next/standalone/server.js`. Só aplique se ajustar o start script junto e testar
  `npm run build && npm start` localmente. Se houver qualquer incompatibilidade (ex.: com
  Sentry ou middleware), documente e mantenha como está.
- Criar `railway.json` com watchPatterns para não disparar rebuild quando só mudarem
  docs/ ou android/ (ou configurar no painel do Railway, documentando no DEPLOY.md).

ETAPA 5 — Verificação final
- `npx tsc --noEmit` limpo, `npm run lint`, `npm run build` local com sucesso.
- `git status` limpo, `git push origin main`.
- Resumo final: o que foi feito em cada etapa e o que ficou pendente de decisão minha.
```
