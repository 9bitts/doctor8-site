// src/app/api/patient/history/pdf/route.ts
// Generates a printable HTML page that the browser renders as PDF
// Patient can print → Save as PDF from any browser

import { NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { decrypt } from "@/lib/encryption";
import { getAppUrl } from "@/lib/email-core";
import { printBrandLogoImg } from "@/lib/brand";
import { getUserLang } from "@/lib/i18n/server-lang";
import { translate, type TranslationKey, type Lang } from "@/lib/i18n/translations";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeDecrypt(v: string | null | undefined): string {
  if (v == null || v === "") return "";
  try {
    return decrypt(v);
  } catch {
    return String(v);
  }
}

function formatFieldValue(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).filter(Boolean).join(", ");
  }
  return String(value).trim();
}

/** Questionnaire fields in patient.notes → i18n label keys. */
const HISTORY_FIELDS: { key: string; labelKey: TranslationKey }[] = [
  { key: "isMinor", labelKey: "hist.isMinor" },
  { key: "guardianName", labelKey: "hist.guardianName" },
  { key: "patientName", labelKey: "hist.patientName" },
  { key: "motherName", labelKey: "hist.motherName" },
  { key: "sexAtBirth", labelKey: "hist.sexAtBirth" },
  { key: "maritalStatus", labelKey: "hist.maritalStatus" },
  { key: "profession", labelKey: "hist.profession" },
  { key: "healthInsurance", labelKey: "hist.healthInsurance" },
  { key: "weight", labelKey: "hist.weight" },
  { key: "height", labelKey: "hist.height" },
  { key: "bloodType", labelKey: "hist.bloodType" },
  { key: "disabilities", labelKey: "hist.disabilities" },
  { key: "chronicConditions", labelKey: "hist.chronic" },
  { key: "chiefComplaint", labelKey: "hist.chiefComplaint" },
  { key: "complaintDuration", labelKey: "hist.complaintDuration" },
  { key: "painScale", labelKey: "hist.painScale" },
  { key: "betterFactors", labelKey: "hist.betterFactors" },
  { key: "worseFactors", labelKey: "hist.worseFactors" },
  { key: "pastSurgeries", labelKey: "hist.pastSurgeries" },
  { key: "currentMedications", labelKey: "hist.currentMeds" },
  { key: "familyHistory", labelKey: "hist.familyHistory" },
  { key: "allergies", labelKey: "hist.allergies" },
  { key: "recentTravel", labelKey: "hist.recentTravel" },
  { key: "ruralAreas", labelKey: "hist.ruralAreas" },
  { key: "smokingStatus", labelKey: "hist.smoking" },
  { key: "alcoholUse", labelKey: "hist.alcohol" },
  { key: "exerciseFrequency", labelKey: "hist.exercise" },
  { key: "sleepQuality", labelKey: "hist.sleep" },
  { key: "reviewSystems", labelKey: "hist.sec.review" },
  { key: "menstrualDuration", labelKey: "hist.menstrualDuration" },
  { key: "menstrualCycle", labelKey: "hist.menstrualCycle" },
  { key: "immunology", labelKey: "hist.immuneSystem" },
  { key: "vaccines", labelKey: "hist.whichVaccines" },
  { key: "vaccineReactions", labelKey: "hist.vaccineReactions" },
  { key: "substances", labelKey: "hist.substancesQ" },
  { key: "infectious", labelKey: "hist.infectiousQ" },
  { key: "otherInfectious", labelKey: "hist.otherInfectious" },
  { key: "notes", labelKey: "hist.sec.notes" },
];

function htmlLang(lang: Lang): string {
  return lang === "pt" ? "pt-BR" : lang === "es" ? "es" : "en";
}

