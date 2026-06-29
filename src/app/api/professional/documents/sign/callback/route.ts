// GET — Lacuna callback for clinical document signing

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getSignatureSession, getSignedLocation, downloadSignedPdf } from "@/lib/lacuna";
import { getPublicBase } from "@/lib/sign-helpers";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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

function redirectTo(req: NextRequest, status: string, opts?: { flow?: string; kind?: string; id?: string }) {
  const url = new URL(`${getPublicBase(req)}/professional/prescriptions`);
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
    return NextResponse.redirect(new URL(`${getPublicBase(req)}/login`));
  }

  const signatureSessionId = req.nextUrl.searchParams.get("signatureSessionId") || "";
  const documentId = req.nextUrl.searchParams.get("documentId") || "";

  if (!documentId) return redirectTo(req, "error");

  const document = await db.medicalDocument.findUnique({
    where: { id: documentId },
    include: { professional: true },
  });

  if (!document?.professional || document.professional.userId !== session.user.id) {
    return redirectTo(req, "error");
  }

  if (!signatureSessionId) {
    await db.medicalDocument.update({
      where: { id: documentId },
      data: { signatureStatus: "CANCELLED" },
    });
    return redirectTo(req, "cancelled");
  }

  let lacunaSession;
  try {
    lacunaSession = await getSignatureSession(signatureSessionId);
  } catch {
    await db.medicalDocument.update({
      where: { id: documentId },
      data: { signatureStatus: "ERROR" },
    });
    return redirectTo(req, "error");
  }

  const status = (lacunaSession.status || "").toLowerCase();

  if (status === "usercancelled" || status === "cancelled") {
    await db.medicalDocument.update({
      where: { id: documentId },
      data: { signatureStatus: "CANCELLED" },
    });
    return redirectTo(req, "cancelled");
  }

  if (status === "processing" || status === "pending") {
    await db.medicalDocument.update({
      where: { id: documentId },
      data: { signatureStatus: "PENDING" },
    });
    return redirectTo(req, "processing");
  }

  if (status !== "completed") {
    await db.medicalDocument.update({
      where: { id: documentId },
      data: { signatureStatus: "ERROR" },
    });
    return redirectTo(req, "error");
  }

  const location = getSignedLocation(lacunaSession);
  if (!location) {
    await db.medicalDocument.update({
      where: { id: documentId },
      data: { signatureStatus: "ERROR" },
    });
    return redirectTo(req, "error");
  }

  let signedBytes: Buffer;
  try {
    signedBytes = await downloadSignedPdf(location);
  } catch {
    await db.medicalDocument.update({
      where: { id: documentId },
      data: { signatureStatus: "ERROR" },
    });
    return redirectTo(req, "error");
  }

  const key = `documents/signed/${documentId}.pdf`;
  try {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: signedBytes,
      ContentType: "application/pdf",
    }));
  } catch {
    await db.medicalDocument.update({
      where: { id: documentId },
      data: { signatureStatus: "ERROR" },
    });
    return redirectTo(req, "error");
  }

  await db.medicalDocument.update({
    where: { id: documentId },
    data: {
      signatureStatus: "SIGNED",
      signedFileUrl: key,
      signedAt: new Date(),
      digitalSignature: `lacuna:${signatureSessionId}`,
    },
  });

  try {
    await audit.viewRecord(session.user.id, "ClinicalDocumentSigned", documentId);
  } catch { /* ignore */ }

  const deliverAfter = req.nextUrl.searchParams.get("deliverAfter") === "1";
  const docKind =
    document.type === "EXAM_REQUEST" || document.type === "EXAM_RESULT" ? "exam" : "document";
  return redirectTo(req, "success", deliverAfter
    ? { flow: "deliver", kind: docKind, id: documentId }
    : undefined);
}
