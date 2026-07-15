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
import { parseLacunaError } from "@/lib/lacuna-errors";
import type { Lang } from "@/lib/prescription-pdf";
import { buildPrescriptionPdfBytesForRecord } from "@/lib/prescription-pdf-data";
import { requireVerifiedProfessional } from "@/lib/professional-verified";
import { getPublicBase, buildSignReturnUrl, assertPublicSignBase, resolveRequestLang } from "@/lib/sign-helpers";

// Garante runtime Node (pdf-lib e Buffer não rodam em edge) e tempo extra.
export const runtime = "nodejs";
export const maxDuration = 60;

function safeDecrypt(v: string | null | undefined): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
  let prescriptionId = "";
  let deliverAfter = false;
  try {
    const body = await req.json();
    prescriptionId = String(body.prescriptionId || "");
    deliverAfter = body.deliverAfter === true;
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
  if (!prescription?.professional || prescription.professional.userId !== session.user.id) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const verified = await requireVerifiedProfessional(session.user.id);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
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
  const lang = resolveRequestLang(req, viewer?.language) as Lang;

  let pdfBytes: Uint8Array;
  let pharmacyQrPng: Uint8Array | undefined;
  try {
    const { ensurePrescriptionToken, prescriptionQrUrl } = await import(
      "@/lib/pharmacy-network/prescription-token"
    );
    const { generateQrPngBuffer } = await import("@/lib/qr-png");
    const tokenRow = await ensurePrescriptionToken(prescription.id);
    pharmacyQrPng = await generateQrPngBuffer(prescriptionQrUrl(tokenRow.token), 180);
  } catch {
    // optional QR at sign time
  }
  try {
    pdfBytes = await buildPrescriptionPdfBytesForRecord({
      prescription,
      lang,
      pharmacyQrPng,
    });
  } catch (e) {
    console.error("[SIGN] erro ao gerar PDF:", e);
    return NextResponse.json(
      { error: "Não foi possível gerar o PDF da receita. Tente novamente." }, { status: 500 }
    );
  }

  const publicBase = getPublicBase(req);
  const baseError = assertPublicSignBase(publicBase);
  if (baseError) {
    return NextResponse.json({ error: baseError }, { status: 400 });
  }

  const returnUrl = buildSignReturnUrl(
    publicBase,
    "/api/professional/prescriptions/sign/callback",
    {
      prescriptionId: prescription.id,
      ...(deliverAfter ? { deliverAfter: "1" } : {}),
    },
  );

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
    console.error("[SIGN] erro ao criar sessão de assinatura:", e);
    const code = parseLacunaError(e);
    return NextResponse.json(
      { error: "Serviço de assinatura digital indisponível no momento. Tente novamente em instantes.", code },
      { status: 502 },
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
      { error: "Não foi possível iniciar a assinatura digital. Tente novamente em instantes." },
      { status: 500 }
    );
  }
}
