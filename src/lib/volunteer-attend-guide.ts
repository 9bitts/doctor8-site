export const VOLUNTEER_ATTEND_GUIDE_KEY = "doctor8.volunteerAttendGuide";

export function isVolunteerGuideProviderRole(role: string | undefined | null): boolean {
  return (
    role === "PROFESSIONAL" ||
    role === "PSYCHOANALYST" ||
    role === "INTEGRATIVE_THERAPIST"
  );
}

export function markVolunteerAttendGuideForLogin(role: string | undefined | null): void {
  if (typeof window === "undefined" || !isVolunteerGuideProviderRole(role)) return;
  try {
    sessionStorage.setItem(VOLUNTEER_ATTEND_GUIDE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearVolunteerAttendGuideFlag(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(VOLUNTEER_ATTEND_GUIDE_KEY);
  } catch {
    /* ignore */
  }
}

export function shouldShowVolunteerAttendGuide(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(VOLUNTEER_ATTEND_GUIDE_KEY) === "1";
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
