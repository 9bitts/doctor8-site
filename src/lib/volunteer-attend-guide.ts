export const VOLUNTEER_ATTEND_GUIDE_KEY = "doctor8.volunteerAttendGuide";
const VOLUNTEER_ATTEND_GUIDE_COOKIE = "doctor8.volunteerAttendGuide";

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
