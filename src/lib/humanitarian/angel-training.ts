import { db } from "@/lib/db";
import type { AngelTrack } from "@prisma/client";

export async function hasCompletedTrackTraining(opts: {
  userId: string;
  track: AngelTrack;
}): Promise<{ ok: true } | { ok: false; requiredCourseIds: string[] }> {
  const profile = await db.angelProfile.findUnique({
    where: { userId: opts.userId },
    select: { id: true },
  });
  if (!profile) return { ok: false, requiredCourseIds: [] };

  const exempt = await db.angelTrackTrainingExemption.findUnique({
    where: { profileId_track: { profileId: profile.id, track: opts.track } },
    select: { id: true },
  });
  if (exempt) return { ok: true };

  const reqs = await db.angelTrackTrainingRequirement.findMany({
    where: { track: opts.track, required: true },
    select: { courseId: true },
  });
  const courseIds = reqs.map((r) => r.courseId);
  if (courseIds.length === 0) return { ok: true };

  const completed = await db.courseEnrollment.findMany({
    where: {
      userId: opts.userId,
      courseId: { in: courseIds },
      completedAt: { not: null },
    },
    select: { courseId: true },
  });
  const completedIds = new Set(completed.map((c) => c.courseId));
  const missing = courseIds.filter((c) => !completedIds.has(c));
  if (missing.length === 0) return { ok: true };
  return { ok: false, requiredCourseIds: missing };
}

