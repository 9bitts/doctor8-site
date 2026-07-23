// Partner directory: public AcuraBrasil volunteers (verified + isPublic + acuraVolunteer).

import { db } from "@/lib/db";
import { getProfessionInfo, formatLicense } from "@/lib/profession-label";
import { getProfessionLabel, PSYCHOANALYSIS_SPECIALTY } from "@/lib/professions";
import { safeDecrypt } from "@/lib/psychoanalyst-api";
import { decryptIntegrativeNameFields } from "@/lib/integrative-therapist-api";
import { INTEGRATIVE_THERAPY_SPECIALTY } from "@/lib/integrative-therapy-specialty";
import { isAcuraVolunteerProvider } from "@/lib/acura-volunteer";
import {
  APP_BASE_URL,
  buildPublicProfilePath,
  buildPublicProfileUrl,
  specialtyToSeoSlug,
  cityToSeoSlug,
} from "@/lib/public-slugs";
import {
  firstAvailableSlot,
  getProviderAvailableDays,
} from "@/lib/availability-slots";
import type { ProviderType } from "@/lib/providers";

export type AcuraVolunteerDirectoryEntry = {
  id: string;
  slug: string;
  name: string;
  firstName: string;
  lastName: string;
  providerType: "health" | "psychoanalyst" | "integrative";
  specialty: string;
  specialtySlug: string;
  citySlug: string;
  profissao: string[];
  especialidade: string[];
  registro: string | null;
  bio: string | null;
  avatarUrl: string | null;
  location: string | null;
  publicPath: string;
  publicUrl: string;
  bookingUrl: string;
  volunteerBadge: boolean;
  doctor8: boolean;
  initials: string;
  nextSlotAt: string | null;
};

export type ListAcuraVolunteersOpts = {
  specialty?: string | null;
  hasSlots?: boolean;
  locale?: string;
  limit?: number;
  offset?: number;
};

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function profissaoLabel(specialty: string, providerType: ProviderType): string {
  if (providerType === "psychoanalyst") return "Psicanálise";
  if (providerType === "integrative") return "Terapia Integrativa";
  const info = getProfessionInfo(specialty);
  switch (info.typeKey) {
    case "psychologist":
      return "Psicologia";
    case "nutritionist":
      return "Nutrição";
    case "physiotherapist":
      return "Fisioterapia";
    case "nurse":
      return "Enfermagem";
    case "pharmacist":
      return "Farmácia";
    case "dentist":
      return "Odontologia";
    case "doctor":
      return "Medicina";
    default:
      return getProfessionLabel("pt", specialty) || specialty;
  }
}

function subspecialtyLabels(subs: string[]): string[] {
  return subs.map((s) => getProfessionLabel("pt", s) || s).filter(Boolean);
}

