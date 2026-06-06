# Doctor8 — Guia de Deploy Completo
# Do zero ao ar em menos de 1 hora

---

## O QUE VOCÊ VAI PRECISAR
- Conta no GitHub (github.com) — gratuito
- Conta no Railway (railway.app) — gratuito para começar
- Conta no Stripe (stripe.com) — gratuito, cobra % por transação
- Conta no Resend (resend.com) — gratuito até 3.000 e-mails/mês
- Conta no Daily.co (daily.co) — gratuito até 10.000 min/mês

---

## PARTE 1 — SUBIR O CÓDIGO NO GITHUB

### Passo 1 — Criar o repositório
1. Acesse https://github.com/new
2. Nome: `doctor8`
3. Visibilidade: **Private** (OBRIGATÓRIO — dados de saúde)
4. Não marque nenhuma opção extra
5. Clique em "Create repository"

### Passo 2 — Instalar o Git no seu computador
- Windows: https://git-scm.com/download/win
- Mac: abra o Terminal e digite `git --version` (instala automaticamente)

### Passo 3 — Enviar os arquivos
Abra o Terminal (Mac) ou Git Bash (Windows) dentro da pasta `doctor8`:

```bash
git init
git add .
git commit -m "Initial commit — Doctor8 v1.0"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/doctor8.git
git push -u origin main
```

Substitua SEU_USUARIO pelo seu usuário do GitHub.

---

## PARTE 2 — CRIAR O BANCO DE DADOS NO RAILWAY

### Passo 1 — Criar conta no Railway
1. Acesse https://railway.app
2. Clique "Login with GitHub"
3. Autorize o acesso

### Passo 2 — Criar projeto
1. Clique "New Project"
2. Escolha "Provision PostgreSQL"
3. Aguarde o banco ser criado (30 segundos)
4. Clique no banco criado → aba "Connect"
5. Copie o valor de `DATABASE_URL` (começa com `postgresql://`)

---

## PARTE 3 — CONFIGURAR OS SERVIÇOS EXTERNOS

### Stripe (pagamentos)
1. Acesse https://stripe.com e crie uma conta
2. No dashboard, vá em "Developers" → "API Keys"
3. Copie:
   - `Publishable key` → NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
   - `Secret key` → STRIPE_SECRET_KEY
4. Crie os produtos:
   - "Products" → "Add product"
   - Nome: "Club Doctor — Monthly"
   - Preço: $9.90/mês (USD) e €9.90/mês (EUR)
   - Copie os "Price IDs" → STRIPE_PRICE_CLUB_DOCTOR_US e STRIPE_PRICE_CLUB_DOCTOR_EU
5. Webhooks:
   - "Developers" → "Webhooks" → "Add endpoint"
   - URL: `https://SEU-APP.railway.app/api/payments/webhook`
   - Eventos: `payment_intent.succeeded`, `customer.subscription.*`
   - Copie o "Signing secret" → STRIPE_WEBHOOK_SECRET

### Resend (e-mails)
1. Acesse https://resend.com e crie uma conta
2. "API Keys" → "Create API Key"
3. Copie a chave → RESEND_API_KEY
4. Adicione seu domínio em "Domains" (ou use onboarding@resend.dev para testes)

### Daily.co (vídeo)
1. Acesse https://dashboard.daily.co e crie uma conta
2. "Developers" → "API Keys"
3. Copie a chave → DAILY_API_KEY

---

## PARTE 4 — FAZER O DEPLOY NO RAILWAY

### Passo 1 — Criar o serviço da aplicação
1. No Railway, dentro do seu projeto, clique "+ New"
2. "GitHub Repo" → selecione o repositório `doctor8`
3. Railway detecta Next.js automaticamente

### Passo 2 — Configurar as variáveis de ambiente
Na aba "Variables" do seu serviço, adicione CADA UMA das variáveis abaixo:

```
# App
NEXT_PUBLIC_APP_URL=https://SEU-APP.railway.app
APP_REGION=US

# Database (cole o valor copiado do Railway PostgreSQL)
DATABASE_URL=postgresql://...

# Auth (gere com: openssl rand -base64 32)
AUTH_SECRET=cole_aqui_uma_chave_aleatoria_longa

# Encryption (gere com: openssl rand -hex 32)
ENCRYPTION_KEY=cole_aqui_32_bytes_em_hex

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_PRICE_CLUB_DOCTOR_US=price_...
STRIPE_PRICE_CLUB_DOCTOR_EU=price_...

# Resend
RESEND_API_KEY=re_...
EMAIL_FROM=Doctor8 <noreply@doctor8.app>

# Daily.co
DAILY_API_KEY=...

# Session (15 min = HIPAA)
SESSION_MAX_AGE_SECONDS=900
```

