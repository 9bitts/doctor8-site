import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { NextResponse } from "next/server";
import {
  providerKindFromRole,
  resolveLibraryProfessionKey,
} from "./profession";
import type { LibraryOwnerIds, LibraryProviderKind } from "./types";

export function safeDecryptResource(v: string | null | undefined): string {
  if (!v) return "";
  try {
    return decrypt(v);
  } catch {
    return v ?? "";
  }
}

export type LibraryAuthContext =
  | {
      ok: true;
      userId: string;
      role: string;
      owner: LibraryOwnerIds;
    }
  | { ok: false; error: NextResponse };

export async function requireLibraryAuth(): Promise<LibraryAuthContext> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const role = session.user.role;
  const kind = providerKindFromRole(role);

  if (kind === "health") {
    if (role !== "PROFESSIONAL") {
      return { ok: false, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
    const professional = await db.professionalProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!professional) {
      return { ok: false, error: NextResponse.json({ error: "No profile" }, { status: 404 }) };
    }
    return {
      ok: true,
      userId: session.user.id,
      role,
      owner: {
        kind: "health",
        professionalId: professional.id,
        specialty: professional.specialty,
        professionKey: resolveLibraryProfessionKey({
          role,
          specialty: professional.specialty,
        }),
      },
    };
  }

  if (kind === "psychoanalyst") {
    if (role !== "PSYCHOANALYST") {
      return { ok: false, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
    const psychoanalyst = await db.psychoanalystProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!psychoanalyst) {
      return { ok: false, error: NextResponse.json({ error: "No profile" }, { status: 404 }) };
    }
    return {
      ok: true,
      userId: session.user.id,
      role,
      owner: {
        kind: "psychoanalyst",
        psychoanalystId: psychoanalyst.id,
        professionKey: "psychoanalyst",
      },
    };
  }

  if (kind === "integrative") {
    if (role !== "INTEGRATIVE_THERAPIST") {
      return { ok: false, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
    const integrative = await db.integrativeTherapistProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!integrative) {
      return { ok: false, error: NextResponse.json({ error: "No profile" }, { status: 404 }) };
    }
    return {
      ok: true,
      userId: session.user.id,
      role,
      owner: {
        kind: "integrative",
        integrativeTherapistId: integrative.id,
        professionKey: "integrative_therapist",
      },
    };
  }

  return { ok: false, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
}

export function resourceOwnerWhere(owner: LibraryOwnerIds) {
  if (owner.professionalId) return { professionalId: owner.professionalId };
  if (owner.psychoanalystId) return { psychoanalystId: owner.psychoanalystId };
  if (owner.integrativeTherapistId) return { integrativeTherapistId: owner.integrativeTherapistId };
  return {};
}

export function collectionOwnerWhere(owner: LibraryOwnerIds) {
  return resourceOwnerWhere(owner);
}

export function apiBaseForKind(kind: LibraryProviderKind): string {
  switch (kind) {
    case "psychoanalyst":
      return "/api/psychoanalyst";
    case "integrative":
      return "/api/integrative-therapist";
    default:
      return "/api/professional";
  }
}

export function mapResourceRow(
  r: {
    id: string;
    title: string;
    content: string | null;
    url: string | null;
    fileUrl: string | null;
    category: string;
    contentType: string;
    collectionId: string | null;
    sourcePackId: string | null;
    createdAt: Date;
    updatedAt: Date;
    collection?: { title: string } | null;
    _count?: { shares?: number; analysandShares?: number; integrativeShares?: number };
    shares?: { viewCount: number }[];
    analysandShares?: { viewCount: number }[];
    integrativeShares?: { viewCount: number }[];
  },
) {
  const shareCount =
    r._count?.shares ?? r._count?.analysandShares ?? r._count?.integrativeShares ?? 0;
  const shareList = r.shares ?? r.analysandShares ?? r.integrativeShares ?? [];
  const viewCount = shareList.reduce((sum, s) => sum + (s.viewCount || 0), 0);
  return {
    id: r.id,
    title: safeDecryptResource(r.title),
    content: safeDecryptResource(r.content) || null,
    url: r.url,
    hasFile: !!r.fileUrl,
    contentType: r.contentType as import("./types").ResourceContentType,
    category: r.category as import("./types").ResourceCategory,
    collectionId: r.collectionId,
    collectionTitle: r.collection ? safeDecryptResource(r.collection.title) : null,
    sourcePackId: r.sourcePackId,
    shareCount,
    viewCount,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}