function formatLocation(city: string | null | undefined, state: string | null | undefined): string | null {
  const parts = [city, state].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function buildAcuraBookingUrl(
  providerId: string,
  providerType: AcuraVolunteerDirectoryEntry["providerType"],
): string {
  if (providerType === "integrative") {
    const params = new URLSearchParams({
      pro: providerId,
      providerType: "integrative",
      from: "acura_directory",
    });
    return `${APP_BASE_URL}/patient/volunteer-appointments?${params.toString()}`;
  }
  const params = new URLSearchParams({
    volunteersOnly: "1",
    pro: providerId,
    providerType,
    from: "acura_directory",
  });
  return `${APP_BASE_URL}/patient/appointments?${params.toString()}`;
}

async function mapHealthCard(
  card: {
    slug: string;
    specialtySlug: string | null;
    citySlug: string | null;
    professional: {
      id: string;
      firstName: string;
      lastName: string;
      specialty: string;
      subspecialties: string[];
      bio: string | null;
      avatarUrl: string | null;
      licenseNumber: string;
      licenseState: string | null;
      clinicCity: string | null;
      clinicState: string | null;
      verified: boolean;
      acuraVolunteer: boolean;
    };
  },
  opts: { locale: string; hasSlots?: boolean }
): Promise<AcuraVolunteerDirectoryEntry | null> {
  const p = card.professional;
  if (!isAcuraVolunteerProvider(p.verified, p.acuraVolunteer)) return null;

  const providerType = "health" as const;
  const specialtySlug = card.specialtySlug || specialtyToSeoSlug(p.specialty);
  const citySlug = card.citySlug || cityToSeoSlug(p.clinicCity);
  const publicPath = buildPublicProfilePath({ specialtySlug, citySlug, slug: card.slug });
  const name = `${p.firstName} ${p.lastName}`.trim();
  const info = getProfessionInfo(p.specialty);

  const slotDays = await getProviderAvailableDays(p.id, providerType, opts.locale, 14, undefined, {
    slotMode: "volunteer",
  });
  const nextSlotAt = firstAvailableSlot(slotDays);
  if (opts.hasSlots && !nextSlotAt) return null;

  const especialidade = subspecialtyLabels(p.subspecialties);
  if (especialidade.length === 0) {
    const main = getProfessionLabel("pt", p.specialty);
    if (main) especialidade.push(main);
  }

  return {
    id: p.id,
    slug: card.slug,
    name,
    firstName: p.firstName,
    lastName: p.lastName,
    providerType,
    specialty: p.specialty,
    specialtySlug,
    citySlug,
    profissao: [profissaoLabel(p.specialty, providerType)],
    especialidade,
    registro: formatLicense(p.licenseNumber, p.licenseState, info.councilKey) || null,
    bio: p.bio,
    avatarUrl: p.avatarUrl,
    location: formatLocation(p.clinicCity, p.clinicState),
    publicPath,
    publicUrl: buildPublicProfileUrl({ specialtySlug, citySlug, slug: card.slug }),
    bookingUrl: buildAcuraBookingUrl(p.id, providerType),
    volunteerBadge: true,
    doctor8: true,
    initials: initialsFromName(name),
    nextSlotAt,
  };
}

async function mapPsychoanalystCard(
  card: {
    slug: string;
    specialtySlug: string | null;
    citySlug: string | null;
    psychoanalyst: {
      id: string;
      firstName: string;
      lastName: string;
      bio: string | null;
      avatarUrl: string | null;
      clinicCity: string | null;
      clinicState: string | null;
      verified: boolean;
      acuraVolunteer: boolean;
    };
  },
  opts: { locale: string; hasSlots?: boolean }
): Promise<AcuraVolunteerDirectoryEntry | null> {
  const p = card.psychoanalyst;
  if (!isAcuraVolunteerProvider(p.verified, p.acuraVolunteer)) return null;

  const providerType = "psychoanalyst" as const;
  const specialtySlug = card.specialtySlug || "psicanalista";
  const citySlug = card.citySlug || cityToSeoSlug(p.clinicCity);
  const publicPath = buildPublicProfilePath({ specialtySlug, citySlug, slug: card.slug });
  const firstName = safeDecrypt(p.firstName);
  const lastName = safeDecrypt(p.lastName);
  const name = `${firstName} ${lastName}`.trim();

  const slotDays = await getProviderAvailableDays(p.id, providerType, opts.locale, 14, undefined, {
    slotMode: "volunteer",
  });
  const nextSlotAt = firstAvailableSlot(slotDays);
  if (opts.hasSlots && !nextSlotAt) return null;

  return {
    id: p.id,
    slug: card.slug,
    name,
    firstName,
    lastName,
    providerType,
    specialty: PSYCHOANALYSIS_SPECIALTY,
    specialtySlug,
    citySlug,
    profissao: [profissaoLabel(PSYCHOANALYSIS_SPECIALTY, providerType)],
    especialidade: [getProfessionLabel("pt", PSYCHOANALYSIS_SPECIALTY) || "Psicanálise"],
    registro: null,
    bio: p.bio,
    avatarUrl: p.avatarUrl,
    location: formatLocation(p.clinicCity, p.clinicState),
    publicPath,
    publicUrl: buildPublicProfileUrl({ specialtySlug, citySlug, slug: card.slug }),
    bookingUrl: buildAcuraBookingUrl(p.id, providerType),
    volunteerBadge: true,
    doctor8: true,
    initials: initialsFromName(name),
    nextSlotAt,
  };
}

async function mapIntegrativeCard(
  card: {
    slug: string;
    specialtySlug: string | null;
    citySlug: string | null;
    integrativeTherapist: {
      id: string;
      firstName: string;
      lastName: string;
      bio: string | null;
      avatarUrl: string | null;
      clinicCity: string | null;
      clinicState: string | null;
      verified: boolean;
      acuraVolunteer: boolean;
    };
  },
  opts: { locale: string; hasSlots?: boolean }
): Promise<AcuraVolunteerDirectoryEntry | null> {
  const raw = card.integrativeTherapist;
  if (!isAcuraVolunteerProvider(raw.verified, raw.acuraVolunteer)) return null;

  const p = decryptIntegrativeNameFields(raw);
  const providerType = "integrative" as const;
  const specialtySlug = card.specialtySlug || "terapeuta-integrativo";
  const citySlug = card.citySlug || cityToSeoSlug(p.clinicCity);
  const publicPath = buildPublicProfilePath({ specialtySlug, citySlug, slug: card.slug });
  const name = `${p.firstName} ${p.lastName}`.trim();

  const slotDays = await getProviderAvailableDays(p.id, providerType, opts.locale, 14, undefined, {
    slotMode: "volunteer",
  });
  const nextSlotAt = firstAvailableSlot(slotDays);
  if (opts.hasSlots && !nextSlotAt) return null;

  return {
    id: p.id,
    slug: card.slug,
    name,
    firstName: p.firstName,
    lastName: p.lastName,
    providerType,
    specialty: INTEGRATIVE_THERAPY_SPECIALTY,
    specialtySlug,
    citySlug,
    profissao: [profissaoLabel(INTEGRATIVE_THERAPY_SPECIALTY, providerType)],
    especialidade: [getProfessionLabel("pt", INTEGRATIVE_THERAPY_SPECIALTY) || "Terapia Integrativa"],
    registro: null,
    bio: p.bio,
    avatarUrl: p.avatarUrl,
    location: formatLocation(p.clinicCity, p.clinicState),
    publicPath,
    publicUrl: buildPublicProfileUrl({ specialtySlug, citySlug, slug: card.slug }),
    bookingUrl: buildAcuraBookingUrl(p.id, providerType),
    volunteerBadge: true,
    doctor8: true,
    initials: initialsFromName(name),
    nextSlotAt,
  };
}

export async function listAcuraVolunteerDirectory(
  opts: ListAcuraVolunteersOpts = {}
): Promise<{ total: number; volunteers: AcuraVolunteerDirectoryEntry[] }> {
  const locale = opts.locale || "pt-BR";
  const limit = Math.min(Math.max(opts.limit ?? 200, 1), 500);
  const offset = Math.max(opts.offset ?? 0, 0);
  const specialtyFilter = opts.specialty?.trim() || null;

  const baseWhere = {
    isPublic: true,
    ...(specialtyFilter ? { specialtySlug: specialtyFilter } : {}),
  };

  const [healthCards, psychoCards, integrativeCards] = await Promise.all([
    db.virtualCard.findMany({
      where: {
        ...baseWhere,
        professionalId: { not: null },
        professional: { verified: true, acuraVolunteer: true },
      },
      include: {
        professional: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialty: true,
            subspecialties: true,
            bio: true,
            avatarUrl: true,
            licenseNumber: true,
            licenseState: true,
            clinicCity: true,
            clinicState: true,
            verified: true,
            acuraVolunteer: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.virtualCard.findMany({
      where: {
        ...baseWhere,
        psychoanalystId: { not: null },
        psychoanalyst: { verified: true, acuraVolunteer: true },
      },
      include: {
        psychoanalyst: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            bio: true,
            avatarUrl: true,
            clinicCity: true,
            clinicState: true,
            verified: true,
            acuraVolunteer: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.virtualCard.findMany({
      where: {
        ...baseWhere,
        integrativeTherapistId: { not: null },
        integrativeTherapist: { verified: true, acuraVolunteer: true },
      },
      include: {
        integrativeTherapist: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            bio: true,
            avatarUrl: true,
            clinicCity: true,
            clinicState: true,
            verified: true,
            acuraVolunteer: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const mapped: AcuraVolunteerDirectoryEntry[] = [];

  for (const card of healthCards) {
    if (!card.professional) continue;
    const entry = await mapHealthCard(card as Parameters<typeof mapHealthCard>[0], {
      locale,
      hasSlots: opts.hasSlots,
    });
    if (entry) mapped.push(entry);
  }
  for (const card of psychoCards) {
    if (!card.psychoanalyst) continue;
    const entry = await mapPsychoanalystCard(card as Parameters<typeof mapPsychoanalystCard>[0], {
      locale,
      hasSlots: opts.hasSlots,
    });
    if (entry) mapped.push(entry);
  }
  for (const card of integrativeCards) {
    if (!card.integrativeTherapist) continue;
    const entry = await mapIntegrativeCard(card as Parameters<typeof mapIntegrativeCard>[0], {
      locale,
      hasSlots: opts.hasSlots,
    });
    if (entry) mapped.push(entry);
  }

  mapped.sort((a, b) => {
    if (a.nextSlotAt && !b.nextSlotAt) return -1;
    if (!a.nextSlotAt && b.nextSlotAt) return 1;
    return a.name.localeCompare(b.name, "pt-BR");
  });

  const total = mapped.length;
  const volunteers = mapped.slice(offset, offset + limit);

  return { total, volunteers };
}
