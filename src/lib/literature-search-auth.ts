// Auth helper for literature search — all provider portal roles.

import { NextResponse } from "next/server";
import { requireAuth, isApiError, type ApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";

export type LiteratureSearchProviderKind =
  | "HEALTH"
  | "PSYCHOANALYST"
  | "INTEGRATIVE_THERAPIST";

export type LiteratureSearchContext = {
  userId: string;
  providerId: string;
  providerKind: LiteratureSearchProviderKind;
};

async function resolveProvider(
  userId: string,
  role: string,
): Promise<LiteratureSearchContext | null> {
  if (role === "PROFESSIONAL" || role === "ADMIN") {
    const profile = await db.professionalProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) return null;
    return { userId, providerId: profile.id, providerKind: "HEALTH" };
  }
  if (role === "PSYCHOANALYST") {
    const profile = await db.psychoanalystProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) return null;
    return { userId, providerId: profile.id, providerKind: "PSYCHOANALYST" };
  }
  if (role === "INTEGRATIVE_THERAPIST") {
    const profile = await db.integrativeTherapistProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) return null;
    return { userId, providerId: profile.id, providerKind: "INTEGRATIVE_THERAPIST" };
  }
  return null;
}

export async function requireLiteratureSearchApi(): Promise<
  LiteratureSearchContext | ApiError
> {
  const ctx = await requireAuth(["PROFESSIONAL", "PSYCHOANALYST", "INTEGRATIVE_THERAPIST"]);
  if (isApiError(ctx)) return ctx;

  const role = ctx.session.user.role;
  const provider = await resolveProvider(ctx.userId, role);
  if (!provider) {
    return { error: NextResponse.json({ error: "No profile" }, { status: 404 }) };
  }
  return provider;
}
