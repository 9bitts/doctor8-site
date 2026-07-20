// GET — search patient charts + importable (appointments/shares) + minimal platform matches.
import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { filterPatientCharts } from "@/lib/patient-chart-search";
import { createAuditLog } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import {
  type LinkStatus,
} from "@/lib/patient-professional-link";
import {
  PLATFORM_MIN_CHARS,
  searchPlatformPatients,
} from "@/lib/platform-patient-search";

function safeDecrypt(v: string | null | undefined): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return String(v); }
}

function decryptDob(raw: unknown): string | null {
  if (!raw) return null;
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  if (typeof raw === "string") {
    try { return decrypt(raw); } catch { return raw; }
  }
  return null;
}

function computeMissingForRx(r: {
  firstName: string;
  lastName: string;
  dobDecrypted: string | null;
  addressLine1: string | null;
  city: string | null;
}): string[] {
  const missing: string[] = [];
  if (!(r.firstName && r.lastName)) missing.push("name");
  if (!(r.addressLine1 || r.city)) missing.push("address");
  if (!r.dobDecrypted) missing.push("dob");
  return missing;
}

type Importable = {
  id: string;
  patientProfileId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  hasAccount: true;
  source: "appointment" | "shared" | "email";
};

type PlatformMatch = {
  patientProfileId: string;
  patientUserId: string;
  displayName: string;
  city: string | null;
  hasLink: boolean;
  linkStatus: LinkStatus | "NONE";
};

function toImportable(
  profile: {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    user: { email: string | null } | null;
  },
  source: Importable["source"],
): Importable {
  return {
    id: profile.id,
    patientProfileId: profile.id,
    userId: profile.userId,
    firstName: safeDecrypt(profile.firstName),
    lastName: safeDecrypt(profile.lastName),
    email: profile.user?.email ?? null,
    hasAccount: true,
    source,
  };
}

export async function GET(req: NextRequest) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const professional = await db.professionalProfile.findUnique({
    where: { userId: ctx.userId },
  });
  if (!professional) {
    return NextResponse.json({ records: [], importable: [], platformMatches: [] });
  }

  const q = (req.nextUrl.searchParams.get("q") || "").trim();

  const recordsRaw = await db.patientRecord.findMany({
    where: { professionalId: ctx.professional.id },
    orderBy: { updatedAt: "desc" },
  });

  const records = recordsRaw.map((r) => {
    const firstName = safeDecrypt(r.firstName);
    const lastName = safeDecrypt(r.lastName);
    const dobDecrypted = decryptDob((r as { dateOfBirth?: unknown }).dateOfBirth);
    return {
      id: r.id,
      firstName,
      lastName,
      email: r.email || null,
      linkedUserId: r.linkedUserId,
      hasAccount: !!r.linkedUserId,
      missingForRx: computeMissingForRx({
        firstName,
        lastName,
        dobDecrypted,
        addressLine1: r.addressLine1 ? safeDecrypt(r.addressLine1) : null,
        city: r.city || null,
      }),
    };
  });

  const filteredRecords = q ? filterPatientCharts(records, q, records.length) : records.slice(0, 8);

  const linkedUserIds = new Set(
    recordsRaw.map((r) => r.linkedUserId).filter((id): id is string => !!id),
  );
  const linkedEmails = new Set(
    recordsRaw.map((r) => (r.email || "").toLowerCase()).filter(Boolean),
  );

  function alreadyHasChart(profile: { userId: string; user: { email: string | null } | null }): boolean {
    if (linkedUserIds.has(profile.userId)) return true;
    const email = profile.user?.email?.toLowerCase();
    return !!email && linkedEmails.has(email);
  }

  const importableMap = new Map<string, Importable>();

  const appointments = await db.appointment.findMany({
    where: { professionalId: ctx.professional.id },
    select: { patientId: true },
    distinct: ["patientId"],
  });
  const appointmentProfileIds = appointments.map((a) => a.patientId);

  if (appointmentProfileIds.length > 0) {
    const profiles = await db.patientProfile.findMany({
      where: { id: { in: appointmentProfileIds } },
      include: { user: { select: { email: true } } },
    });
    for (const p of profiles) {
      if (alreadyHasChart(p)) continue;
      importableMap.set(p.id, toImportable(p, "appointment"));
    }
  }

  const shares = await db.sharedRecord.findMany({
    where: {
      sharedWithProfessionalId: ctx.professional.id,
      heldUntilLinkAccepted: false,
      revokedAt: null,
    },
    select: { patientId: true },
    distinct: ["patientId"],
  });
  const sharedProfileIds = shares.map((s) => s.patientId).filter((id) => !appointmentProfileIds.includes(id));

  if (sharedProfileIds.length > 0) {
    const profiles = await db.patientProfile.findMany({
      where: { id: { in: sharedProfileIds } },
      include: { user: { select: { email: true } } },
    });
    for (const p of profiles) {
      if (alreadyHasChart(p)) continue;
      importableMap.set(p.id, toImportable(p, "shared"));
    }
  }

  let platformMatches: PlatformMatch[] = [];

  if (q.length >= PLATFORM_MIN_CHARS) {
    const rate = await checkRateLimit({
      namespace: "phi-platform-search",
      key: ctx.userId,
      limit: 60,
      windowMs: 60 * 60 * 1000,
    });
    if (!rate.allowed) {
      return rateLimitResponse(rate.retryAfterSec);
    }

    platformMatches = await searchPlatformPatients({
      q,
      professionalUserId: ctx.userId,
      excludeUserIds: linkedUserIds,
      excludeEmails: linkedEmails,
    });

    console.log(
      "[PHI-SEARCH-AUDIT]",
      JSON.stringify({
        professionalUserId: ctx.userId,
        termLength: q.length,
        resultCount: platformMatches.length,
        at: new Date().toISOString(),
      }),
    );

    await createAuditLog({
      userId: ctx.userId,
      action: AuditAction.VIEW_RECORD,
      resource: "PlatformPatientSearch",
      resourceId: ctx.professional.id,
      details: { termLength: q.length, resultCount: platformMatches.length },
    });
  }

  const importableAll = Array.from(importableMap.values());
  const importable = q
    ? filterPatientCharts(importableAll, q, importableAll.length)
    : importableAll.slice(0, 8);

  return NextResponse.json({ records: filteredRecords, importable, platformMatches });
}
