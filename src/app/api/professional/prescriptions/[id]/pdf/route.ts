// src/app/api/professional/prescriptions/[id]/pdf/route.ts
// Generates a professional digital prescription PDF

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { audit } from "@/lib/audit";

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
            select: { firstName: true, lastName: true, dateOfBirth: true },
          },
        },
      },
    },
  });

  if (!prescription) return new NextResponse("Not found", { status: 404 });

  // Access control: only the prescribing professional or the patient
  const isProfessional = prescription.professional.userId === session.user.id;
  const isPatient = prescription.document?.patient &&
    (await db.patientProfile.findFirst({
      where: { userId: session.user.id, id: prescription.document.patientId },
    }));

  if (!isProfessional && !isPatient && session.user.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  await audit.viewRecord(session.user.id, "Prescription", prescription.id);

  const patientFirstName = prescription.document?.patient
    ? decrypt(prescription.document.patient.firstName)
    : "—";
  const patientLastName = prescription.document?.patient
    ? decrypt(prescription.document.patient.lastName)
    : "—";

  const meds = prescription.medications as {
    name: string; dosage: string; frequency: string; duration?: string; instructions?: string;
  }[];

  const instructions = prescription.instructions
    ? decrypt(prescription.instructions)
    : "";

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const validUntil = prescription.validUntil
    ? new Date(prescription.validUntil).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      })
    : "No expiry";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Prescription — Dr. ${prescription.professional.lastName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', serif; color: #1a1a1a; padding: 48px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
  .logo-area h1 { font-size: 32px; font-weight: 900; font-family: Arial, sans-serif; color: #0a4d6e; letter-spacing: -1px; }
  .logo-area h1 span { color: #00b87a; }
  .logo-area p { font-size: 11px; color: #666; margin-top: 2px; }
  .doc-info { text-align: right; font-size: 12px; color: #444; }
  .doc-info .doc-name { font-size: 16px; font-weight: 700; color: #0a4d6e; }
  .doc-info .license { color: #666; margin-top: 2px; }
  .rx-divider { border: none; border-top: 3px double #0a4d6e; margin: 24px 0; }
  .patient-box { display: flex; gap: 48px; margin-bottom: 32px; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e5e7eb; }
  .patient-field label { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #888; font-family: Arial, sans-serif; }
  .patient-field value { font-size: 14px; font-weight: 600; display: block; margin-top: 2px; }
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
    <p>Secure Digital Health Platform · HIPAA & GDPR Compliant</p>
  </div>
  <div class="doc-info">
    <div class="doc-name">Dr. ${prescription.professional.firstName} ${prescription.professional.lastName}</div>
    <div class="license">${prescription.professional.specialty}</div>
    <div class="license">${prescription.professional.licenseNumber}</div>
    ${prescription.professional.clinicCity ? `<div class="license">${prescription.professional.clinicCity}${prescription.professional.clinicState ? `, ${prescription.professional.clinicState}` : ""}</div>` : ""}
    <div class="license" style="margin-top:8px;">Date: ${today}</div>
  </div>
</div>

<hr class="rx-divider">

<div class="patient-box">
  <div class="patient-field">
    <label>Patient Name</label>
    <value>${patientFirstName} ${patientLastName}</value>
  </div>
  <div class="patient-field">
    <label>Prescription Date</label>
    <value>${today}</value>
  </div>
  <div class="patient-field">
    <label>Valid Until</label>
    <value>${validUntil}</value>
  </div>
</div>

<div class="rx-symbol">℞</div>

${meds.map((med, i) => `
  <div class="med-item">
    <div class="med-name">${i + 1}. ${med.name}</div>
    <div class="med-detail">
      <span>Dosage:</span> ${med.dosage}<br>
      <span>Frequency:</span> ${med.frequency}<br>
      ${med.duration ? `<span>Duration:</span> ${med.duration}<br>` : ""}
      ${med.instructions ? `<span>Instructions:</span> ${med.instructions}` : ""}
    </div>
  </div>
`).join("")}

${instructions ? `
  <div class="instructions-box">
    <label>General Instructions</label>
    <p>${instructions}</p>
  </div>
` : ""}

<div class="footer">
  <div class="validity">
    <strong>Digital Prescription ID</strong>
    ${prescription.id.toUpperCase().slice(0, 12)}
    <div style="margin-top:8px;"><strong>Digital Signature</strong>${prescription.digitalSignature?.slice(0, 16)}...</div>
  </div>
  <div class="signature-area">
    <div style="height:48px;"></div>
    <div class="signature-line">
      Dr. ${prescription.professional.firstName} ${prescription.professional.lastName}<br>
      ${prescription.professional.specialty} · ${prescription.professional.licenseNumber}
    </div>
  </div>
</div>

<div class="confidential">
  CONFIDENTIAL — This prescription is protected health information under HIPAA.<br>
  Prescription ID: ${prescription.id} · Doctor8 Platform · doctor8.app
</div>

<script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
