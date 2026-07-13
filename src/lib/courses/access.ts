// Course marketplace access: instructor approval, Doctor Connection benefit, enrollment checks.

import { db } from "@/lib/db";
import { isClubPriceId } from "@/lib/stripe-payment-methods";
import type { CourseEnrollmentSource } from "@prisma/client";

const PROVIDER_ROLES = new Set([
  "PROFESSIONAL",
  "PSYCHOANALYST",
  "INTEGRATIVE_THERAPIST",
]);

export function isProviderRole(role: string): boolean {
  return PROVIDER_ROLES.has(role);
}

export async function isCourseCreator(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { courseCreatorApproved: true, role: true },
  });
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return user.courseCreatorApproved === true;
}

export async function hasActiveDoctorConnection(userId: string): Promise<boolean> {
  const sub = await db.subscription.findUnique({
    where: { userId },
    select: { status: true, stripePriceId: true },
  });
  if (!sub || !["active", "trialing"].includes(sub.status)) return false;
  if (isClubPriceId(sub.stripePriceId)) return false;
  return true;
}

export function currentPeriodMonth(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function getConnectionRedemptionStatus(userId: string): Promise<{
  hasConnection: boolean;
  periodMonth: string;
  redeemedThisMonth: boolean;
  redeemedCourseId: string | null;
}> {
  const periodMonth = currentPeriodMonth();
  const hasConnection = await hasActiveDoctorConnection(userId);
  const redemption = await db.courseConnectionRedemption.findUnique({
    where: { userId_periodMonth: { userId, periodMonth } },
    select: { courseId: true },
  });
  return {
    hasConnection,
    periodMonth,
    redeemedThisMonth: !!redemption,
    redeemedCourseId: redemption?.courseId ?? null,
  };
}

export async function userHasEnrollment(userId: string, courseId: string): Promise<boolean> {
  const row = await db.courseEnrollment.findUnique({
    where: { courseId_userId: { courseId, userId } },
    select: { id: true },
  });
  return !!row;
}

export async function getEnrollmentForUser(userId: string, courseId: string) {
  return db.courseEnrollment.findUnique({
    where: { courseId_userId: { courseId, userId } },
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
}

export const DEFAULT_PLATFORM_COMMISSION_PERCENT = Number(
  process.env.COURSE_PLATFORM_COMMISSION_PERCENT || "15",
);

export function splitCourseRevenue(
  amountCents: number,
  commissionPercent: number,
): { platformFeeCents: number; instructorPayoutCents: number } {
  const platformFeeCents = Math.round((amountCents * commissionPercent) / 100);
  return {
    platformFeeCents,
    instructorPayoutCents: amountCents - platformFeeCents,
  };
}

export type CourseEnrollmentSourceLabel = CourseEnrollmentSource;
