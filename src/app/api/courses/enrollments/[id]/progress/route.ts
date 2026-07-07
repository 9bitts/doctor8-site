import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recalculateEnrollmentProgress } from "@/lib/courses/progress";
import { z } from "zod";

const schema = z.object({
  lessonId: z.string(),
  watchedSecs: z.number().int().min(0).optional(),
  completed: z.boolean().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const enrollment = await db.courseEnrollment.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true },
  });
  if (!enrollment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const lesson = await db.courseLesson.findFirst({
    where: {
      id: parsed.data.lessonId,
      module: { course: { enrollments: { some: { id: params.id } } } },
    },
    select: { id: true },
  });
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const now = new Date();
  const completed = parsed.data.completed === true;

  await db.courseLessonProgress.upsert({
    where: {
      enrollmentId_lessonId: {
        enrollmentId: params.id,
        lessonId: parsed.data.lessonId,
      },
    },
    create: {
      enrollmentId: params.id,
      lessonId: parsed.data.lessonId,
      watchedSecs: parsed.data.watchedSecs ?? 0,
      completed,
      completedAt: completed ? now : null,
    },
    update: {
      ...(parsed.data.watchedSecs != null ? { watchedSecs: parsed.data.watchedSecs } : {}),
      ...(parsed.data.completed != null
        ? { completed, completedAt: completed ? now : null }
        : {}),
    },
  });

  const progressPercent = await recalculateEnrollmentProgress(params.id);
  return NextResponse.json({ progressPercent });
}
