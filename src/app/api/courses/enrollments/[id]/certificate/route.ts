import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { issueCourseCertificate } from "@/lib/courses/certificate";
import { getAppUrl } from "@/lib/email-core";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const enrollment = await db.courseEnrollment.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: {
      id: true,
      progressPercent: true,
      completedAt: true,
      certificate: {
        select: {
          verifyCode: true,
          studentName: true,
          courseTitle: true,
          instructorName: true,
          workloadHours: true,
          issuedAt: true,
        },
      },
    },
  });
  if (!enrollment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let cert = enrollment.certificate;
  if (!cert && enrollment.progressPercent >= 100) {
    const issued = await issueCourseCertificate(enrollment.id);
    if (issued) {
      cert = await db.courseCertificate.findUnique({
        where: { enrollmentId: enrollment.id },
        select: {
          verifyCode: true,
          studentName: true,
          courseTitle: true,
          instructorName: true,
          workloadHours: true,
          issuedAt: true,
        },
      });
    }
  }

  if (!cert) {
    return NextResponse.json({
      available: false,
      progressPercent: enrollment.progressPercent,
    });
  }

  const appUrl = getAppUrl();
  return NextResponse.json({
    available: true,
    certificate: {
      ...cert,
      issuedAt: cert.issuedAt.toISOString(),
      verifyUrl: `${appUrl}/cursos/certificado/${cert.verifyCode}`,
    },
  });
}
