import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { getInstructorDisplay } from "@/lib/courses/display";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const courses = await db.course.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { enrollments: true, modules: true } },
    },
  });

  const rows = await Promise.all(
    courses.map(async (c) => ({
      ...c,
      instructor: await getInstructorDisplay(c.instructorUserId),
      enrollmentCount: c._count.enrollments,
      moduleCount: c._count.modules,
    })),
  );

  return NextResponse.json({ courses: rows });
}
