import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSignatureSession, getSignedLocation, downloadSignedPdf } from "@/lib/lacuna";
import { buildKey, uploadToS3 } from "@/lib/s3";
import { getPublicBase } from "@/lib/sign-helpers";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const session = await auth();
  const base = getPublicBase(req);
  const redirectBase = `${base}/empresas/documentacao`;

  if (!session?.user) {
    return NextResponse.redirect(`${base}/empresas/login`);
  }

  const signatureSessionId = req.nextUrl.searchParams.get("signatureSessionId") || "";
  const signatureId = req.nextUrl.searchParams.get("signatureId") || "";

  const signature = signatureId
    ? await db.employerDocumentSignature.findUnique({ where: { id: signatureId } })
    : signatureSessionId
      ? await db.employerDocumentSignature.findFirst({ where: { lacunaSessionId: signatureSessionId } })
      : null;

  if (!signature) {
    return NextResponse.redirect(`${redirectBase}?sign=error`);
  }

  if (!signatureSessionId) {
    return NextResponse.redirect(`${redirectBase}?sign=cancelled`);
  }

  let lacunaSession;
  try {
    lacunaSession = await getSignatureSession(signatureSessionId);
  } catch {
    return NextResponse.redirect(`${redirectBase}?sign=error`);
  }

  const status = (lacunaSession.status || "").toLowerCase();
  if (status !== "completed") {
    await db.employerDocumentSignature.update({
      where: { id: signature.id },
      data: { signatureStatus: "CANCELLED" },
    });
    return NextResponse.redirect(`${redirectBase}?sign=cancelled`);
  }

  const location = getSignedLocation(lacunaSession);
  if (!location) {
    return NextResponse.redirect(`${redirectBase}?sign=error`);
  }

  const pdfBytes = await downloadSignedPdf(location);
  const key = buildKey(`employer/${signature.employerCompanyId}/signed`, `${signature.docType}.pdf`);
  await uploadToS3({ key, body: pdfBytes, contentType: "application/pdf" });

  await db.employerDocumentSignature.update({
    where: { id: signature.id },
    data: {
      signatureStatus: "SIGNED",
      signedPdfKey: key,
      signedAt: new Date(),
    },
  });

  if (signature.docType === "PCMSO") {
    await db.employerPcmsoConfig.upsert({
      where: { employerCompanyId: signature.employerCompanyId },
      create: {
        employerCompanyId: signature.employerCompanyId,
        coordinatorName: signature.signedByName,
        coordinatorCrm: signature.signedByRegistro,
        lastReviewAt: new Date(),
      },
      update: { lastReviewAt: new Date() },
    });
  }

  return NextResponse.redirect(`${redirectBase}?sign=success&doc=${signature.docType}`);
}
