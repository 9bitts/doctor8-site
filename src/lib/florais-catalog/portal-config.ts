export type FloraisPortal = "professional" | "integrative-therapist";

export function floraisBasePath(portal: FloraisPortal): string {
  return portal === "professional"
    ? "/professional/florais"
    : "/integrative-therapist/florais";
}

export function detectFloraisPortal(pathname: string): FloraisPortal {
  return pathname.startsWith("/integrative-therapist") ? "integrative-therapist" : "professional";
}
