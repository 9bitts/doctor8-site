import { UserRole } from "@prisma/client";

export const BUYING_CLUB_ROLES: UserRole[] = ["PATIENT", "PROFESSIONAL"];

export function canUseBuyingClub(role: string | undefined): boolean {
  return role === "PATIENT" || role === "PROFESSIONAL";
}

export function buyingClubPageForRole(role: string | undefined): string {
  return role === "PROFESSIONAL" ? "/professional/buying-club" : "/patient/buying-club";
}

export function buyingClubAccountForRole(role: string | undefined): string {
  return role === "PROFESSIONAL" ? "/professional/account" : "/patient/account";
}
