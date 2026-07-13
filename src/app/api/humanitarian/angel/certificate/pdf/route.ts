import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildAngelVolunteerCertificatePdf } from "@/lib/humanitarian/angel-certificate-pdf";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ANGEL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const profile = await db.angelProfile.findUnique({
    where: { userId: session.user.id },
    include: { volunteerCertificate: true },
  });
  const cert = profile?.volunteerCertificate;
  if (!cert) {
    return NextResponse.json({ error: "Certificate not issued" }, { status: 404 });
  }

  const pdf = await buildAngelVolunteerCertificatePdf({
    volunteerName: cert.volunteerName,
    campaignName: cert.campaignName,
    tracks: cert.tracks,
    totalMinutes: cert.totalMinutes,
    verifyCode: cert.verifyCode,
    issuedAt: cert.issuedAt,
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificado-anjo-${cert.verifyCode}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
