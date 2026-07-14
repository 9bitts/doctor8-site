import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { NextResponse } from "next/server";
import {
  providerKindFromRole,
  resolveLibraryProfessionKey,
} from "./profession";
import type { LibraryOwnerIds, LibraryProviderKind } from "./types";

/** Prisma include fragment for resource share counts/views by provider kind. */
export function resourceShareInclude(kind: LibraryProviderKind) {
  switch (kind) {
    case "psychoanalyst":
      return {
        _count: { select: { analysandShares: true } },
        analysandShares: { select: { viewCount: true } },
      };
    case "integrative":
      return {
        _count: { select: { integrativeShares: true } },
        integrativeShares: { select: { viewCount: true } },
      };
    default:
      return {
        _count: { select: { shares: true } },
        shares: { select: { viewCount: true } },
      };
  }
}

export function shareCountFromRow(
  r: {
    _count?: { shares?: number; analysandShares?: number; integrativeShares?: number };
  },
  kind?: LibraryProviderKind,
): number {
  if (kind === "psychoanalyst") return r._count?.analysandShares ?? 0;
  if (kind === "integrative") return r._count?.integrativeShares ?? 0;
  if (kind === "health") return r._count?.shares ?? 0;
  return (
    (r._count?.shares ?? 0) +
    (r._count?.analysandShares ?? 0) +
    (r._count?.integrativeShares ?? 0)
  );
}

export function viewCountFromRow(
  r: {
    shares?: { viewCount: number }[];
    analysandShares?: { viewCount: number }[];
    integrativeShares?: { viewCount: number }[];
  },
  kind?: LibraryProviderKind,
): number {
  const list =
    kind === "psychoanalyst"
      ? r.analysandShares
      : kind === "integrative"
        ? r.integrativeShares
        : kind === "health"
          ? r.shares
          : [...(r.shares ?? []), ...(r.analysandShares ?? []), ...(r.integrativeShares ?? [])];
  return (list ?? []).reduce((sum, s) => sum + (s.viewCount || 0), 0);
}

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
  kind?: LibraryProviderKind,
) {
  const shareCount = shareCountFromRow(r, kind);
  const viewCount = viewCountFromRow(r, kind);
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
