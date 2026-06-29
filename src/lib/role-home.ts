/** Default dashboard path after login for each account role. */
export function resolveRoleHome(role: string | undefined | null): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "PROFESSIONAL":
      return "/professional";
    case "PSYCHOANALYST":
      return "/psychoanalyst";
    case "INTEGRATIVE_THERAPIST":
      return "/integrative-therapist";
    case "ORGANIZATION":
      return "/organization";
    case "ANGEL":
      return "/humanitarian/angel";
    case "PATIENT":
    default:
      return "/patient";
  }
}
