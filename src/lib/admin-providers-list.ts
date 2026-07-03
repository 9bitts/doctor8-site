import { db } from "@/lib/db";
import { buildPublicProfileUrl } from "@/lib/public-slugs";
import {
  resolveAdminTabForProfessional,
  angelMatchesAdminTab,
  type AdminProviderTab,
} from "@/lib/admin-provider-categories";
import { parseAvailabilityJson } from "@/lib/availability-exceptions";

export type AdminAngelRow = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  emailVerified: boolean;
  profession: string | null;
  volunteerHelp: string | null;
  motivation: string | null;
  languages: string[];
  approvalStatus: string;
  licenseDocCount: number;
  hasPhone: boolean;
  createdAt: string;
};

export type AdminProfessionalRow = {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  region: string | null;
  specialty: string;
  licenseNumber: string;
  licenseCountry: string;
  verified: boolean;
  emailVerified: boolean;
  appointments: number;
  charts: number;
  publicUrl: string | null;
  isPublic: boolean;
  licenseDocCount: number;
  adminTab: AdminProviderTab;
  hasVolunteerBlocks: boolean;
  volunteerScheduledApproved: boolean;
  volunteerScheduledApprovedAt: string | null;
};

export type AdminProviderRow = {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  region: string | null;
  subtitle: string;
  verified: boolean;
  emailVerified: boolean;
  appointments: number;
  charts: number;
  publicUrl: string | null;
  isPublic: boolean;
  licenseDocCount: number;
  hasVolunteerBlocks: boolean;
  volunteerScheduledApproved: boolean;
  volunteerScheduledApprovedAt: string | null;
};

export type AdminIncompleteSignupRow = {
  userId: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  hasGoogleAccount: boolean;
};

export type AdminProvidersPayload = {
  angels: AdminAngelRow[];
  doctors: AdminProfessionalRow[];
  psychoanalysts: AdminProviderRow[];
  integrativeTherapists: AdminProviderRow[];
  incompleteSignups: AdminIncompleteSignupRow[];
  pendingCounts: Record<AdminProviderTab, number>;
  queryErrors?: string[];
};

const ADMIN_PROVIDER_TAB_IDS: AdminProviderTab[] = [
  "pendentes",
  "incompletos",
  "todos",
  "medicos",
  "psicologos",
  "nutricionistas",
  "fisioterapeutas",
  "psicanalistas",
  "terapeutas",
  "anjos",
  "outros",
];

const ACTIVE_USER = { deletedAt: null } as const;

type RawAdminRows = {
  allAngels: AdminAngelRow[];
  allDoctors: AdminProfessionalRow[];
  allAnalysts: AdminProviderRow[];
  allTherapists: AdminProviderRow[];
  incompleteSignups: AdminIncompleteSignupRow[];
  queryErrors: string[];
};

