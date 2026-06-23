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

function redirectTo(req: NextRequest, status: string) {
  const url = new URL(`${publicBase(req)}/professional/prescriptions`);
  url.searchParams.set("sign", status);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL(`${publicBase(req)}/login`));
  }

  const signatureSessionId = req.nextUrl.searchParams.get("signatureSessionId") || "";
  const prescriptionId = req.nextUrl.searchParams.get("prescriptionId") || "";
  console.log("[CALLBACK] prescriptionId:", prescriptionId, "sessionId:", signatureSessionId);

  if (!prescriptionId) {
    return redirectTo(req, "error");
  }

  // Carrega a receita e valida dono
  const prescription = await db.prescription.findUnique({
    where: { id: prescriptionId },
    include: { professional: true },
  });
  if (!prescription || prescription.professional.userId !== session.user.id) {
    console.error("[CALLBACK] receita nao encontrada ou sem permissao");
    return redirectTo(req, "error");
  }

  // Sem signatureSessionId: tratamos como cancelamento defensivo.
  if (!signatureSessionId) {
    await db.prescription.update({
      where: { id: prescriptionId },
      data: { signatureStatus: "CANCELLED" },
    });
    return redirectTo(req, "cancelled");
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
    return redirectTo(req, "error");
  }

  const status = (lacunaSession.status || "").toLowerCase();
  console.log("[CALLBACK] status da sessao:", status);

  // Cancelado pelo usuário
  if (status === "usercancelled" || status === "cancelled") {
    await db.prescription.update({
      where: { id: prescriptionId },
      data: { signatureStatus: "CANCELLED" },
    });
    return redirectTo(req, "cancelled");
  }

  // Ainda processando (background) — o PDF pode não estar pronto ainda.
  if (status === "processing" || status === "pending") {
    await db.prescription.update({
      where: { id: prescriptionId },
      data: { signatureStatus: "PENDING" },
    });
    return redirectTo(req, "processing");
  }

  // Qualquer status que não seja "completed" a esta altura = inesperado
  if (status !== "completed") {
    console.error("[CALLBACK] status inesperado:", status);
    await db.prescription.update({
      where: { id: prescriptionId },
      data: { signatureStatus: "ERROR" },
    });
    return redirectTo(req, "error");
  }

  // Concluída — baixa o PDF assinado
  const location = getSignedLocation(lacunaSession);
  console.log("[CALLBACK] location do PDF assinado:", location);
  if (!location) {
    await db.prescription.update({
      where: { id: prescriptionId },
      data: { signatureStatus: "ERROR" },
    });
    return redirectTo(req, "error");
  }

  let signedBytes: Buffer;
  try {
    signedBytes = await downloadSignedPdf(location);
    console.log("[CALLBACK] PDF assinado baixado:", signedBytes.length, "bytes");
  } catch (e) {
    console.error("[CALLBACK] download do PDF falhou:", (e as Error).message);
    await db.prescription.update({
      where: { id: prescriptionId },
      data: { signatureStatus: "ERROR" },
    });
    return redirectTo(req, "error");
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
    console.log("[CALLBACK] PDF salvo no S3:", key);
  } catch (e) {
    console.error("[CALLBACK] upload S3 falhou:", (e as Error).message);
    await db.prescription.update({
      where: { id: prescriptionId },
      data: { signatureStatus: "ERROR" },
    });
    return redirectTo(req, "error");
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

  console.log("[CALLBACK] assinatura concluida com sucesso");
  return redirectTo(req, "success");
}
