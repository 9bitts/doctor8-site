// src/app/api/professional/prescriptions/sign/callback/route.ts
// GET — retorno (returnUrl) da Lacuna após o médico assinar.
//
// A Lacuna redireciona para cá com ?signatureSessionId=...&prescriptionId=...
// Aqui nós:
//   1. Consultamos a sessão na Lacuna.
//   2. Se concluída, baixamos o PDF assinado.
//   3. Salvamos no S3 (doctor8-files-prod).
//   4. Atualizamos a prescrição (signatureStatus=SIGNED, signedFileUrl, signedAt).
//   5. Redirecionamos o médico de volta à tela de prescrições com um status.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getSignatureSession, getSignedLocation, downloadSignedPdf } from "@/lib/lacuna";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "eu-north-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
const BUCKET = process.env.AWS_S3_BUCKET || "doctor8-files-prod";

function redirectTo(req: NextRequest, status: string) {
  const url = new URL("/professional/prescriptions", req.nextUrl.origin);
  url.searchParams.set("sign", status);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  const signatureSessionId = req.nextUrl.searchParams.get("signatureSessionId") || "";
  const prescriptionId = req.nextUrl.searchParams.get("prescriptionId") || "";

  if (!prescriptionId) {
    return redirectTo(req, "error");
  }

  // Carrega a receita e valida dono
  const prescription = await db.prescription.findUnique({
    where: { id: prescriptionId },
    include: { professional: true },
  });
  if (!prescription || prescription.professional.userId !== session.user.id) {
    return redirectTo(req, "error");
  }

  // O médico pode ter cancelado na Lacuna (volta sem signatureSessionId)
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
    await db.prescription.update({
      where: { id: prescriptionId },
      data: { signatureStatus: "ERROR" },
    });
    return redirectTo(req, "error");
  }

  const status = (lacunaSession.status || "").toLowerCase();

  // Ainda processando (background) — marca e volta; o médico pode atualizar depois
  if (status !== "completed") {
    await db.prescription.update({
      where: { id: prescriptionId },
      data: { signatureStatus: status === "processing" ? "PENDING" : "CANCELLED" },
    });
    return redirectTo(req, status === "processing" ? "processing" : "cancelled");
  }

  // Concluída — baixa o PDF assinado
  const location = getSignedLocation(lacunaSession);
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
  } catch {
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
  } catch (e) {
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

  await audit.viewRecord(session.user.id, "PrescriptionSigned", prescriptionId);

  return redirectTo(req, "success");
}
