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
  getAcceptedLinkMap,
  maskPatientDisplayName,
  type LinkStatus,
} from "@/lib/patient-professional-link";

const PLATFORM_MIN_CHARS = 3;
const PLATFORM_MAX_RESULTS = 10;
const PLATFORM_SCAN_LIMIT = 300;

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

function normText(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

function matchesPlatformQuery(
  q: string,
  firstName: string,
  lastName: string,
  email: string | null,
  phone: string | null,
): boolean {
  const nq = normText(q);
  const full = normText(`${firstName} ${lastName}`.trim());
  if (full.includes(nq) || normText(firstName).includes(nq) || normText(lastName).includes(nq)) {
    return true;
  }
  if (email && normText(email).includes(nq)) return true;
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    const qDigits = q.replace(/\D/g, "");
    if (qDigits.length >= 3 && digits.includes(qDigits)) return true;
  }
  return false;
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
    where: { sharedWithProfessionalId: ctx.professional.id },
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
      limit: 30,
      windowMs: 60 * 60 * 1000,
    });
    if (!rate.allowed) {
      return rateLimitResponse(rate.retryAfterSec);
    }

    const profiles = await db.patientProfile.findMany({
      include: {
        user: { select: { email: true, role: true } },
      },
      take: PLATFORM_SCAN_LIMIT,
      orderBy: { updatedAt: "desc" },
    });

    const candidates: {
      profile: (typeof profiles)[0];
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
    }[] = [];

    for (const p of profiles) {
      if (p.user?.role !== "PATIENT") continue;
      if (alreadyHasChart(p)) continue;
      const firstName = safeDecrypt(p.firstName);
      const lastName = safeDecrypt(p.lastName);
      const email = p.user?.email ?? null;
      const phone = p.phone ? safeDecrypt(p.phone) : null;
      if (!matchesPlatformQuery(q, firstName, lastName, email, phone)) continue;
      candidates.push({ profile: p, firstName, lastName, email, phone });
    }

    const limited = candidates.slice(0, PLATFORM_MAX_RESULTS);
    const userIds = limited.map((c) => c.profile.userId);
    const linkMap = await getAcceptedLinkMap(ctx.userId, userIds);

    platformMatches = limited.map(({ profile, firstName, lastName }) => {
      const linkStatus = linkMap.get(profile.userId) ?? "NONE";
      return {
        patientProfileId: profile.id,
        patientUserId: profile.userId,
        displayName: maskPatientDisplayName(firstName, lastName),
        city: profile.city || null,
        hasLink: linkStatus === "ACCEPTED",
        linkStatus,
      };
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
