import type { AngelAvailabilityStatus, AngelTrack } from "@prisma/client";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";
import { isProfilePaused } from "@/lib/humanitarian/angel-missions";

function randomId(): string {
  return randomBytes(16).toString("hex");
}

export function resolveAngelClaimLimit(weeklyCapacity: number | null | undefined, globalMax: number): number {
  if (weeklyCapacity == null || weeklyCapacity <= 0) return globalMax;
  return Math.min(weeklyCapacity, globalMax);
}

export type AngelProfilePayload = {
  firstName: string;
  lastName: string;
  phone: string | null;
  profession: string | null;
  languages: string[];
  skills: string[];
  city: string | null;
  hasVehicle: boolean;
  availabilityNote: string | null;
  availabilityStatus: AngelAvailabilityStatus;
  pausedUntil: string | null;
  weeklyCapacity: number | null;
  trackEnrollments: { track: AngelTrack; status: string }[];
  isPaused: boolean;
};

export async function getAngelProfilePayload(userId: string): Promise<AngelProfilePayload | null> {
  const profile = await db.angelProfile.findUnique({
    where: { userId },
    include: { trackEnrollments: true },
  });
  if (!profile) return null;

  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
    profession: profile.profession,
    languages: profile.languages,
    skills: profile.skills,
    city: profile.city,
    hasVehicle: profile.hasVehicle,
    availabilityNote: profile.availabilityNote,
    availabilityStatus: profile.availabilityStatus,
    pausedUntil: profile.pausedUntil?.toISOString() ?? null,
    weeklyCapacity: profile.weeklyCapacity,
    trackEnrollments: profile.trackEnrollments.map((e) => ({
      track: e.track,
      status: e.status,
    })),
    isPaused: isProfilePaused(profile.availabilityStatus, profile.pausedUntil),
  };
}

export async function updateAngelProfile(
  userId: string,
  data: {
    languages?: string[];
    skills?: string[];
    city?: string | null;
    hasVehicle?: boolean;
    availabilityNote?: string | null;
    availabilityStatus?: AngelAvailabilityStatus;
    pausedUntil?: string | null;
    weeklyCapacity?: number | null;
    requestTracks?: AngelTrack[];
  },
): Promise<AngelProfilePayload | null> {
  const profile = await db.angelProfile.findUnique({ where: { userId } });
  if (!profile) return null;

  await db.$transaction(async (tx) => {
    await tx.angelProfile.update({
      where: { id: profile.id },
      data: {
        ...(data.languages !== undefined ? { languages: data.languages } : {}),
        ...(data.skills !== undefined ? { skills: data.skills } : {}),
        ...(data.city !== undefined ? { city: data.city } : {}),
        ...(data.hasVehicle !== undefined ? { hasVehicle: data.hasVehicle } : {}),
        ...(data.availabilityNote !== undefined ? { availabilityNote: data.availabilityNote } : {}),
        ...(data.availabilityStatus !== undefined ? { availabilityStatus: data.availabilityStatus } : {}),
        ...(data.pausedUntil !== undefined
          ? { pausedUntil: data.pausedUntil ? new Date(data.pausedUntil) : null }
          : {}),
        ...(data.weeklyCapacity !== undefined ? { weeklyCapacity: data.weeklyCapacity } : {}),
      },
    });

    if (data.requestTracks?.length) {
      for (const track of data.requestTracks) {
        const existing = await tx.angelTrackEnrollment.findUnique({
          where: { profileId_track: { profileId: profile.id, track } },
        });
        if (!existing) {
          await tx.angelTrackEnrollment.create({
            data: {
              id: randomId(),
              profileId: profile.id,
              track,
              status: "INTERESTED",
            },
          });
        } else if (existing.status === "REVOKED") {
          await tx.angelTrackEnrollment.update({
            where: { id: existing.id },
            data: { status: "INTERESTED" },
          });
        }
      }
    }
  });

  return getAngelProfilePayload(userId);
}
