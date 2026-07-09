// src/app/api/professional/prescriptions/sign/callback/route.ts
// GET — retorno (returnUrl) da Lacuna após o médico assinar.
//
// A Lacuna redireciona para cá com ?signatureSessionId=...&prescriptionId=...
// Segundo a doc, ao voltar a sessão tem status "Completed" ou "UserCancelled".
// Aqui nós:
//   1. Consultamos a sessão na Lacuna.
//   2. Se Completed, baixamos o PDF assinado e salvamos no S3.
//   3. Atualizamos a prescrição (signatureStatus=SIGNED, signedFileUrl, signedAt).
//   4. Redirecionamos o médico de volta à tela de prescrições com um status.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getSignatureSession, getSignedLocation, downloadSignedPdf } from "@/lib/lacuna";
import { professionalPortalBaseFromSpecialty } from "@/lib/psychologist-portal";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// pdf-lib/Buffer/S3 exigem runtime Node; o download + upload pode demorar.
export const runtime = "nodejs";
export const maxDuration = 60;

const s3 = new S3Client({
  region: process.env.AWS_REGION || "eu-north-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
const BUCKET = process.env.AWS_S3_BUCKET || "doctor8-files-prod";

// Base pública robusta (atrás do Cloudflare/Railway o origin pode ser localhost).
function publicBase(req: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (req.headers.get("x-forwarded-host")
      ? `https://${req.headers.get("x-forwarded-host")}`
      : req.headers.get("host")
        ? `https://${req.headers.get("host")}`
        : req.nextUrl.origin)
  ).replace(/\/+$/, "");
}

function redirectTo(
  req: NextRequest,
  status: string,
  specialty: string,
  opts?: { flow?: string; kind?: string; id?: string },
) {
  const base = professionalPortalBaseFromSpecialty(specialty);
  const url = new URL(`${publicBase(req)}${base}/prescriptions`);
  url.searchParams.set("sign", status);
  if (opts?.flow === "deliver" && status === "success" && opts.kind && opts.id) {
    url.searchParams.set("flow", "deliver");
    url.searchParams.set("kind", opts.kind);
    url.searchParams.set("id", opts.id);
  }
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL(`${publicBase(req)}/login`));
  }

  const signatureSessionId = req.nextUrl.searchParams.get("signatureSessionId") || "";
  let prescriptionId = req.nextUrl.searchParams.get("prescriptionId") || "";

  let prescription = prescriptionId
    ? await db.prescription.findUnique({
        where: { id: prescriptionId },
        include: { professional: true },
      })
    : signatureSessionId
      ? await db.prescription.findFirst({
          where: { signatureSessionId },
          include: { professional: true },
        })
      : null;

  if (!prescription?.professional || prescription.professional.userId !== session.user.id) {
    console.error("[CALLBACK] receita nao encontrada ou sem permissao");
    return redirectTo(req, "error", "General Practice");
  }
  prescriptionId = prescription.id;
  const proSpecialty = prescription.professional.specialty;

  // Sem signatureSessionId: tratamos como cancelamento defensivo.
  if (!signatureSessionId) {
    await db.prescription.update({
      where: { id: prescriptionId },
      data: { signatureStatus: "CANCELLED" },
    });
    return redirectTo(req, "cancelled", proSpecialty);
  }

  // Consulta a sessão na Lacuna
  let lacunaSession;
  try {
    lacunaSession = await getSignatureSession(signatureSessionId);
  } catch (e) {
    console.error("[CALLBACK] getSignatureSession falhou:", (e as Error).message);
    await db.prescription.update({
      where: { id: prescriptionId },
      data: { signatureStatus: "ERROR" },
    });
    return redirectTo(req, "error", proSpecialty);
  }

  const status = (lacunaSession.status || "").toLowerCase();

  // Cancelado pelo usuário
  if (status === "usercancelled" || status === "cancelled") {
    await db.prescription.update({
      where: { id: prescriptionId },
      data: { signatureStatus: "CANCELLED" },
    });
    return redirectTo(req, "cancelled", proSpecialty);
  }

  // Ainda processando (background) — o PDF pode não estar pronto ainda.
  if (status === "processing" || status === "pending") {
    await db.prescription.update({
      where: { id: prescriptionId },
      data: { signatureStatus: "PENDING" },
    });
    return redirectTo(req, "processing", proSpecialty);
  }

  // Qualquer status que não seja "completed" a esta altura = inesperado
  if (status !== "completed") {
    console.error("[CALLBACK] status inesperado:", status);
    await db.prescription.update({
      where: { id: prescriptionId },
      data: { signatureStatus: "ERROR" },
    });
    return redirectTo(req, "error", proSpecialty);
  }

  // Concluída — baixa o PDF assinado
  const location = getSignedLocation(lacunaSession);
  if (!location) {
    await db.prescription.update({
      where: { id: prescriptionId },
      data: { signatureStatus: "ERROR" },
    });
    return redirectTo(req, "error", proSpecialty);
  }

  let signedBytes: Buffer;
  try {
    signedBytes = await downloadSignedPdf(location);
  } catch (e) {
    console.error("[CALLBACK] download do PDF falhou:", (e as Error).message);
    await db.prescription.update({
      where: { id: prescriptionId },
      data: { signatureStatus: "ERROR" },
    });
    return redirectTo(req, "error", proSpecialty);
  }

  // Salva no S3
  const key = `prescriptions/signed/${prescriptionId}.pdf`;
  try {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: signedBytes,
      ContentType: "application/pdf",
    }));
  } catch (e) {
    console.error("[CALLBACK] upload S3 falhou:", (e as Error).message);
    await db.prescription.update({
      where: { id: prescriptionId },
      data: { signatureStatus: "ERROR" },
    });
    return redirectTo(req, "error", proSpecialty);
  }

  // Atualiza a prescrição
  await db.prescription.update({
    where: { id: prescriptionId },
    data: {
      signatureStatus: "SIGNED",
      signedFileUrl: key,
      signedAt: new Date(),
      digitalSignature: `lacuna:${signatureSessionId}`,
    },
  });

  try {
    await audit.viewRecord(session.user.id, "PrescriptionSigned", prescriptionId);
  } catch { /* auditoria nao deve quebrar o fluxo */ }

  const deliverAfter = req.nextUrl.searchParams.get("deliverAfter") === "1";
  return redirectTo(req, "success", proSpecialty, deliverAfter
    ? { flow: "deliver", kind: "prescription", id: prescriptionId }
    : undefined);
}
