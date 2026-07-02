import { db } from "@/lib/db";
import {
  accountNeedsProfileCompletion,
  type UserProfileSnapshot,
} from "@/lib/user-profile-complete";

const PROFILE_SELECT = {
  role: true,
  patientProfile: { select: { firstName: true } },
  professionalProfile: { select: { firstName: true } },
  psychoanalystProfile: { select: { firstName: true } },
  integrativeTherapistProfile: { select: { firstName: true } },
} as const;

export async function fetchUserProfileSnapshot(
  userId: string,
): Promise<UserProfileSnapshot | null> {
  return db.user.findUnique({
    where: { id: userId },
    select: PROFILE_SELECT,
  });
}

export async function userNeedsProfileCompletion(userId: string): Promise<boolean> {
  const user = await fetchUserProfileSnapshot(userId);
  if (!user) return false;
  return accountNeedsProfileCompletion(user);
}
