import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getInstructorDisplay, PROFESSION_LABELS } from "@/lib/courses/display";
import { getConnectionRedemptionStatus, userHasEnrollment } from "@/lib/courses/access";
import { getSignedReadUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const course = await db.course.findUnique({
    where: { slug: params.slug },
    include: {
      modules: {
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              title: true,
              description: true,
              durationSecs: true,
              sortOrder: true,
              isPreview: true,
              videoUrl: true,
              videoKey: true,
            },
          },
        },
      },
      _count: { select: { enrollments: true } },
    },
  });

  if (!course || (course.status !== "PUBLISHED")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await auth();
  const userId = session?.user?.id;
  const enrolled = userId ? await userHasEnrollment(userId, course.id) : false;
  const connection = userId ? await getConnectionRedemptionStatus(userId) : null;

  const instructor = await getInstructorDisplay(course.instructorUserId);
  let thumbnailUrl: string | null = null;
  if (course.thumbnailKey) {
    try {
      thumbnailUrl = await getSignedReadUrl(course.thumbnailKey, 3600);
    } catch {
      thumbnailUrl = null;
    }
  }

  const lessonCount = course.modules.reduce((n, m) => n + m.lessons.length, 0);
  const totalDurationSecs = course.modules.reduce(
    (n, m) => n + m.lessons.reduce((s, l) => s + (l.durationSecs ?? 0), 0),
    0,
  );

  return NextResponse.json({
    course: {
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      shortDescription: course.shortDescription,
      profession: course.profession,
      professionLabel: PROFESSION_LABELS[course.profession] ?? course.profession,
      specialty: course.specialty,
      priceCents: course.priceCents,
      currency: course.currency,
      workloadHours: course.workloadHours,
      thumbnailUrl,
      instructor,
      modules: await Promise.all(
        course.modules.map(async (m) => ({
          id: m.id,
          title: m.title,
          sortOrder: m.sortOrder,
          lessons: await Promise.all(
            m.lessons.map(async (l) => {
              const canStream = enrolled || l.isPreview;
              let streamUrl: string | null = null;
              if (canStream) {
                streamUrl = l.videoUrl;
                if (l.videoKey) {
                  try {
                    streamUrl = await getSignedReadUrl(l.videoKey, 3600);
                  } catch {
                    streamUrl = l.videoUrl;
                  }
                }
              }
              return {
                id: l.id,
                title: l.title,
                description: l.description,
                durationSecs: l.durationSecs,
                isPreview: l.isPreview,
                hasVideo: !!(l.videoKey || l.videoUrl),
                streamUrl: canStream ? streamUrl : null,
              };
            }),
          ),
        })),
      ),
      lessonCount,
      totalDurationSecs,
      enrollmentCount: course._count.enrollments,
      enrolled,
      connectionBenefit: connection
        ? {
            hasConnection: connection.hasConnection,
            redeemedThisMonth: connection.redeemedThisMonth,
            canRedeem:
              connection.hasConnection &&
              !connection.redeemedThisMonth &&
              !enrolled &&
              course.priceCents > 0,
          }
        : null,
    },
  });
}
