// GET ? search patient charts + patients who can be imported (appointments, shares, e-mail).
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { filterPatientCharts } from "@/lib/patient-chart-search";

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
  patientProfileId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  hasAccount: true;
  source: "appointment" | "shared" | "email" | "platform";
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
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!professional) return NextResponse.json({ records: [], importable: [] });

  const q = (req.nextUrl.searchParams.get("q") || "").trim();

  const recordsRaw = await db.patientRecord.findMany({
    where: { professionalId: professional.id },
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
    where: { professionalId: professional.id },
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
    where: { sharedWithProfessionalId: professional.id },
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

  if (q.includes("@")) {
    const user = await db.user.findFirst({
      where: { email: { contains: q.toLowerCase(), mode: "insensitive" }, role: "PATIENT" },
      include: { patientProfile: { include: { user: { select: { email: true } } } } },
    });
    if (user?.patientProfile && !alreadyHasChart(user.patientProfile)) {
      importableMap.set(user.patientProfile.id, toImportable(user.patientProfile, "email"));
    }
  } else if (q.length >= 2) {
    const profiles = await db.patientProfile.findMany({
      include: { user: { select: { email: true } } },
      take: 500,
    });
    const searchable = profiles
      .filter((p) => p.user?.email && !alreadyHasChart(p))
      .map((p) => {
        const item = toImportable(p, "platform");
        return { ...item, id: item.patientProfileId };
      });
    for (const match of filterPatientCharts(searchable, q, 12)) {
      importableMap.set(match.patientProfileId, {
        patientProfileId: match.patientProfileId,
        userId: match.userId,
        firstName: match.firstName,
        lastName: match.lastName,
        email: match.email,
        hasAccount: true,
        source: "platform",
      });
    }
  }

  const importableAll = Array.from(importableMap.values());
  const importable = q
    ? filterPatientCharts(importableAll, q, importableAll.length)
    : importableAll.slice(0, 8);

  return NextResponse.json({ records: filteredRecords, importable });
}
