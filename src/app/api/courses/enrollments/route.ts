import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getInstructorDisplay, PROFESSION_LABELS } from "@/lib/courses/display";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const enrollments = await db.courseEnrollment.findMany({
    where: { userId: session.user.id },
    orderBy: { enrolledAt: "desc" },
    include: {
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
          shortDescription: true,
          thumbnailKey: true,
          profession: true,
          workloadHours: true,
          instructorUserId: true,
        },
      },
    },
  });

  const rows = await Promise.all(
    enrollments.map(async (e) => {
      const instructor = await getInstructorDisplay(e.course.instructorUserId);
      return {
        id: e.id,
        source: e.source,
        progressPercent: e.progressPercent,
        completedAt: e.completedAt,
        enrolledAt: e.enrolledAt,
        course: {
          ...e.course,
          professionLabel: PROFESSION_LABELS[e.course.profession] ?? e.course.profession,
          instructor,
        },
      };
    }),
  );

  return NextResponse.json({ enrollments: rows });
}
