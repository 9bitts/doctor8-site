import { db } from "@/lib/db";
import { sendTransactionalEmail, emailShell, getAppUrl } from "@/lib/email-core";
import { getStudentDisplayName } from "@/lib/courses/display";

export async function sendCourseEnrollmentEmail(params: {
  userId: string;
  courseId: string;
  enrollmentId: string;
}): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: params.userId },
    select: { email: true },
  });
  const course = await db.course.findUnique({
    where: { id: params.courseId },
    select: {
      title: true,
      slug: true,
      modules: { select: { lessons: { select: { id: true } } } },
    },
  });
  if (!user?.email || !course) return;

  const appUrl = getAppUrl();
  const learnUrl = `${appUrl}/professional/courses/learn/${params.enrollmentId}`;
  const courseUrl = `${appUrl}/cursos/${course.slug}`;
  const lessonCount = course.modules.reduce((n, m) => n + m.lessons.length, 0);
  const displayName = await getStudentDisplayName(params.userId);
  const greeting = `Olá, ${displayName.split(" ")[0]}!`;

  const html = emailShell(
    "Matrícula confirmada",
    `
      <p style="font-size:16px;color:#1e293b;margin:0 0 16px;">${greeting}</p>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 20px;">
        Sua matrícula no curso <strong>${course.title}</strong> foi confirmada. Você já pode começar a estudar.
      </p>
      <div style="background:#f8fafc;border-radius:12px;padding:16px 20px;margin:0 0 24px;">
        <p style="margin:0 0 8px;font-size:14px;color:#64748b;">${lessonCount} aula${lessonCount === 1 ? "" : "s"} disponíveis</p>
        <p style="margin:0;font-size:14px;color:#64748b;">Acesse quando quiser, no seu ritmo.</p>
      </div>
      <p style="text-align:center;margin:0 0 12px;">
        <a href="${learnUrl}" style="display:inline-block;background:#0a4d6e;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;">
          Acessar o curso
        </a>
      </p>
      <p style="text-align:center;margin:0;">
        <a href="${courseUrl}" style="color:#64748b;font-size:13px;text-decoration:underline;">Ver página do curso</a>
      </p>
    `,
    "pt",
  );

  await sendTransactionalEmail({
    to: user.email,
    subject: `Matrícula confirmada: ${course.title}`,
    html,
    tag: "course_enrollment",
  });
}
