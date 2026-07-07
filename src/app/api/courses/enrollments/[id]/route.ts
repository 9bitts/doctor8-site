import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEnrollmentForUser } from "@/lib/courses/access";
import { getSignedReadUrl } from "@/lib/s3";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const enrollment = await db.courseEnrollment.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      lessonProgress: true,
      course: {
        include: {
          modules: {
            orderBy: { sortOrder: "asc" },
            include: {
              lessons: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
      },
    },
  });
  if (!enrollment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const progressByLesson = Object.fromEntries(
    enrollment.lessonProgress.map((p) => [p.lessonId, p]),
  );

  const modules = await Promise.all(
    enrollment.course.modules.map(async (m) => ({
      id: m.id,
      title: m.title,
      sortOrder: m.sortOrder,
      lessons: await Promise.all(
        m.lessons.map(async (l) => {
          let streamUrl: string | null = l.videoUrl;
          if (l.videoKey) {
            try {
              streamUrl = await getSignedReadUrl(l.videoKey, 7200);
            } catch {
              streamUrl = null;
            }
          }
          const prog = progressByLesson[l.id];
          return {
            id: l.id,
            title: l.title,
            description: l.description,
            durationSecs: l.durationSecs,
            isPreview: l.isPreview,
            streamUrl,
            progress: prog
              ? {
                  watchedSecs: prog.watchedSecs,
                  completed: prog.completed,
                  completedAt: prog.completedAt,
                }
              : null,
          };
        }),
      ),
    })),
  );

  return NextResponse.json({
    enrollment: {
      id: enrollment.id,
      progressPercent: enrollment.progressPercent,
      completedAt: enrollment.completedAt,
      source: enrollment.source,
      course: {
        id: enrollment.course.id,
        slug: enrollment.course.slug,
        title: enrollment.course.title,
        workloadHours: enrollment.course.workloadHours,
      },
      modules,
    },
  });
}
