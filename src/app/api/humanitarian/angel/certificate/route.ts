import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAppUrl } from "@/lib/email-core";
import { issueAngelVolunteerCertificate } from "@/lib/humanitarian/angel-certificate";
import { buildAngelVolunteerCertificatePdf } from "@/lib/humanitarian/angel-certificate-pdf";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ errorCode: "UNAUTHORIZED" }, { status: 401 });
  }
  if (session.user.role !== "ANGEL") {
    return NextResponse.json({ errorCode: "FORBIDDEN" }, { status: 403 });
  }

  const result = await issueAngelVolunteerCertificate(session.user.id);
  if ("error" in result) {
    return NextResponse.json({ available: false, errorCode: result.error }, { status: 403 });
  }

  const cert = await db.angelVolunteerCertificate.findUnique({
    where: { verifyCode: result.verifyCode },
  });
  if (!cert) {
    return NextResponse.json({ available: false }, { status: 404 });
  }

  const appUrl = getAppUrl();
  return NextResponse.json({
    available: true,
    created: result.created,
    certificate: {
      verifyCode: cert.verifyCode,
      volunteerName: cert.volunteerName,
      campaignName: cert.campaignName,
      tracks: cert.tracks,
      totalMinutes: cert.totalMinutes,
      issuedAt: cert.issuedAt.toISOString(),
      verifyUrl: `${appUrl}/humanitarian/angel/certificado/${cert.verifyCode}`,
      pdfUrl: `/api/humanitarian/angel/certificate/pdf`,
    },
  });
}
