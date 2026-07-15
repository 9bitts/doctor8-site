export const VOLUNTEER_ATTEND_GUIDE_KEY = "doctor8.volunteerAttendGuide";
const VOLUNTEER_ATTEND_GUIDE_COOKIE = "doctor8.volunteerAttendGuide";
const VOLUNTEER_GUIDE_SEEN_PREFIX = "doctor8.volunteerGuide.seenDate";

function todayLocalDate(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export function volunteerGuideSeenStorageKey(userId: string): string {
  return `${VOLUNTEER_GUIDE_SEEN_PREFIX}.${userId}`;
}

export function hasSeenVolunteerGuideToday(userId: string): boolean {
  if (typeof window === "undefined" || !userId) return false;
  try {
    return localStorage.getItem(volunteerGuideSeenStorageKey(userId)) === todayLocalDate();
  } catch {
    return false;
  }
}

export function markVolunteerGuideSeenToday(userId: string): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(volunteerGuideSeenStorageKey(userId), todayLocalDate());
  } catch {
    /* ignore */
  }
}

export function isVolunteerGuideProviderRole(role: string | undefined | null): boolean {
  return (
    role === "PROFESSIONAL" ||
    role === "PSYCHOANALYST" ||
    role === "INTEGRATIVE_THERAPIST"
  );
}

function setVolunteerGuideCookie(): void {
  document.cookie = `${VOLUNTEER_ATTEND_GUIDE_COOKIE}=1;path=/;max-age=600;SameSite=Lax`;
}

function clearVolunteerGuideCookie(): void {
  document.cookie = `${VOLUNTEER_ATTEND_GUIDE_COOKIE}=;path=/;max-age=0;SameSite=Lax`;
}

function hasVolunteerGuideCookie(): boolean {
  return document.cookie.split(";").some((c) => c.trim().startsWith(`${VOLUNTEER_ATTEND_GUIDE_COOKIE}=1`));
}

export function markVolunteerAttendGuideForLogin(role: string | undefined | null): void {
  if (typeof window === "undefined" || !isVolunteerGuideProviderRole(role)) return;
  try {
    sessionStorage.setItem(VOLUNTEER_ATTEND_GUIDE_KEY, "1");
    setVolunteerGuideCookie();
  } catch {
    /* ignore */
  }
}

export function clearVolunteerAttendGuideFlag(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(VOLUNTEER_ATTEND_GUIDE_KEY);
    clearVolunteerGuideCookie();
  } catch {
    /* ignore */
  }
}

export function shouldShowVolunteerAttendGuide(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(VOLUNTEER_ATTEND_GUIDE_KEY) === "1") return true;
    return hasVolunteerGuideCookie();
  } catch {
    return false;
  }
}

export type VolunteerGuidePaths = {
  profile: string;
  availability: string;
  volunteerPortal: string;
  registerConsult: string;
};

export function volunteerGuidePaths(
  role: string,
  isPsychologistPortal: boolean,
): VolunteerGuidePaths {
  if (role === "PSYCHOANALYST") {
    return {
      profile: "/psychoanalyst/settings",
      availability: "/psychoanalyst/settings/availability",
      volunteerPortal: "/humanitarian/volunteer",
      registerConsult: "/psychoanalyst/analysands",
    };
  }
  if (role === "INTEGRATIVE_THERAPIST") {
    return {
      profile: "/integrative-therapist/settings",
      availability: "/integrative-therapist/settings/availability",
      volunteerPortal: "/humanitarian/volunteer",
      registerConsult: "/integrative-therapist/clients",
    };
  }
  if (isPsychologistPortal) {
    return {
      profile: "/psychologist/settings",
      availability: "/psychologist/settings/availability",
      volunteerPortal: "/humanitarian/volunteer",
      registerConsult: "/psychologist/patients",
    };
  }
  return {
    profile: "/professional/settings",
    availability: "/professional/settings/availability",
    volunteerPortal: "/humanitarian/volunteer",
    registerConsult: "/professional/patients",
  };
}