### Como gerar AUTH_SECRET e ENCRYPTION_KEY:
- **Mac/Linux:** abra o Terminal e rode:
  ```bash
  openssl rand -base64 32   # para AUTH_SECRET
  openssl rand -hex 32      # para ENCRYPTION_KEY
  ```
- **Windows:** use https://generate-secret.vercel.app/32

### Passo 3 — Configurar o comando de start
Na aba "Settings" do serviço Railway, em "Start Command", cole:
```
npx prisma migrate deploy && npm start
```

Isso garante que o banco de dados seja criado antes do servidor iniciar.

### Passo 4 — Deploy
Railway faz o deploy automaticamente quando você salva as variáveis ou faz um `git push`.
Aguarde 2-3 minutos. Você verá os logs em tempo real.

### Passo 5 — Verificar
1. Acesse a URL gerada pelo Railway (ex: `https://doctor8-production.up.railway.app`)
2. Você deve ver a tela de login do Doctor8
3. Crie uma conta → faça o onboarding → sistema funcionando!

---

## PARTE 5 — CONECTAR SEU DOMÍNIO (doctor8.app)

### No Railway:
1. Aba "Settings" → "Domains"
2. Clique "Add Custom Domain"
3. Digite: `doctor8.app`
4. Railway vai te dar um registro CNAME para adicionar no seu DNS

### No seu registrador de domínio (GoDaddy, Namecheap, etc):
1. Acesse o painel de DNS do domínio
2. Adicione o registro CNAME fornecido pelo Railway
3. Aguarde 24h para propagar

---

## PARTE 6 — DEPLOY DA VERSÃO EUROPEIA (GDPR)

Para cumprir o GDPR, os dados de usuários europeus devem ficar em servidores na Europa.

### Criar um segundo projeto Railway (região Europa):
1. Repita todo o processo acima
2. Ao criar o PostgreSQL, escolha a região `europe-west4`
3. Configure `APP_REGION=EU` nas variáveis
4. Conecte ao domínio `eu.doctor8.app`

Usuários europeus acessam `eu.doctor8.app` e ficam em servidores europeus.
Usuários americanos acessam `us.doctor8.app` (ou `doctor8.app`).

---

## PARTE 7 — CHECKLIST FINAL ANTES DE LANÇAR

### Segurança
- [ ] AUTH_SECRET e ENCRYPTION_KEY são aleatórios e únicos
- [ ] Repositório GitHub está como Private
- [ ] Stripe está em modo Live (não Test)
- [ ] Webhook do Stripe está configurado com a URL correta

### Conformidade
- [ ] Política de Privacidade publicada em /privacy
- [ ] Termos de Uso publicados em /terms
- [ ] Autorização HIPAA publicada em /hipaa (para usuários US)
- [ ] E-mail do DPO configurado para usuários EU

### Funcional
- [ ] Cadastro funciona (patient e professional)
- [ ] E-mail de verificação chega
- [ ] Login funciona e expira em 15 min
- [ ] Agendamento completo com pagamento
- [ ] PDF de histórico gera corretamente
- [ ] Videochamada abre no horário certo

### Operacional
- [ ] UptimeRobot configurado para monitorar a URL
- [ ] Sentry configurado para capturar erros
- [ ] Backup automático do banco ativado no Railway

---

## SOLUÇÃO DE PROBLEMAS COMUNS

**Erro: "DATABASE_URL is not set"**
→ Verifique se a variável está corretamente definida no Railway

**Erro: "Prisma migration failed"**
→ Confirme que o PostgreSQL está rodando e a DATABASE_URL está correta

**Tela em branco após login**
→ Verifique AUTH_SECRET nas variáveis

**E-mails não chegam**
→ Confirme RESEND_API_KEY e que o domínio foi verificado no Resend

**Pagamento não funciona**
→ Verifique se STRIPE_WEBHOOK_SECRET bate com o valor no dashboard do Stripe

**Vídeo não abre**
→ Confirme DAILY_API_KEY e que a URL do webhook está apontando para o domínio correto

---

## SUPORTE

Documentação Next.js: https://nextjs.org/docs
Documentação Railway: https://docs.railway.app
Documentação Stripe: https://stripe.com/docs
Documentação Daily.co: https://docs.daily.co
Documentação Prisma: https://www.prisma.io/docs
