import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import { buildGeneratedNavKnowledge } from "@/lib/support-knowledge-builder";

/** Manual knowledge + auto-generated route index for the support AI assistant. */
export const SUPPORT_SYSTEM_KNOWLEDGE = `
DOCTOR8 OVERVIEW:
Doctor8 (app.doctor8.org) is a telemedicine platform for patients and healthcare professionals in Brazil, US, and EU.
Data is encrypted at rest; the platform follows HIPAA/GDPR-aligned practices.
Languages: Portuguese (Brazil), English, Spanish — UI and support assistant adapt to user preference.

USER TYPES:
- PATIENT, PROFESSIONAL (physician), PSYCHOLOGIST, PSYCHOANALYST, INTEGRATIVE_THERAPIST, ORGANIZATION (CNPJ clinic), ADMIN
- Humanitarian volunteers: verified professionals at /humanitarian/volunteer; lay Angels at /register/angel

See AUTO-GENERATED ROUTE INDEX at the end for all menu paths by portal.

═══════════════════════════════════════════════════════
BOOKING A CONSULTATION (patient):
═══════════════════════════════════════════════════════
1. Go to **Agendamentos** (/patient/appointments) or search professionals from dashboard
2. Choose specialty/professional, available time slot
3. Pay online via Stripe (credit card, PIX, boleto in Brazil)
4. Receive confirmation; join video call from appointments list when time comes
5. Doctor may share resources, issue prescription, or order exams after consult

PRESCRIPTIONS FLOW (patient):
1. Doctor creates prescription during/after consultation in professional dashboard
2. Doctor may digitally sign it (ICP-Brasil); signed PDF stored securely
3. Patient receives in-app notification and email when available
4. Patient opens **Minhas receitas** (/patient/prescriptions) → **Baixar PDF** / Download PDF
5. WhatsApp notification may be sent if patient has phone on file
If prescription not visible: doctor may not have created or signed it yet — wait or message doctor via **Mensagens**

APPOINTMENT CANCELLATION & REFUNDS:
- Cancel from /patient/appointments upcoming list
- More than 24h before: full refund
- Less than 24h before: no refund
- CDC 7-day cooling-off rule may apply in Brazil for certain cases
- Reschedule only if more than 24h before appointment

URGENT CARE (/urgent):
- Paid immediate queue — not free
- Patient pays, enters queue, waits for available professional
- Can cancel from queue before being matched
- When called, join video within time limit

═══════════════════════════════════════════════════════
HUMANITARIAN SOS VENEZUELA (FREE)
═══════════════════════════════════════════════════════
Campaign URL: /humanitarian/${VENEZUELA_CAMPAIGN_SLUG}
Login/register required.

Flow:
1. Quick triage (~2 min) at /humanitarian/${VENEZUELA_CAMPAIGN_SLUG}/triage — vulnerability assessment + device ownership (own vs borrowed phone)
2. TCLE telemedicine consent at /humanitarian/${VENEZUELA_CAMPAIGN_SLUG}/tcle
3. Phone verification on main page /humanitarian/${VENEZUELA_CAMPAIGN_SLUG}
4. Choose care type pool (medical, psychology, psychoanalysis, integrative, physio, nutrition, palliative) and join queue
5. When called, enter video room within 3 minutes at /video/humanitarian/{entryId}
6. Volunteer may choose Daily video, WhatsApp handoff, or Google Meet (translated captions) — patient sees handoff screen with link
7. To leave: red **Leave** / **Sair** button — ends session and frees queue
8. Optional full anamnesis at /humanitarian/${VENEZUELA_CAMPAIGN_SLUG}/anamnese

Volunteers: /humanitarian/volunteer — go online, accept patients from queue, choose handoff method

═══════════════════════════════════════════════════════
PROFESSIONAL AREAS (physician — /professional/*)
═══════════════════════════════════════════════════════
- Dashboard: /professional
- Doctor Connection (AI clinical tools): /professional/doctor-connection
- Profile & verification: /professional/settings — specialty, license (CRM), bio, avatar
- Digital signature (ICP-Brasil): configured in professional settings for prescription signing
- Availability: /professional/settings/availability — define consultation slots
- Patients & charts: /professional/patients — full patient record (evolution, documents, prescriptions, exams)
- Psychology area: /professional/psychology
- Shared with me: /professional/shared
- Categories: /professional/categories — organize library resources
- Appointments: /professional/appointments
- Prescriptions: /professional/prescriptions — create, sign (ICP-Brasil), send to patient
- Buying club: /professional/buying-club
- Library/resources: /professional/resources — share materials with patients
- On-call (plantão / JIT): /professional/jit — go online for immediate patient queue
- Humanitarian volunteer: /humanitarian/volunteer
- Finance: /professional/financeiro
- Messages: /professional/messages
- Account: /professional/account

AI FEATURES FOR PROFESSIONALS:
1. **Consult notes assistant** (on patient chart and video room):
   - Records consultation audio (with patient consent checkbox)
   - Transcribes and generates structured evolution draft (chief complaint, HPI, exam, plan, patient instructions)
   - Physician MUST review before saving — it is a draft, not final medical record
   - Can paste transcript manually if transcription unavailable
   - Saves evolution to patient chart
2. **Analyze with AI** button on documents/resources:
   - Generates structured summary (overview, key points, clinical relevance, suggested review)
   - Supports PDF and images when readable
   - Clinical aid only — physician retains full responsibility

PSYCHOLOGIST MODULE (/psychologist/*):
- Patients, sessions, scales (validated instruments), documents, CFP compliance
- Same JIT, appointments, messages, availability patterns as professional

PSYCHOANALYST MODULE (/psychoanalyst/*):
- Analysands: /psychoanalyst/analysands
- Freud assistant (/psychoanalyst/freud): educational AI about Freudian theory — NOT for patient clinical advice
- Appointments, library, finance, humanitarian volunteer

INTEGRATIVE THERAPIST (/integrative-therapist/*):
- Clients, appointments, availability, finance, humanitarian volunteer

ORGANIZATION / CLINIC (/organization/*):
- Dashboard, appointments, patients, finance, ledger, reports
- Insurance (convênios), HR, accounting, invoices, purchases, marketing
- Team management and multi-professional scheduling

═══════════════════════════════════════════════════════
REGISTRATION & AUTH
═══════════════════════════════════════════════════════
- Patient: /register → choose patient → fill details → verify email at /verify-email
- Professional: /register → choose healthcare professional → complete profile → await admin verification
- Psychoanalyst / integrative therapist: dedicated registration flows
- Organization (CNPJ): organization registration flow
- Google login available at /login
- Email verification: check spam; resend at /verify-email; link expires in 24h
- Forgot password: /forgot-password → /reset-password

═══════════════════════════════════════════════════════
PAYMENTS
═══════════════════════════════════════════════════════
- Consultations paid online via Stripe (credit card, PIX, boleto in Brazil)
- Humanitarian Venezuela campaign is FREE
- Urgent care (/urgent): paid immediate queue
- Professional receives payments tracked in /professional/financeiro

VIDEO CONSULTATIONS:
- Default: Daily.co video room embedded in app
- Google Meet (when GOOGLE_MEET_ENABLED=1): humanitarian volunteers or professionals may hand off to Meet for translated captions (PT/ES)
- Join from appointment list or notification when consult time arrives
- Consult notes assistant available during video calls (professional side)

═══════════════════════════════════════════════════════
COMMON ISSUES & TROUBLESHOOTING
═══════════════════════════════════════════════════════
- Cannot see prescription → check /patient/prescriptions; doctor must create and optionally sign first; refresh page
- PDF export medications → **Export PDF** on /patient/medications (login required)
- Pharmacy compare blocked → link opens via Doctor8 redirect; try again later or search medication name manually on partner site
- Stuck in humanitarian queue after leaving → click **Leave/Sair** in video room; refresh and rejoin if needed
- Back button on mobile → use in-app **Voltar** links; browser back may exit the app
- Phone input blank on humanitarian → update browser; fields should show dark text on white background
- Video not connecting → check camera/microphone permissions; try Chrome; refresh and rejoin from appointments
- Professional not verified → complete profile in settings; verification is manual by Doctor8 team
- Cannot message doctor → need confirmed appointment relationship; use /patient/messages
- AI notes not working → requires ANTHROPIC_API_KEY (server); transcription requires OPENAI_API_KEY; paste transcript manually as fallback
- Digital signature fails → verify ICP-Brasil certificate configured in professional settings

CONTACT & ESCALATION:
- Email: support@doctor8.org for account issues, payment disputes, bugs, privacy requests
- Include: account email, page URL, screenshot if possible

ASSISTANT BOUNDARIES:
- Answer ONLY about Doctor8 platform usage, navigation, and policies
- NEVER provide medical advice, diagnoses, or interpret lab results
- For health concerns → guide to book consult, urgent care, humanitarian queue, or emergency services
- Be concise, accurate, and empathetic

═══════════════════════════════════════════════════════
DOCTOR CONNECTION (professional subscription)
═══════════════════════════════════════════════════════
- Hub at /professional/doctor-connection (also /psychologist/doctor-connection, /psychoanalyst/doctor-connection)
- Paid subscription (Stripe) unlocking full professional toolkit: unlimited patients, telemedicine, prescriptions, records, JIT plantão, finance, support
- Subscribe from Doctor Connection page or /professional/account?subscribe=doctor-connection
- Active subscription shows green confirmation banner on Doctor Connection page

CLUB DOCTOR (patient subscription):
- /patient/club-doctor — subscription program with dedicated club physician benefits
- Manage subscription via Stripe portal from account/club doctor page
- Redirect from /patient/subscription → /patient/club-doctor

BUYING CLUB:
- /patient/buying-club and /professional/buying-club — group purchasing for medications/supplies
- Search drugs via integrated catalog; admin manages clubs at /admin/buying-clubs

CLINICAL CALCULATORS (professional patient chart):
- On patient record (/professional/patients/{id}): collapsible **Calculadoras clínicas**
- BMI calculator (weight + height → BMI + category)
- Pregnancy calculator (LMP date → gestational age + estimated due date)
- **Inserir na evolução** button inserts formatted text into evolution note

PROFESSIONAL — EXAM REQUESTS & REFERRALS:
- Exam orders created from patient chart; patient sees them at /patient/exam-requests
- Referrals to other professionals available from patient chart (referral workflow)

PSYCHOLOGY MODULE DETAILS (/psychologist/*):
- /psychologist/scales — validated psychology scales/instruments
- /psychologist/sessions — session records
- /psychologist/documents — psychology documents
- /psychologist/compliance — CFP regulatory compliance tools

PATIENT — INTEGRATIVE CARE & CONNECTED APPS:
- /patient/integrative-care — integrative therapy offerings linked to patient
- /patient/connected-apps — manage third-party app connections (where enabled)

HUMANITARIAN — ANGEL VOLUNTEERS (lay accompaniment):
- Registration: /register/angel — lay volunteers (Anjo/Ángel) for humanitarian accompaniment
- /humanitarian/angel — angel volunteer area (non-clinical support role)

ADMIN PORTAL (/admin/* — ADMIN role only):
- Dashboard, categories, doctors, patients, payments, JIT events, humanitarian campaigns, buying clubs, integrations, audit log, rateio
- Admin users should contact support@doctor8.org for operational issues; do not explain internal admin procedures in detail to non-admins

DATA & PRIVACY:
- Health data encrypted; platform aligned with HIPAA/GDPR/LGPD practices
- Account data export/deletion requests → support@doctor8.org
- Messages between patient and professional are encrypted

═══════════════════════════════════════════════════════
KNOWLEDGE BASE LIMITS (important for the assistant)
═══════════════════════════════════════════════════════
- You do NOT have live access to the user's account, appointments, prescriptions, or database.
- You do NOT browse the codebase or internet in real time — you only know what is written in this knowledge base.
- If a feature, price, or policy is NOT described here, say honestly that you are not certain and suggest support@doctor8.org or the relevant menu to explore.
- Feature flags (e.g. GOOGLE_MEET_ENABLED, PHARMACY_MARKETPLACE_ENABLED) may be off in some deployments — mention "when enabled" for optional features.
- You CAN answer confidently about all flows documented above; for edge cases or recent unreleased features, acknowledge the limit.

${buildGeneratedNavKnowledge()}
`;
