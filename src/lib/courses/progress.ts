// Recalculate enrollment progress from lesson completions.

import { db } from "@/lib/db";

export async function recalculateEnrollmentProgress(enrollmentId: string): Promise<number> {
  const enrollment = await db.courseEnrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      courseId: true,
      lessonProgress: { where: { completed: true }, select: { id: true } },
      course: {
        select: {
          modules: {
            select: {
              lessons: { select: { id: true } },
            },
          },
        },
      },
    },
  });
  if (!enrollment) return 0;

  const totalLessons = enrollment.course.modules.reduce((n, m) => n + m.lessons.length, 0);
  const completed = enrollment.lessonProgress.length;
  const progressPercent = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
  const completedAt = progressPercent >= 100 ? new Date() : null;

  await db.courseEnrollment.update({
    where: { id: enrollmentId },
    data: { progressPercent, completedAt },
  });

  return progressPercent;
}
