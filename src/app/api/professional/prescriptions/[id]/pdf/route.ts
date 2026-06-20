// src/app/api/professional/prescriptions/[id]/pdf/route.ts
// Generates a professional digital prescription PDF.
// ETAPA 2.5 fixes:
//  - Patient name now resolves from the chart (patientRecord) when there's no account.
//  - All labels + the medication frequency are translated to the language of the
//    person downloading the PDF (read from User.language).
// P1-d (CFM compliance): the superscription now carries the patient's ADDRESS and AGE,
//  and the header carries the professional's full clinic ADDRESS — as required by the
//  CFM prescription rules (cabeçalho, superinscrição).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { audit } from "@/lib/audit";

type Lang = "en" | "pt" | "es";

function normLang(v: string | null | undefined): Lang {
  if (v === "pt" || v === "es") return v;
  return "en";
}

function safeDecrypt(v: string | null | undefined): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

// Escape user-derived text before injecting into the HTML template.
function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Compute age in full years from a date of birth.
function computeAge(dob: Date | null | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  if (age < 0 || age > 130) return null;
  return age;
}

// Join address parts into a single readable line, skipping empties.
function joinAddress(parts: (string | null | undefined)[]): string {
  return parts.map((p) => (p || "").trim()).filter(Boolean).join(", ");
}

// PDF label dictionary (kept local to this file — the PDF is server-rendered HTML)
const L: Record<Lang, Record<string, string>> = {
  en: {
    tagline: "Secure Digital Health Platform · HIPAA & GDPR Compliant",
    date: "Date",
    patientName: "Patient Name",
    patientAddress: "Patient Address",
    patientAge: "Age",
    patientCpf: "Tax ID (CPF)",
    yearsOld: "years",
    prescriptionDate: "Prescription Date",
    validUntil: "Valid Until",
    noExpiry: "No expiry",
    dosage: "Dosage",
    frequency: "Frequency",
    duration: "Duration",
    instructions: "Instructions",
    generalInstructions: "General Instructions",
    digitalId: "Digital Prescription ID",
    digitalSignature: "Digital Signature",
    confidential: "CONFIDENTIAL — This prescription is protected health information under HIPAA.",
  },
  pt: {
    tagline: "Plataforma Digital de Saúde Segura · Conforme HIPAA e LGPD",
    date: "Data",
    patientName: "Nome do paciente",
    patientAddress: "Endereço do paciente",
    patientAge: "Idade",
    patientCpf: "CPF",
    yearsOld: "anos",
    prescriptionDate: "Data da prescrição",
    validUntil: "Válida até",
    noExpiry: "Sem validade",
    dosage: "Dosagem",
    frequency: "Frequência",
    duration: "Duração",
    instructions: "Instruções",
    generalInstructions: "Instruções gerais",
    digitalId: "ID da prescrição digital",
    digitalSignature: "Assinatura digital",
    confidential: "CONFIDENCIAL — Esta prescrição é informação de saúde protegida.",
  },
  es: {
    tagline: "Plataforma Digital de Salud Segura · Conforme HIPAA y GDPR",
    date: "Fecha",
    patientName: "Nombre del paciente",
    patientAddress: "Dirección del paciente",
    patientAge: "Edad",
    patientCpf: "CPF",
    yearsOld: "años",
    prescriptionDate: "Fecha de la receta",
    validUntil: "Válida hasta",
    noExpiry: "Sin caducidad",
    dosage: "Dosis",
    frequency: "Frecuencia",
    duration: "Duración",
    instructions: "Instrucciones",
    generalInstructions: "Instrucciones generales",
    digitalId: "ID de la receta digital",
    digitalSignature: "Firma digital",
    confidential: "CONFIDENCIAL — Esta receta es información de salud protegida.",
  },
};

