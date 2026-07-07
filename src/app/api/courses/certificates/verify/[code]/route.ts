import { NextRequest, NextResponse } from "next/server";
import { getCertificateByCode } from "@/lib/courses/certificate";
import { PROFESSION_LABELS } from "@/lib/courses/display";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { code: string } },
) {
  const cert = await getCertificateByCode(params.code);
  if (!cert) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }

  const profession = cert.enrollment.course.profession;
  return NextResponse.json({
    valid: true,
    certificate: {
      verifyCode: cert.verifyCode,
      studentName: cert.studentName,
      courseTitle: cert.courseTitle,
      instructorName: cert.instructorName,
      workloadHours: cert.workloadHours,
      issuedAt: cert.issuedAt.toISOString(),
      completedAt: cert.enrollment.completedAt?.toISOString() ?? null,
      courseSlug: cert.enrollment.course.slug,
      professionLabel: PROFESSION_LABELS[profession] ?? profession,
    },
  });
}