export async function GET() {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;
  const { userId } = ctx;

  const lang = await getUserLang(userId);
  const t = (key: TranslationKey) => translate(lang, key);

  const patient = await db.patientProfile.findUnique({
    where: { userId },
    include: {
      medications: {
        where: { active: true, flow: "CLINICAL" },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!patient) return new NextResponse("Not found", { status: 404 });

  await audit.exportData(userId);

  const firstName = safeDecrypt(patient.firstName);
  const lastName = safeDecrypt(patient.lastName);

  let questionnaire: Record<string, unknown> = {};
  if (patient.notes) {
    try {
      questionnaire = JSON.parse(safeDecrypt(patient.notes)) as Record<string, unknown>;
    } catch {
      questionnaire = {};
    }
  }

  const noneReported = t("hist.pdf.noneReported");
  const bloodType =
    patient.bloodType
    || formatFieldValue(questionnaire.bloodType)
    || t("hist.pdf.unknown");
  const allergies =
    (patient.allergies ? safeDecrypt(patient.allergies) : "")
    || formatFieldValue(questionnaire.allergies)
    || noneReported;
  const chronicFromCol = patient.chronicConditions ? safeDecrypt(patient.chronicConditions) : "";
  const chronicFromNotes = formatFieldValue(questionnaire.chronicConditions);
  const chronicConditions = chronicFromCol || chronicFromNotes || noneReported;

  const questionnaireRows = HISTORY_FIELDS
    .map(({ key, labelKey }) => {
      const formatted = formatFieldValue(questionnaire[key]);
      if (!formatted) return null;
      if (key === "bloodType" || key === "allergies" || key === "chronicConditions") return null;
      return `<div class="field"><div class="field-label">${escapeHtml(t(labelKey))}</div><div class="field-value">${escapeHtml(formatted)}</div></div>`;
    })
    .filter(Boolean)
    .join("\n");

  const medications = patient.medications.map((m) => ({
    name: escapeHtml(safeDecrypt(m.name)),
    dosage: escapeHtml(m.dosage ? safeDecrypt(m.dosage) : "—"),
    frequency: escapeHtml(m.frequency ? safeDecrypt(m.frequency) : "—"),
    prescribedBy: escapeHtml(m.prescribedBy || "—"),
  }));

  const today = new Date().toLocaleDateString(
    lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US",
    { year: "numeric", month: "long", day: "numeric" },
  );

  const title = t("hist.pdf.docTitle");
  const html = `<!DOCTYPE html>
<html lang="${htmlLang(lang)}">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)} — ${escapeHtml(firstName)} ${escapeHtml(lastName)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0a4d6e; padding-bottom: 16px; margin-bottom: 24px; }
  .logo { font-size: 28px; font-weight: 900; color: #0a4d6e; }
  .meta { text-align: right; font-size: 11px; color: #666; }
  .patient-name { font-size: 22px; font-weight: 700; color: #0a4d6e; margin-bottom: 4px; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 13px; font-weight: 700; color: #0a4d6e; text-transform: uppercase; letter-spacing: .05em; border-left: 3px solid #00b87a; padding-left: 8px; margin-bottom: 10px; }
  .field { margin-bottom: 8px; }
  .field-label { font-size: 11px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: .04em; }
  .field-value { font-size: 13px; color: #1a1a1a; margin-top: 2px; line-height: 1.5; white-space: pre-wrap; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #0a4d6e; color: white; padding: 8px 12px; text-align: left; font-weight: 600; font-size: 11px; }
  td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
  tr:nth-child(even) td { background: #f8fafc; }
  .footer { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 10px; color: #999; text-align: center; }
  .confidential { background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 8px 12px; font-size: 11px; margin-bottom: 24px; }
  @media print {
    body { padding: 20px; }
    @page { margin: 1cm; }
  }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="logo">${printBrandLogoImg(getAppUrl())}</div>
    <div style="font-size:11px;color:#666;margin-top:4px;">${escapeHtml(t("hist.pdf.platform"))}</div>
  </div>
  <div class="meta">
    <div><strong>${escapeHtml(title)}</strong></div>
    <div>${escapeHtml(t("hist.pdf.generated"))}: ${escapeHtml(today)}</div>
    <div>${escapeHtml(t("hist.pdf.phiBadge"))}</div>
  </div>
</div>

<div class="confidential">
  ${escapeHtml(t("hist.pdf.confidential").replace("{{date}}", today))}
</div>

<div class="patient-name">${escapeHtml(firstName)} ${escapeHtml(lastName)}</div>
<div style="font-size:12px;color:#666;margin-bottom:24px;">
  ${escapeHtml(t("hist.bloodType"))}: <strong>${escapeHtml(bloodType)}</strong>
</div>

<div class="section">
  <div class="section-title">${escapeHtml(t("hist.allergies"))}</div>
  <div class="field-value">${escapeHtml(allergies)}</div>
</div>

<div class="section">
  <div class="section-title">${escapeHtml(t("hist.chronic"))}</div>
  <div class="field-value">${escapeHtml(chronicConditions)}</div>
</div>

<div class="section">
  <div class="section-title">${escapeHtml(t("hist.pdf.questionnaire"))}</div>
  ${questionnaireRows
    || `<p style="color:#666;font-size:12px;">${escapeHtml(t("hist.pdf.noQuestionnaire"))}</p>`}
</div>

<div class="section">
  <div class="section-title">${escapeHtml(t("hist.pdf.meds"))}</div>
  ${medications.length === 0
    ? `<p style="color:#666;font-size:12px;">${escapeHtml(t("hist.pdf.noMeds"))}</p>`
    : `<table>
        <thead>
          <tr>
            <th>${escapeHtml(t("hist.pdf.colMed"))}</th>
            <th>${escapeHtml(t("hist.pdf.colDose"))}</th>
            <th>${escapeHtml(t("hist.pdf.colFreq"))}</th>
            <th>${escapeHtml(t("hist.pdf.colBy"))}</th>
          </tr>
        </thead>
        <tbody>
          ${medications.map((m) => `
            <tr>
              <td>${m.name}</td>
              <td>${m.dosage}</td>
              <td>${m.frequency}</td>
              <td>${m.prescribedBy}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>`
  }
</div>

<div class="footer">
  ${escapeHtml(t("hist.pdf.footer"))}
  Doctor8 &middot; doctor8.app
</div>

<script>
  window.onload = function() { window.print(); }
</script>

</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
