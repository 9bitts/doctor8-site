import { NextRequest, NextResponse } from "next/server";
import { getAngelCertificateByCode } from "@/lib/humanitarian/angel-certificate";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const cert = await getAngelCertificateByCode(code);
  if (!cert) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }

  return NextResponse.json({
    valid: true,
    certificate: {
      verifyCode: cert.verifyCode,
      volunteerName: cert.volunteerName,
      campaignName: cert.campaignName,
      tracks: cert.tracks,
      totalMinutes: cert.totalMinutes,
      totalHours: Math.round((cert.totalMinutes / 60) * 10) / 10,
      periodStart: cert.periodStart?.toISOString() ?? null,
      periodEnd: cert.periodEnd?.toISOString() ?? null,
      issuedAt: cert.issuedAt.toISOString(),
    },
  });
}
