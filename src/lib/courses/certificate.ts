// Issue and verify course completion certificates.

import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { getInstructorDisplay, getStudentDisplayName } from "@/lib/courses/display";

function generateVerifyCode(): string {
  return `D8-${randomBytes(5).toString("hex").toUpperCase()}`;
}

export async function issueCourseCertificate(
  enrollmentId: string,
): Promise<{ verifyCode: string; created: boolean } | null> {
  const existing = await db.courseCertificate.findUnique({
    where: { enrollmentId },
    select: { verifyCode: true },
  });
  if (existing) return { verifyCode: existing.verifyCode, created: false };

  const enrollment = await db.courseEnrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      progressPercent: true,
      completedAt: true,
      userId: true,
      user: { select: { email: true } },
      course: {
        select: {
          title: true,
          workloadHours: true,
          instructorUserId: true,
        },
      },
    },
  });
  if (!enrollment || enrollment.progressPercent < 100) return null;

  const instructor = await getInstructorDisplay(enrollment.course.instructorUserId);
  const studentName = await getStudentDisplayName(enrollment.userId);

  let verifyCode = generateVerifyCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const cert = await db.courseCertificate.create({
        data: {
          enrollmentId,
          verifyCode,
          studentName,
          courseTitle: enrollment.course.title,
          instructorName: instructor.name,
          workloadHours: enrollment.course.workloadHours,
        },
      });
      return { verifyCode: cert.verifyCode, created: true };
    } catch (e) {
      const isUnique =
        e &&
        typeof e === "object" &&
        "code" in e &&
        (e as { code: string }).code === "P2002";
      if (!isUnique) throw e;
      verifyCode = generateVerifyCode();
    }
  }
  throw new Error("Failed to generate unique certificate code");
}

export async function getCertificateByCode(verifyCode: string) {
  const normalized = verifyCode.trim().toUpperCase();
  return db.courseCertificate.findUnique({
    where: { verifyCode: normalized },
    select: {
      verifyCode: true,
      studentName: true,
      courseTitle: true,
      instructorName: true,
      workloadHours: true,
      issuedAt: true,
      enrollment: {
        select: {
          completedAt: true,
          course: { select: { slug: true, profession: true } },
        },
      },
    },
  });
}