// Map the stored English frequency values to translated text
const FREQ: Record<Lang, Record<string, string>> = {
  en: {
    "Once daily": "Once daily",
    "Twice daily": "Twice daily",
    "Three times daily": "Three times daily",
    "Every 8 hours": "Every 8 hours",
    "Every 12 hours": "Every 12 hours",
    "As needed": "As needed",
    "Weekly": "Weekly",
  },
  pt: {
    "Once daily": "Uma vez ao dia",
    "Twice daily": "Duas vezes ao dia",
    "Three times daily": "Três vezes ao dia",
    "Every 8 hours": "A cada 8 horas",
    "Every 12 hours": "A cada 12 horas",
    "As needed": "Quando necessário",
    "Weekly": "Semanalmente",
  },
  es: {
    "Once daily": "Una vez al día",
    "Twice daily": "Dos veces al día",
    "Three times daily": "Tres veces al día",
    "Every 8 hours": "Cada 8 horas",
    "Every 12 hours": "Cada 12 horas",
    "As needed": "Cuando sea necesario",
    "Weekly": "Semanalmente",
  },
};

function translateFreq(value: string, lang: Lang): string {
  return FREQ[lang][value] || value; // fall back to raw value if not a known option
}

const LOCALE: Record<Lang, string> = { en: "en-US", pt: "pt-BR", es: "es-ES" };

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const prescription = await db.prescription.findUnique({
    where: { id: params.id },
    include: {
      professional: true,
      document: {
        include: {
          patient: {
            select: {
              firstName: true, lastName: true, dateOfBirth: true, cpf: true,
              addressLine1: true, city: true, state: true, country: true, zipCode: true,
            },
          },
          patientRecord: {
            select: {
              firstName: true, lastName: true, dateOfBirth: true, cpf: true,
              addressLine1: true, city: true, state: true, country: true, zipCode: true,
            },
          },
        },
      },
    },
  });

  if (!prescription) return new NextResponse("Not found", { status: 404 });

  // Access control: only the prescribing professional or the patient (by account)
  const isProfessional = prescription.professional.userId === session.user.id;
  const isPatient = prescription.document?.patientId &&
    (await db.patientProfile.findFirst({
      where: { userId: session.user.id, id: prescription.document.patientId },
    }));

  if (!isProfessional && !isPatient && session.user.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  await audit.viewRecord(session.user.id, "Prescription", prescription.id);

  // Language = the language of whoever is downloading
  const viewer = await db.user.findUnique({
    where: { id: session.user.id },
    select: { language: true },
  });
  const lang = normLang(viewer?.language);
  const tr = L[lang];
  const locale = LOCALE[lang];

  // ── Resolve patient data: prefer the chart (works without account), fall back to account. ──
  let patientFirstName = "—";
  let patientLastName = "";
  let patientDob: Date | null = null;
  let patientAddrLine = "";
  let patientCity = "";
  let patientState = "";
  let patientCountry = "";
  let patientZip = "";
  let patientCpf = "";

  const rec = prescription.document?.patientRecord;
  const acc = prescription.document?.patient;
  if (rec) {
    patientFirstName = safeDecrypt(rec.firstName);
    patientLastName = safeDecrypt(rec.lastName);
    patientDob = rec.dateOfBirth ? new Date(safeDecrypt(rec.dateOfBirth)) : null;
    patientAddrLine = safeDecrypt(rec.addressLine1);
    patientCity = rec.city || "";
    patientState = rec.state || "";
    patientCountry = rec.country || "";
    patientZip = safeDecrypt(rec.zipCode);
    patientCpf = safeDecrypt((rec as { cpf?: string | null }).cpf ?? null);
  } else if (acc) {
    patientFirstName = safeDecrypt(acc.firstName);
    patientLastName = safeDecrypt(acc.lastName);
    patientDob = acc.dateOfBirth ? new Date(safeDecrypt(acc.dateOfBirth)) : null;
    patientAddrLine = safeDecrypt(acc.addressLine1);
    patientCity = acc.city || "";
    patientState = acc.state || "";
    patientCountry = acc.country || "";
    patientZip = safeDecrypt(acc.zipCode);
    patientCpf = safeDecrypt((acc as { cpf?: string | null }).cpf ?? null);
  }

  const patientAge = computeAge(patientDob);
  const patientAddressFull = joinAddress([patientAddrLine, patientCity, patientState, patientZip, patientCountry]);

  // ── Professional clinic address (CFM header) ──
  const p = prescription.professional;
  const clinicAddressFull = joinAddress([
    (p as { clinicName?: string | null }).clinicName,
    (p as { clinicAddress?: string | null }).clinicAddress,
    (p as { clinicCity?: string | null }).clinicCity,
    (p as { clinicState?: string | null }).clinicState,
    (p as { clinicZip?: string | null }).clinicZip,
  ]);

  const meds = prescription.medications as {
    name: string; dosage: string; frequency: string; duration?: string; instructions?: string;
  }[];

  const instructions = prescription.instructions
    ? safeDecrypt(prescription.instructions)
    : "";

  const today = new Date().toLocaleDateString(locale, {
    year: "numeric", month: "long", day: "numeric",
  });

  const validUntil = prescription.validUntil
    ? new Date(prescription.validUntil).toLocaleDateString(locale, {
        year: "numeric", month: "long", day: "numeric",
      })
    : tr.noExpiry;

  // Build optional superscription rows (only show address/age when present)
  const ageText = patientAge != null ? `${patientAge} ${tr.yearsOld}` : "";
  const patientAddressRow = patientAddressFull
    ? `<div class="patient-field full">
         <label>${tr.patientAddress}</label>
         <value>${esc(patientAddressFull)}</value>
       </div>`
    : "";
  const patientAgeRow = ageText
    ? `<div class="patient-field">
         <label>${tr.patientAge}</label>
         <value>${esc(ageText)}</value>
       </div>`
    : "";
  const patientCpfRow = patientCpf
    ? `<div class="patient-field">
         <label>${tr.patientCpf}</label>
         <value>${esc(patientCpf)}</value>
       </div>`
    : "";

  const clinicAddressLine = clinicAddressFull
    ? `<div class="license">${esc(clinicAddressFull)}</div>`
    : ((p as { clinicCity?: string | null }).clinicCity
        ? `<div class="license">${esc((p as { clinicCity?: string | null }).clinicCity || "")}${(p as { clinicState?: string | null }).clinicState ? `, ${esc((p as { clinicState?: string | null }).clinicState || "")}` : ""}</div>`
        : "");

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<title>Prescription — Dr. ${esc(p.lastName)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', serif; color: #1a1a1a; padding: 48px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
  .logo-area h1 { font-size: 32px; font-weight: 900; font-family: Arial, sans-serif; color: #0a4d6e; letter-spacing: -1px; }
  .logo-area h1 span { color: #00b87a; }
  .logo-area p { font-size: 11px; color: #666; margin-top: 2px; }
  .doc-info { text-align: right; font-size: 12px; color: #444; max-width: 320px; }
  .doc-info .doc-name { font-size: 16px; font-weight: 700; color: #0a4d6e; }
  .doc-info .license { color: #666; margin-top: 2px; }
  .rx-divider { border: none; border-top: 3px double #0a4d6e; margin: 24px 0; }
  .patient-box { display: flex; flex-wrap: wrap; gap: 16px 48px; margin-bottom: 32px; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e5e7eb; }
  .patient-field label { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #888; font-family: Arial, sans-serif; }
  .patient-field value { font-size: 14px; font-weight: 600; display: block; margin-top: 2px; }
  .patient-field.full { flex-basis: 100%; }
  .rx-symbol { font-size: 48px; color: #0a4d6e; font-style: italic; font-weight: 700; margin-bottom: 16px; }
  .med-item { margin-bottom: 28px; padding-bottom: 28px; border-bottom: 1px dashed #e5e7eb; }
  .med-item:last-child { border-bottom: none; }
  .med-name { font-size: 18px; font-weight: 700; color: #0a4d6e; }
  .med-detail { font-size: 14px; margin-top: 6px; color: #444; line-height: 1.7; }
  .med-detail span { font-weight: 600; }
  .instructions-box { margin-top: 32px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; }
  .instructions-box label { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #888; font-family: Arial, sans-serif; }
  .instructions-box p { font-size: 13px; margin-top: 6px; line-height: 1.7; }
  .footer { margin-top: 48px; display: flex; justify-content: space-between; align-items: flex-end; }
  .signature-area { text-align: center; }
  .signature-line { border-top: 1px solid #1a1a1a; width: 200px; margin: 0 auto; padding-top: 8px; font-size: 12px; }
  .validity { font-size: 11px; color: #888; text-align: right; }
  .validity strong { display: block; font-size: 12px; color: #444; }
  .confidential { font-size: 10px; color: #aaa; text-align: center; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 12px; }
  @media print { body { padding: 20px; } @page { margin: 1.5cm; size: A4; } }
</style>
</head>
<body>

<div class="header">
  <div class="logo-area">
    <h1>Doctor<span>8</span></h1>
    <p>${tr.tagline}</p>
  </div>
  <div class="doc-info">
    <div class="doc-name">Dr. ${esc(p.firstName)} ${esc(p.lastName)}</div>
    <div class="license">${esc(p.specialty)}</div>
    <div class="license">${esc(p.licenseNumber)}</div>
    ${clinicAddressLine}
    <div class="license" style="margin-top:8px;">${tr.date}: ${today}</div>
  </div>
</div>

<hr class="rx-divider">

<div class="patient-box">
  <div class="patient-field">
    <label>${tr.patientName}</label>
    <value>${esc(patientFirstName)} ${esc(patientLastName)}</value>
  </div>
  ${patientAgeRow}
  ${patientCpfRow}
  <div class="patient-field">
    <label>${tr.prescriptionDate}</label>
    <value>${today}</value>
  </div>
  <div class="patient-field">
    <label>${tr.validUntil}</label>
    <value>${validUntil}</value>
  </div>
  ${patientAddressRow}
</div>

<div class="rx-symbol">℞</div>

${meds.map((med, i) => `
  <div class="med-item">
    <div class="med-name">${i + 1}. ${esc(med.name)}</div>
    <div class="med-detail">
      <span>${tr.dosage}:</span> ${esc(med.dosage)}<br>
      <span>${tr.frequency}:</span> ${esc(translateFreq(med.frequency, lang))}<br>
      ${med.duration ? `<span>${tr.duration}:</span> ${esc(med.duration)}<br>` : ""}
      ${med.instructions ? `<span>${tr.instructions}:</span> ${esc(med.instructions)}` : ""}
    </div>
  </div>
`).join("")}

${instructions ? `
  <div class="instructions-box">
    <label>${tr.generalInstructions}</label>
    <p>${esc(instructions)}</p>
  </div>
` : ""}

<div class="footer">
  <div class="validity">
    <strong>${tr.digitalId}</strong>
    ${prescription.id.toUpperCase().slice(0, 12)}
    <div style="margin-top:8px;"><strong>${tr.digitalSignature}</strong>${prescription.digitalSignature?.slice(0, 16)}...</div>
  </div>
  <div class="signature-area">
    <div style="height:48px;"></div>
    <div class="signature-line">
      Dr. ${esc(p.firstName)} ${esc(p.lastName)}<br>
      ${esc(p.specialty)} · ${esc(p.licenseNumber)}
    </div>
  </div>
</div>

<div class="confidential">
  ${tr.confidential}<br>
  Prescription ID: ${prescription.id} · Doctor8 Platform · doctor8.app
</div>

<script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
