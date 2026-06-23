// src/app/api/professional/prescriptions/sign/route.ts
// POST — inicia a assinatura digital de uma receita via Lacuna Rest PKI Core.
//
// Fluxo:
//   1. Valida que o usuário é o profissional dono da receita.
//   2. Gera o PDF REAL da receita (pdf-lib).
//   3. Cria uma Signature Session na Lacuna (PAdES) com o PDF em base64,
//      restringindo ao CPF do médico.
//   4. Salva signatureSessionId + signatureStatus=PENDING na prescrição.
//   5. Devolve { redirectUrl } para o front redirecionar o médico.
//
// O retorno (PDF assinado) é tratado em sign/callback/route.ts.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { audit } from "@/lib/audit";
import { createSignatureSession } from "@/lib/lacuna";
import { buildPrescriptionPdf, type Lang } from "@/lib/prescription-pdf";

// Garante runtime Node (pdf-lib e Buffer não rodam em edge) e tempo extra.
export const runtime = "nodejs";
export const maxDuration = 60;

function safeDecrypt(v: string | null | undefined): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

function normLang(v: string | null | undefined): Lang {
  if (v === "pt" || v === "es") return v;
  return "en";
}

function computeAge(dob: Date | null): number | null {
  if (!dob || isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  if (age < 0 || age > 130) return null;
  return age;
}

function joinAddress(parts: (string | null | undefined)[]): string {
  return parts.map((p) => (p || "").trim()).filter(Boolean).join(", ");
}

const FREQ: Record<Lang, Record<string, string>> = {
  en: {}, // mantém o valor original em inglês
  pt: {
    "Once daily": "Uma vez ao dia", "Twice daily": "Duas vezes ao dia",
    "Three times daily": "Três vezes ao dia", "Every 8 hours": "A cada 8 horas",
    "Every 12 hours": "A cada 12 horas", "As needed": "Quando necessário", "Weekly": "Semanalmente",
  },
  es: {
    "Once daily": "Una vez al día", "Twice daily": "Dos veces al día",
    "Three times daily": "Tres veces al día", "Every 8 hours": "Cada 8 horas",
    "Every 12 hours": "Cada 12 horas", "As needed": "Cuando sea necesario", "Weekly": "Semanalmente",
  },
};
const LOCALE: Record<Lang, string> = { en: "en-US", pt: "pt-BR", es: "es-ES" };

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
  let prescriptionId = "";
  try {
    const body = await req.json();
    prescriptionId = String(body.prescriptionId || "");
  } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }
  if (!prescriptionId) {
    return NextResponse.json({ error: "prescriptionId é obrigatório" }, { status: 400 });
  }

  // ── Carrega a receita + profissional + paciente ──
  const prescription = await db.prescription.findUnique({
    where: { id: prescriptionId },
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

  if (!prescription) {
    return NextResponse.json({ error: "Receita não encontrada" }, { status: 404 });
  }

  // Só o profissional dono pode assinar
  if (prescription.professional.userId !== session.user.id) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  // CPF do médico para a assinatura digital (do ProfessionalProfile)
  const pro = prescription.professional;
  const proCpf = safeDecrypt((pro as { digitalSignCpf?: string | null }).digitalSignCpf ?? null);
  if (!proCpf) {
    return NextResponse.json(
      { error: "Configure seu CPF de assinatura digital nas configurações da conta antes de assinar." },
      { status: 400 }
    );
  }

  // ── Idioma do médico (quem assina) ──
  const viewer = await db.user.findUnique({
    where: { id: session.user.id },
    select: { language: true },
  });
  const lang = normLang(viewer?.language);
  const locale = LOCALE[lang];

  // ── Resolve dados do paciente (ficha tem prioridade) ──
  const rec = prescription.document?.patientRecord;
  const acc = prescription.document?.patient;
  const src = rec || acc;

  let patientName = "—", patientDob: Date | null = null, patientCpf = "";
  let addrLine = "", city = "", state = "", country = "", zip = "";
  if (src) {
    patientName = `${safeDecrypt(src.firstName)} ${safeDecrypt(src.lastName)}`.trim();
    patientDob = src.dateOfBirth ? new Date(safeDecrypt(src.dateOfBirth)) : null;
    patientCpf = safeDecrypt((src as { cpf?: string | null }).cpf ?? null);
    addrLine = safeDecrypt(src.addressLine1);
    city = src.city || ""; state = src.state || "";
    country = src.country || ""; zip = safeDecrypt(src.zipCode);
  }

  const clinicAddressFull = joinAddress([
    (pro as { clinicName?: string | null }).clinicName,
    (pro as { clinicAddress?: string | null }).clinicAddress,
    (pro as { clinicCity?: string | null }).clinicCity,
    (pro as { clinicState?: string | null }).clinicState,
    (pro as { clinicZip?: string | null }).clinicZip,
  ]);

  const meds = (prescription.medications as {
    name: string; dosage: string; frequency: string; duration?: string; instructions?: string;
  }[]).map((m) => ({
    ...m,
    frequency: FREQ[lang][m.frequency] || m.frequency,
  }));

  const today = new Date().toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
  const validUntil = prescription.validUntil
    ? new Date(prescription.validUntil).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" })
    : (lang === "pt" ? "Sem validade" : lang === "es" ? "Sin caducidad" : "No expiry");

  // ── Gera o PDF real ──
  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await buildPrescriptionPdf({
      lang,
      proFirstName: pro.firstName, proLastName: pro.lastName,
      proSpecialty: pro.specialty, proLicense: pro.licenseNumber,
      clinicAddressFull,
      patientName,
      patientAge: computeAge(patientDob),
      patientCpf,
      patientAddressFull: joinAddress([addrLine, city, state, zip, country]),
      prescriptionId: prescription.id,
      todayText: today, validUntilText: validUntil,
      medications: meds,
      instructions: prescription.instructions ? safeDecrypt(prescription.instructions) : "",
      signed: false,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Erro ao gerar PDF: ${(e as Error).message}` }, { status: 500 }
    );
  }

  // ── Cria a Signature Session na Lacuna ──
  // Atrás do Cloudflare/Railway, req.nextUrl.origin pode retornar a URL interna
  // (localhost:8080). Preferimos uma base pública explícita.
  const publicBase =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (req.headers.get("x-forwarded-host")
      ? `https://${req.headers.get("x-forwarded-host")}`
      : req.headers.get("host")
        ? `https://${req.headers.get("host")}`
        : req.nextUrl.origin);

  const returnUrl =
    `${publicBase.replace(/\/+$/, "")}/api/professional/prescriptions/sign/callback?prescriptionId=${encodeURIComponent(prescription.id)}`;

  console.log("[SIGN] returnUrl:", returnUrl);

  let lacuna;
  try {
    lacuna = await createSignatureSession({
      pdfBytes,
      fileName: `receita-${prescription.id.slice(0, 8)}.pdf`,
      returnUrl,
      cpf: proCpf,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Erro ao criar sessão de assinatura: ${(e as Error).message}` },
      { status: 502 }
    );
  }

  // ── Salva o estado na prescrição ──
  await db.prescription.update({
    where: { id: prescription.id },
    data: {
      signatureSessionId: lacuna.sessionId,
      signatureStatus: "PENDING",
    },
  });

    await audit.viewRecord(session.user.id, "PrescriptionSignStart", prescription.id);

    return NextResponse.json({ redirectUrl: lacuna.redirectUrl });
  } catch (e) {
    console.error("[SIGN] erro inesperado:", e);
    return NextResponse.json(
      { error: `Erro interno: ${(e as Error).message || String(e)}` },
      { status: 500 }
    );
  }
}