async function loadIncompleteProfessionalSignups(): Promise<AdminIncompleteSignupRow[]> {
  const users = await db.user.findMany({
    where: {
      deletedAt: null,
      OR: [
        { role: "PROFESSIONAL", professionalProfile: null },
        { role: "PSYCHOANALYST", psychoanalystProfile: null },
        { role: "INTEGRATIVE_THERAPIST", integrativeTherapistProfile: null },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      accounts: {
        where: { provider: "google" },
        select: { id: true },
        take: 1,
      },
    },
  });

  return users.map((u) => ({
    userId: u.id,
    email: u.email,
    name: null,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    hasGoogleAccount: u.accounts.length > 0,
  }));
}

function angelsForTab(allAngels: AdminAngelRow[], tab: AdminProviderTab): AdminAngelRow[] {
  if (tab === "anjos" || tab === "todos") return allAngels;
  if (tab === "pendentes") {
    return allAngels.filter((a) => a.approvalStatus === "PENDING");
  }
  return allAngels.filter((a) => angelMatchesAdminTab(a, tab));
}

function matchesTab(tab: AdminProviderTab, specialty: string, licenseNumber?: string): boolean {
  if (tab === "pendentes" || tab === "incompletos" || tab === "anjos" || tab === "todos") return false;
  return resolveAdminTabForProfessional(specialty, licenseNumber) === tab;
}

async function safeQuery<T>(
  label: string,
  fn: () => Promise<T>,
  fallback: T,
  errors: string[],
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[listAdminProviders] ${label} failed:`, error);
    errors.push(`${label}: ${msg}`);
    return fallback;
  }
}

async function loadRawAdminRows(): Promise<RawAdminRows> {
  const queryErrors: string[] = [];

  const [angelRows, healthPros, analysts, therapists, incompleteSignups] = await Promise.all([
    safeQuery(
      "angelProfile",
      () =>
        db.angelProfile.findMany({
          where: { user: ACTIVE_USER },
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: {
                email: true,
                emailVerified: true,
                _count: { select: { providerLicenseDocuments: true } },
              },
            },
          },
        }),
      [],
      queryErrors,
    ),
    safeQuery(
      "professionalProfile",
      () =>
        db.professionalProfile.findMany({
          where: { user: ACTIVE_USER },
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: {
                email: true,
                region: true,
                emailVerified: true,
                _count: { select: { providerLicenseDocuments: true } },
              },
            },
            virtualCard: true,
            _count: { select: { appointments: true, patientRecords: true } },
          },
        }),
      [],
      queryErrors,
    ),
    safeQuery(
      "psychoanalystProfile",
      () =>
        db.psychoanalystProfile.findMany({
          where: { user: ACTIVE_USER },
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: {
                email: true,
                region: true,
                emailVerified: true,
                _count: { select: { providerLicenseDocuments: true } },
              },
            },
            virtualCard: true,
            availabilitySlots: {
              where: { isActive: true, volunteerOnly: true },
              select: { id: true },
              take: 1,
            },
            _count: { select: { appointments: true, analysandRecords: true } },
          },
        }),
      [],
      queryErrors,
    ),
    safeQuery(
      "integrativeTherapistProfile",
      () =>
        db.integrativeTherapistProfile.findMany({
          where: { user: ACTIVE_USER },
          orderBy: { createdAt: "desc" },
          include: {
            virtualCard: { select: { isPublic: true, slug: true } },
            user: {
              select: {
                email: true,
                region: true,
                emailVerified: true,
                _count: { select: { providerLicenseDocuments: true } },
              },
            },
            _count: { select: { appointments: true, clientRecords: true } },
          },
        }),
      [],
      queryErrors,
    ),
    safeQuery(
      "incompleteSignups",
      () => loadIncompleteProfessionalSignups(),
      [],
      queryErrors,
    ),
  ]);

  const allAngels: AdminAngelRow[] = angelRows.map((a) => ({
    userId: a.userId,
    firstName: a.firstName,
    lastName: a.lastName,
    email: a.user.email,
    emailVerified: !!a.user.emailVerified,
    profession: a.profession,
    volunteerHelp: a.volunteerHelp,
    motivation: a.motivation,
    languages: a.languages,
    approvalStatus: a.approvalStatus,
    licenseDocCount: a.user._count.providerLicenseDocuments,
    hasPhone: Boolean(a.phone),
    createdAt: a.createdAt.toISOString(),
  }));

  const allDoctors: AdminProfessionalRow[] = healthPros.map((p) => {
    const volunteerBlocks = parseAvailabilityJson(
      (p as { availability?: unknown }).availability,
    ).volunteerBlocks ?? [];
    const row = p as typeof p & {
      availability?: unknown;
      volunteerScheduledApproved?: boolean;
      volunteerScheduledApprovedAt?: Date | null;
    };
    return {
    id: p.id,
    userId: p.userId,
    name: `${p.firstName} ${p.lastName}`.trim(),
    email: p.user?.email ?? null,
    region: p.user?.region ?? null,
    specialty: p.specialty,
    licenseNumber: p.licenseNumber,
    licenseCountry: p.licenseCountry,
    verified: p.verified,
    emailVerified: !!p.user?.emailVerified,
    appointments: p._count.appointments,
    charts: p._count.patientRecords,
    isPublic: p.virtualCard?.isPublic ?? false,
    licenseDocCount: p.user?._count.providerLicenseDocuments ?? 0,
    adminTab: resolveAdminTabForProfessional(p.specialty, p.licenseNumber),
    publicUrl:
      p.verified && p.virtualCard?.isPublic && p.virtualCard.specialtySlug && p.virtualCard.citySlug
        ? buildPublicProfileUrl(p.virtualCard)
        : null,
    hasVolunteerBlocks: volunteerBlocks.length > 0,
    volunteerScheduledApproved: row.volunteerScheduledApproved ?? false,
    volunteerScheduledApprovedAt: row.volunteerScheduledApprovedAt?.toISOString() ?? null,
  };
  });

  const allAnalysts: AdminProviderRow[] = analysts.map((p) => {
    const row = p as typeof p & {
      volunteerScheduledApproved?: boolean;
      volunteerScheduledApprovedAt?: Date | null;
    };
    return {
      id: p.id,
      userId: p.userId,
      name: `${p.firstName} ${p.lastName}`.trim(),
      email: p.user?.email ?? null,
      region: p.user?.region ?? null,
      subtitle: p.trainingInstitution,
      verified: p.verified,
      emailVerified: !!p.user?.emailVerified,
      appointments: p._count.appointments,
      charts: p._count.analysandRecords,
      isPublic: p.virtualCard?.isPublic ?? false,
      licenseDocCount: p.user?._count.providerLicenseDocuments ?? 0,
      publicUrl:
        p.verified && p.virtualCard?.isPublic && p.virtualCard.specialtySlug && p.virtualCard.citySlug
          ? buildPublicProfileUrl(p.virtualCard)
          : null,
      hasVolunteerBlocks: p.availabilitySlots.length > 0,
      volunteerScheduledApproved: row.volunteerScheduledApproved ?? false,
      volunteerScheduledApprovedAt: row.volunteerScheduledApprovedAt?.toISOString() ?? null,
    };
  });

  const allTherapists: AdminProviderRow[] = therapists.map((p) => {
    const volunteerBlocks = parseAvailabilityJson(
      (p as { availability?: unknown }).availability,
    ).volunteerBlocks ?? [];
    const row = p as typeof p & {
      volunteerScheduledApproved?: boolean;
      volunteerScheduledApprovedAt?: Date | null;
    };
    return {
      id: p.id,
      userId: p.userId,
      name: `${p.firstName} ${p.lastName}`.trim(),
      email: p.user?.email ?? null,
      region: p.user?.region ?? null,
      subtitle: p.picsPractices.length
        ? `${p.picsPractices.length} prática(s) PICS — ${p.trainingInstitution}`
        : p.trainingInstitution,
      verified: p.verified,
      emailVerified: !!p.user?.emailVerified,
      appointments: p._count.appointments,
      charts: p._count.clientRecords,
      isPublic: p.virtualCard?.isPublic ?? false,
      licenseDocCount: p.user?._count.providerLicenseDocuments ?? 0,
      publicUrl: p.virtualCard?.slug
        ? `${process.env.NEXT_PUBLIC_APP_URL || "https://doctor8.app"}/dr/${p.virtualCard.slug}`
        : null,
      hasVolunteerBlocks: volunteerBlocks.length > 0,
      volunteerScheduledApproved: row.volunteerScheduledApproved ?? false,
      volunteerScheduledApprovedAt: row.volunteerScheduledApprovedAt?.toISOString() ?? null,
    };
  });

  return { allAngels, allDoctors, allAnalysts, allTherapists, incompleteSignups, queryErrors };
}

function matchesProviderSearch(
  query: string,
  parts: (string | null | undefined)[],
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return parts.some((part) => (part ?? "").toLowerCase().includes(q));
}

function buildPendingCounts(
  allAngels: AdminAngelRow[],
  allDoctors: AdminProfessionalRow[],
  allAnalysts: AdminProviderRow[],
  allTherapists: AdminProviderRow[],
  incompleteSignups: AdminIncompleteSignupRow[],
): Record<AdminProviderTab, number> {
  return Object.fromEntries(
    ADMIN_PROVIDER_TAB_IDS.map((id) => [
      id,
      countForTab(id, allAngels, allDoctors, allAnalysts, allTherapists, incompleteSignups),
    ]),
  ) as Record<AdminProviderTab, number>;
}

function payloadFromRows(
  tab: AdminProviderTab,
  rows: RawAdminRows,
): AdminProvidersPayload {
  const { allAngels, allDoctors, allAnalysts, allTherapists, incompleteSignups, queryErrors } = rows;
  const pendingCounts = buildPendingCounts(
    allAngels,
    allDoctors,
    allAnalysts,
    allTherapists,
    incompleteSignups,
  );

  if (tab === "incompletos") {
    return {
      angels: [],
      doctors: [],
      psychoanalysts: [],
      integrativeTherapists: [],
      incompleteSignups,
      pendingCounts,
      queryErrors: queryErrors.length ? queryErrors : undefined,
    };
  }

  if (tab === "todos") {
    return {
      angels: allAngels,
      doctors: allDoctors,
      psychoanalysts: allAnalysts,
      integrativeTherapists: allTherapists,
      incompleteSignups: [],
      pendingCounts,
      queryErrors: queryErrors.length ? queryErrors : undefined,
    };
  }

  if (tab === "anjos") {
    return {
      angels: allAngels,
      doctors: [],
      psychoanalysts: [],
      integrativeTherapists: [],
      incompleteSignups: [],
      pendingCounts,
      queryErrors: queryErrors.length ? queryErrors : undefined,
    };
  }

  if (tab === "pendentes") {
    return {
      angels: angelsForTab(allAngels, tab),
      doctors: allDoctors.filter((d) => !d.verified),
      psychoanalysts: allAnalysts.filter((p) => !p.verified),
      integrativeTherapists: allTherapists.filter((p) => !p.verified),
      incompleteSignups: [],
      pendingCounts,
      queryErrors: queryErrors.length ? queryErrors : undefined,
    };
  }

  if (tab === "psicanalistas") {
    return {
      angels: angelsForTab(allAngels, tab),
      doctors: allDoctors.filter((d) => matchesTab(tab, d.specialty, d.licenseNumber)),
      psychoanalysts: allAnalysts,
      integrativeTherapists: [],
      incompleteSignups: [],
      pendingCounts,
      queryErrors: queryErrors.length ? queryErrors : undefined,
    };
  }

  if (tab === "terapeutas") {
    return {
      angels: angelsForTab(allAngels, tab),
      doctors: allDoctors.filter((d) => matchesTab(tab, d.specialty, d.licenseNumber)),
      psychoanalysts: [],
      integrativeTherapists: allTherapists,
      incompleteSignups: [],
      pendingCounts,
      queryErrors: queryErrors.length ? queryErrors : undefined,
    };
  }

  return {
    angels: angelsForTab(allAngels, tab),
    doctors: allDoctors.filter((d) => matchesTab(tab, d.specialty, d.licenseNumber)),
    psychoanalysts: [],
    integrativeTherapists: [],
    incompleteSignups: [],
    pendingCounts,
    queryErrors: queryErrors.length ? queryErrors : undefined,
  };
}

/** Global search across all provider types (ignores active tab filter). */
export async function searchAdminProviders(query: string): Promise<AdminProvidersPayload> {
  const rows = await loadRawAdminRows();
  const pendingCounts = buildPendingCounts(
    rows.allAngels,
    rows.allDoctors,
    rows.allAnalysts,
    rows.allTherapists,
    rows.incompleteSignups,
  );

  return {
    angels: rows.allAngels.filter((a) =>
      matchesProviderSearch(query, [
        a.firstName,
        a.lastName,
        a.email,
        a.profession,
        a.volunteerHelp,
        a.motivation,
      ]),
    ),
    doctors: rows.allDoctors.filter((d) =>
      matchesProviderSearch(query, [d.name, d.email, d.specialty, d.licenseNumber]),
    ),
    psychoanalysts: rows.allAnalysts.filter((p) =>
      matchesProviderSearch(query, [p.name, p.email, p.subtitle]),
    ),
    integrativeTherapists: rows.allTherapists.filter((p) =>
      matchesProviderSearch(query, [p.name, p.email, p.subtitle]),
    ),
    incompleteSignups: rows.incompleteSignups.filter((u) =>
      matchesProviderSearch(query, [u.email, u.name, u.role]),
    ),
    pendingCounts,
    queryErrors: rows.queryErrors.length ? rows.queryErrors : undefined,
  };
}

export async function listAdminProviders(tab: AdminProviderTab): Promise<AdminProvidersPayload> {
  const rows = await loadRawAdminRows();
  return payloadFromRows(tab, rows);
}

function countForTab(
  tab: AdminProviderTab,
  angels: AdminAngelRow[],
  doctors: AdminProfessionalRow[],
  analysts: AdminProviderRow[],
  therapists: AdminProviderRow[],
  incompleteSignups: AdminIncompleteSignupRow[],
): number {
  if (tab === "incompletos") return incompleteSignups.length;
  if (tab === "todos") {
    return angels.length + doctors.length + analysts.length + therapists.length;
  }
  if (tab === "pendentes") {
    return (
      angels.filter((a) => a.approvalStatus === "PENDING").length +
      doctors.filter((d) => !d.verified).length +
      analysts.filter((p) => !p.verified).length +
      therapists.filter((p) => !p.verified).length
    );
  }
  if (tab === "anjos") return angels.length;
  if (tab === "psicanalistas") {
    return (
      angels.filter((a) => angelMatchesAdminTab(a, tab)).length +
      doctors.filter((d) => matchesTab(tab, d.specialty, d.licenseNumber)).length +
      analysts.length
    );
  }
  if (tab === "terapeutas") {
    return (
      angels.filter((a) => angelMatchesAdminTab(a, tab)).length +
      doctors.filter((d) => matchesTab(tab, d.specialty, d.licenseNumber)).length +
      therapists.length
    );
  }
  return (
    angels.filter((a) => angelMatchesAdminTab(a, tab)).length +
    doctors.filter((d) => matchesTab(tab, d.specialty, d.licenseNumber)).length
  );
}
