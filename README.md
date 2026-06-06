# Doctor8 — Setup Instructions

## What was built in this session (Etapa 1)

- ✅ Complete database schema (HIPAA & GDPR compliant)
- ✅ Encryption for all PHI fields (AES-256-GCM)
- ✅ Audit logging for every access to patient data (HIPAA)
- ✅ Authentication with session timeout (15 min — HIPAA)
- ✅ Account lockout after 5 failed attempts (HIPAA)
- ✅ Login page with show/hide password
- ✅ Registration with role selection (Patient / Professional)
- ✅ Region selection (US / EU / BR) with data residency
- ✅ HIPAA authorization consent (US users)
- ✅ GDPR consent (EU users)
- ✅ Password strength rules enforced
- ✅ Route protection middleware
- ✅ Security headers (CSP, HSTS, etc.)

---

## How to set this up (step by step — no coding required)

### Step 1 — Install Node.js
Go to https://nodejs.org and download the LTS version. Install it.

### Step 2 — Create a GitHub account
Go to https://github.com and create a free account if you don't have one.

### Step 3 — Upload this project to GitHub
1. Go to https://github.com/new
2. Name the repository: `doctor8`
3. Set it to **Private** (important — this is health data)
4. Click "Create repository"
5. Upload all these files

### Step 4 — Create a Railway account
1. Go to https://railway.app
2. Sign up with your GitHub account
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your `doctor8` repository

### Step 5 — Add PostgreSQL database
1. In your Railway project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Railway creates the database and gives you a DATABASE_URL
4. Copy the DATABASE_URL

### Step 6 — Set environment variables
In Railway, go to your app → "Variables" tab.
Add all the variables from `.env.example`:

Required to start:
- `DATABASE_URL` — from Railway PostgreSQL
- `AUTH_SECRET` — run `openssl rand -base64 32` and paste result
- `ENCRYPTION_KEY` — run `openssl rand -hex 32` and paste result
- `NEXT_PUBLIC_APP_URL` — your Railway app URL

### Step 7 — Run database migration
In Railway, go to your app → "Settings" → add this as start command:
```
npx prisma migrate deploy && npm start
```

### Step 8 — Deploy
Railway deploys automatically when you push to GitHub.
Your app will be live at `https://your-app.railway.app`

---

## Regions setup (US + EU)

For full data residency compliance:
1. Create TWO Railway projects: one in US region, one in EU region
2. Each has its own PostgreSQL database
3. US users log in at `us.doctor8.app` → US Railway instance
4. EU users log in at `eu.doctor8.app` → EU Railway instance
5. Set `APP_REGION=US` on the US instance and `APP_REGION=EU` on the EU instance

---

## What comes next (Etapa 2)

- Patient dashboard
- Medical history form
- Medication management (clinical vs purchase — the bug fix)
- PDF export of history and medications
- Share history with doctor

---

## Project structure

```
doctor8/
├── prisma/
│   └── schema.prisma          ← Database tables
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/         ← Login page
│   │   │   └── register/      ← Register page
│   │   └── api/
│   │       └── auth/
│   │           └── register/  ← Registration API
│   ├── lib/
│   │   ├── auth.ts            ← Authentication config
│   │   ├── db.ts              ← Database connection
│   │   ├── encryption.ts      ← PHI encryption (HIPAA)
│   │   └── audit.ts           ← Audit logging (HIPAA)
│   └── middleware.ts           ← Route protection
├── .env.example                ← Environment variables template
├── next.config.js              ← Security headers
└── package.json                ← Dependencies
```
