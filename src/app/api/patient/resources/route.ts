// Materials shared by health professionals, psychoanalysts, and integrative therapists.

import { NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try {
    return decrypt(v);
  } catch {
    return v ?? "";
  }
}

type PatientResourceRow = {
  id: string;
  resourceId: string;
  title: string;
  contentPreview: string | null;
  fullContent: string | null;
  url: string | null;
  hasFile: boolean;
  sharedAt: Date;
  provider: { name: string; specialty: string };
  viewedAt: string | null;
  viewCount: number;
  source: "health" | "analysand" | "integrative";
};

export async function GET() {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;
  const { userId } = ctx;

  const [shares, analysandShares, integrativeShares] = await Promise.all([
    db.resourceShare.findMany({
      where: {
        patientRecord: { linkedUserId: userId },
        resource: { active: true },
      },
      include: {
        resource: {
          include: {
            professional: { select: { firstName: true, lastName: true, specialty: true } },
          },
        },
      },
      orderBy: { sharedAt: "desc" },
      take: 100,
    }),
    db.analysandResourceShare.findMany({
      where: {
        analysandRecord: { linkedUserId: userId },
        resource: { active: true },
      },
      include: {
        resource: {
          include: {
            psychoanalyst: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { sharedAt: "desc" },
      take: 100,
    }),
    db.integrativeResourceShare.findMany({
      where: {
        integrativeClientRecord: { linkedUserId: userId },
        resource: { active: true },
      },
      include: {
        resource: {
          include: {
            integrativeTherapist: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { sharedAt: "desc" },
      take: 100,
    }),
  ]);

  const fromProfessional: PatientResourceRow[] = shares
    .filter((s) => s.resource.professional)
    .map((s) => {
      const pro = s.resource.professional!;
      const content = safeDecrypt(s.resource.content);
      return {
        id: s.id,
        resourceId: s.resourceId,
        title: safeDecrypt(s.resource.title),
        contentPreview: content.slice(0, 300) || null,
        fullContent: content || null,
        url: s.resource.url || null,
        hasFile: !!s.resource.fileUrl,
        sharedAt: s.sharedAt,
        provider: {
          name: `${pro.firstName} ${pro.lastName}`.trim(),
          specialty: pro.specialty || "",
        },
        viewedAt: s.viewedAt?.toISOString() ?? null,
        viewCount: s.viewCount,
        source: "health" as const,
      };
    });

  const fromAnalysand: PatientResourceRow[] = analysandShares
    .filter((s) => s.resource.psychoanalyst)
    .map((s) => {
      const pro = s.resource.psychoanalyst!;
      const content = safeDecrypt(s.resource.content);
      return {
        id: s.id,
        resourceId: s.resourceId,
        title: safeDecrypt(s.resource.title),
        contentPreview: content.slice(0, 300) || null,
        fullContent: content || null,
        url: s.resource.url || null,
        hasFile: !!s.resource.fileUrl,
        sharedAt: s.sharedAt,
        provider: {
          name: `${pro.firstName} ${pro.lastName}`.trim(),
          specialty: "Psychoanalyst",
        },
        viewedAt: s.viewedAt?.toISOString() ?? null,
        viewCount: s.viewCount,
        source: "analysand" as const,
      };
    });

  const fromIntegrative: PatientResourceRow[] = integrativeShares
    .filter((s) => s.resource.integrativeTherapist)
    .map((s) => {
      const pro = s.resource.integrativeTherapist!;
      const content = safeDecrypt(s.resource.content);
      return {
        id: s.id,
        resourceId: s.resourceId,
        title: safeDecrypt(s.resource.title),
        contentPreview: content.slice(0, 300) || null,
        fullContent: content || null,
        url: s.resource.url || null,
        hasFile: !!s.resource.fileUrl,
        sharedAt: s.sharedAt,
        provider: {
          name: `${pro.firstName} ${pro.lastName}`.trim(),
          specialty: "Integrative Therapist",
        },
        viewedAt: s.viewedAt?.toISOString() ?? null,
        viewCount: s.viewCount,
        source: "integrative" as const,
      };
    });

  const resources = [...fromProfessional, ...fromAnalysand, ...fromIntegrative].sort(
    (a, b) => new Date(b.sharedAt).getTime() - new Date(a.sharedAt).getTime(),
  );

  return NextResponse.json({ resources });
}
