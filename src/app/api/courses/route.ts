import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getInstructorDisplayBatch, PROFESSION_LABELS } from "@/lib/courses/display";
import { getSignedReadUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const profession = searchParams.get("profession");
  const q = searchParams.get("q")?.trim();

  const courses = await db.course.findMany({
    where: {
      status: "PUBLISHED",
      ...(profession ? { profession: profession as never } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { shortDescription: { contains: q, mode: "insensitive" } },
              { specialty: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      shortDescription: true,
      thumbnailKey: true,
      profession: true,
      specialty: true,
      priceCents: true,
      currency: true,
      workloadHours: true,
      instructorUserId: true,
      publishedAt: true,
      _count: { select: { enrollments: true } },
    },
  });

  const instructorMap = await getInstructorDisplayBatch(
    courses.map((c) => c.instructorUserId),
  );

  const rows = await Promise.all(
    courses.map(async (c) => {
      const instructor = instructorMap.get(c.instructorUserId) ?? {
        name: "Instrutor",
        specialty: null,
        licenseNumber: null,
      };
      let thumbnailUrl: string | null = null;
      if (c.thumbnailKey) {
        try {
          thumbnailUrl = await getSignedReadUrl(c.thumbnailKey, 3600);
        } catch {
          thumbnailUrl = null;
        }
      }
      return {
        ...c,
        professionLabel: PROFESSION_LABELS[c.profession] ?? c.profession,
        instructor,
        thumbnailUrl,
        enrollmentCount: c._count.enrollments,
      };
    }),
  );

  return NextResponse.json({ courses: rows });
}
