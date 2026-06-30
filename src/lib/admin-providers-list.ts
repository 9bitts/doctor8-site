import { db } from "@/lib/db";
import { buildPublicProfileUrl } from "@/lib/public-slugs";
import {
  resolveAdminTabFromProfessionText,
  angelMatchesAdminTab,
  type AdminProviderTab,
} from "@/lib/admin-provider-categories";

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
};

export type AdminProvidersPayload = {
  angels: AdminAngelRow[];
  doctors: AdminProfessionalRow[];
  psychoanalysts: AdminProviderRow[];
  integrativeTherapists: AdminProviderRow[];
  pendingCounts: Record<AdminProviderTab, number>;
};

const ADMIN_PROVIDER_TAB_IDS: AdminProviderTab[] = [
  "pendentes",
  "medicos",
  "psicologos",
  "nutricionistas",
  "fisioterapeutas",
  "psicanalistas",
  "terapeutas",
  "anjos",
  "outros",
];

function angelsForTab(allAngels: AdminAngelRow[], tab: AdminProviderTab): AdminAngelRow[] {
  if (tab === "anjos") return allAngels;
  if (tab === "pendentes") {
    return allAngels.filter((a) => a.approvalStatus === "PENDING");
  }
  return allAngels.filter((a) => angelMatchesAdminTab(a, tab));
}

function matchesTab(tab: AdminProviderTab, specialty: string): boolean {
  if (tab === "pendentes" || tab === "anjos") return false;
  return resolveAdminTabFromProfessionText(specialty) === tab;
}

async function safeQuery<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(`[listAdminProviders] ${label} failed:`, error);
    return fallback;
  }
}

export async function listAdminProviders(tab: AdminProviderTab): Promise<AdminProvidersPayload> {
  const [angelRows, healthPros, analysts, therapists] = await Promise.all([
    safeQuery("angelProfile", () => db.angelProfile.findMany({
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
    }), []),
    safeQuery("professionalProfile", () => db.professionalProfile.findMany({
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
    }), []),
    safeQuery("psychoanalystProfile", () => db.psychoanalystProfile.findMany({
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
        _count: { select: { appointments: true, analysandRecords: true } },
      },
    }), []),
    safeQuery("integrativeTherapistProfile", () => db.integrativeTherapistProfile.findMany({
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
    }), []),
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

  const allDoctors: AdminProfessionalRow[] = healthPros.map((p) => ({
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
    publicUrl:
      p.verified && p.virtualCard?.isPublic && p.virtualCard.specialtySlug && p.virtualCard.citySlug
        ? buildPublicProfileUrl(p.virtualCard)
        : null,
  }));

  const allAnalysts: AdminProviderRow[] = analysts.map((p) => ({
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
  }));

  const allTherapists: AdminProviderRow[] = therapists.map((p) => ({
    id: p.id,
    userId: p.userId,
    name: `${p.firstName} ${p.lastName}`.trim(),
    email: p.user?.email ?? null,
    region: p.user?.region ?? null,
    subtitle: p.picsPractices.length
      ? `${p.picsPractices.length} pr?tica(s) PICS ? ${p.trainingInstitution}`
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
  }));

  const pendingCounts = Object.fromEntries(
    ADMIN_PROVIDER_TAB_IDS.map((id) => [
      id,
      countForTab(id, allAngels, allDoctors, allAnalysts, allTherapists),
    ]),
  ) as Record<AdminProviderTab, number>;

  if (tab === "anjos") {
    return {
      angels: allAngels,
      doctors: [],
      psychoanalysts: [],
      integrativeTherapists: [],
      pendingCounts,
    };
  }

  if (tab === "pendentes") {
    return {
      angels: angelsForTab(allAngels, tab),
      doctors: allDoctors.filter((d) => !d.verified),
      psychoanalysts: allAnalysts.filter((p) => !p.verified),
      integrativeTherapists: allTherapists.filter((p) => !p.verified),
      pendingCounts,
    };
  }

  if (tab === "psicanalistas") {
    return {
      angels: angelsForTab(allAngels, tab),
      doctors: allDoctors.filter((d) => matchesTab(tab, d.specialty)),
      psychoanalysts: allAnalysts,
      integrativeTherapists: [],
      pendingCounts,
    };
  }

  if (tab === "terapeutas") {
    return {
      angels: angelsForTab(allAngels, tab),
      doctors: allDoctors.filter((d) => matchesTab(tab, d.specialty)),
      psychoanalysts: [],
      integrativeTherapists: allTherapists,
      pendingCounts,
    };
  }

  return {
    angels: angelsForTab(allAngels, tab),
    doctors: allDoctors.filter((d) => matchesTab(tab, d.specialty)),
    psychoanalysts: [],
    integrativeTherapists: [],
    pendingCounts,
  };
}

function countForTab(
  tab: AdminProviderTab,
  angels: AdminAngelRow[],
  doctors: AdminProfessionalRow[],
  analysts: AdminProviderRow[],
  therapists: AdminProviderRow[],
): number {
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
      doctors.filter((d) => matchesTab(tab, d.specialty)).length +
      analysts.length
    );
  }
  if (tab === "terapeutas") {
    return (
      angels.filter((a) => angelMatchesAdminTab(a, tab)).length +
      doctors.filter((d) => matchesTab(tab, d.specialty)).length +
      therapists.length
    );
  }
  return (
    angels.filter((a) => angelMatchesAdminTab(a, tab)).length +
    doctors.filter((d) => matchesTab(tab, d.specialty)).length
  );
}
