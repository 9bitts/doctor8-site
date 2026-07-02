// POST — start Lacuna digital signature for a clinical document (exam, atestado, etc.)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { createSignatureSession } from "@/lib/lacuna";
import { buildClinicalDocumentPdf } from "@/lib/clinical-document-pdf";
import {
  computeAge, getPublicBase, buildSignReturnUrl, assertPublicSignBase,
  isExamType, joinAddress, LOCALE, normLang,
  parseExamContent, resolvePatient, safeDecrypt,
} from "@/lib/sign-helpers";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let deliverAfter = false;
    try {
      const body = await req.json();
      deliverAfter = body?.deliverAfter === true;
    } catch { /* empty body ok */ }

    const document = await db.medicalDocument.findUnique({
      where: { id: params.id },
      include: {
        professional: true,
        patientRecord: {
          select: {
            firstName: true, lastName: true, dateOfBirth: true, cpf: true,
            addressLine1: true, city: true, state: true, country: true, zipCode: true,
          },
        },
        patient: {
          select: {
            firstName: true, lastName: true, dateOfBirth: true, cpf: true,
            addressLine1: true, city: true, state: true, country: true, zipCode: true,
          },
        },
      },
    });

    if (!document || !document.professional) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    }

    if (document.professional.userId !== session.user.id) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const pro = document.professional;
    const proCpf = safeDecrypt((pro as { digitalSignCpf?: string | null }).digitalSignCpf ?? null);
    if (!proCpf) {
      return NextResponse.json(
        { error: "Configure seu CPF de assinatura digital nas configurações da conta antes de assinar." },
        { status: 400 }
      );
    }

    const viewer = await db.user.findUnique({
      where: { id: session.user.id },
      select: { language: true },
    });
    const lang = normLang(viewer?.language);
    const locale = LOCALE[lang];

    const patient = resolvePatient(document.patientRecord, document.patient);
    const contentRaw = document.content ? safeDecrypt(document.content) : "";
    const title = safeDecrypt(document.title);
    const exam = isExamType(document.type) ? parseExamContent(contentRaw) : null;

    const clinicAddressFull = joinAddress([
      (pro as { clinicName?: string | null }).clinicName,
      (pro as { clinicAddress?: string | null }).clinicAddress,
      (pro as { clinicCity?: string | null }).clinicCity,
      (pro as { clinicState?: string | null }).clinicState,
      (pro as { clinicZip?: string | null }).clinicZip,
    ]);

    const todayText = new Date().toLocaleDateString(locale, {
      year: "numeric", month: "long", day: "numeric",
    });

    const pdfBytes = await buildClinicalDocumentPdf({
      lang,
      kind: exam ? "exam" : "document",
      docTitle: title,
      proFirstName: pro.firstName,
      proLastName: pro.lastName,
      proSpecialty: pro.specialty,
      proLicense: pro.licenseNumber,
      clinicAddressFull,
      patientName: patient.name,
      patientAge: computeAge(patient.dob),
      patientCpf: patient.cpf,
      patientAddressFull: patient.addressFull,
      todayText,
      documentId: document.id,
      examItems: exam?.items,
      examNotes: exam?.notes,
      cid: exam?.cid,
      body: exam ? undefined : contentRaw,
    });

    const publicBase = getPublicBase(req);
    const baseError = assertPublicSignBase(publicBase);
    if (baseError) {
      return NextResponse.json({ error: baseError }, { status: 400 });
    }

    const returnUrl = buildSignReturnUrl(
      publicBase,
      "/api/professional/documents/sign/callback",
      { documentId: document.id, ...(deliverAfter ? { deliverAfter: "1" } : {}) },
    );

    console.log("[DOC SIGN] returnUrl:", returnUrl);

    const lacuna = await createSignatureSession({
      pdfBytes,
      fileName: `documento-${document.id.slice(0, 8)}.pdf`,
      returnUrl,
      cpf: proCpf,
    });

    await db.medicalDocument.update({
      where: { id: document.id },
      data: {
        signatureSessionId: lacuna.sessionId,
        signatureStatus: "PENDING",
      },
    });

    await audit.viewRecord(session.user.id, "ClinicalDocumentSignStart", document.id);

    return NextResponse.json({ redirectUrl: lacuna.redirectUrl });
  } catch (e) {
    console.error("[DOC SIGN] erro:", e);
    return NextResponse.json(
      { error: "Não foi possível iniciar a assinatura digital. Tente novamente em instantes." },
      { status: 500 }
    );
  }
}
