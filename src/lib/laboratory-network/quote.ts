import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { distanceKm, geocodeCep } from "@/lib/pharmacy-network/geocode";

export type LaboratorySearchHit = {
  laboratoryId: string;
  nomeFantasia: string;
  slug: string;
  labType: string;
  addressStreet: string | null;
  addressNeighborhood: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  distanceKm: number | null;
  examCount: number;
  matchedExamCount: number;
};

export type LaboratoryExamPrice = {
  itemId: string;
  examCatalogId: string;
  name: string;
  category: string;
  code: string | null;
  priceCents: number;
  internalCode: string | null;
};

const MAX_RADIUS_KM = 50;

function normalizeSearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

async function resolvePatientPoint(opts: {
  cep?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
}): Promise<{ latitude: number; longitude: number } | null> {
  if (opts.latitude != null && opts.longitude != null) {
    return { latitude: opts.latitude, longitude: opts.longitude };
  }
  if (opts.cep) {
    return geocodeCep(opts.cep, opts.city, opts.state);
  }
  return null;
}

type LabRow = Prisma.LaboratoryGetPayload<{
  include: {
    exams: {
      include: { examCatalog: { select: { id: true; name: true; category: true; code: true; searchName: true } } };
    };
  };
}>;

function buildLabHit(
  lab: LabRow,
  patientPoint: { latitude: number; longitude: number } | null,
  matchedExamCount: number,
): LaboratorySearchHit | null {
  let distKm: number | null = null;
  if (patientPoint && lab.latitude != null && lab.longitude != null) {
    distKm = distanceKm(patientPoint, { latitude: lab.latitude, longitude: lab.longitude });
    if (distKm > MAX_RADIUS_KM) return null;
  }

  return {
    laboratoryId: lab.id,
    nomeFantasia: lab.nomeFantasia,
    slug: lab.slug,
    labType: lab.labType,
    addressStreet: lab.addressStreet,
    addressNeighborhood: lab.addressNeighborhood,
    addressCity: lab.addressCity,
    addressState: lab.addressState,
    addressZip: lab.addressZip,
    distanceKm: distKm,
    examCount: lab.exams.length,
    matchedExamCount,
  };
}

export async function searchLaboratories(opts: {
  labName?: string;
  examQ?: string;
  examNames?: string[];
  cep?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  limit?: number;
}): Promise<LaboratorySearchHit[]> {
  const patientPoint = await resolvePatientPoint(opts);
  const labNameNorm = opts.labName ? normalizeSearch(opts.labName) : "";
  const examQNorm = opts.examQ ? normalizeSearch(opts.examQ) : "";

  const examCatalogFilter: Prisma.ExamCatalogWhereInput | undefined =
    examQNorm
      ? {
          OR: [
            { searchName: { contains: examQNorm } },
            { name: { contains: opts.examQ!, mode: "insensitive" } },
            { code: { contains: opts.examQ!, mode: "insensitive" } },
          ],
        }
      : undefined;

  const where: Prisma.LaboratoryWhereInput = {
    status: "ACTIVE",
    ...(labNameNorm
      ? {
          OR: [
            { nomeFantasia: { contains: opts.labName!, mode: "insensitive" } },
            { razaoSocial: { contains: opts.labName!, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(examCatalogFilter
      ? {
          exams: {
            some: {
              available: true,
              examCatalog: examCatalogFilter,
            },
          },
        }
      : {
          exams: { some: { available: true } },
        }),
    ...(opts.city && !patientPoint
      ? { addressCity: { equals: opts.city, mode: "insensitive" } }
      : {}),
    ...(opts.state && !patientPoint
      ? { addressState: { equals: opts.state.toUpperCase() } }
      : {}),
  };

  const labs = await db.laboratory.findMany({
    where,
    include: {
      exams: {
        where: { available: true },
        include: {
          examCatalog: {
            select: { id: true, name: true, category: true, code: true, searchName: true },
          },
        },
      },
    },
    take: 100,
  });

  const requestedExamNorms = (opts.examNames ?? [])
    .map(normalizeSearch)
    .filter((n) => n.length >= 2);

  const hits: LaboratorySearchHit[] = [];
  for (const lab of labs) {
    let matchedExamCount = 0;
    if (requestedExamNorms.length > 0) {
      for (const norm of requestedExamNorms) {
        const found = lab.exams.some((item) => {
          const catalogNorm = item.examCatalog.searchName;
          return (
            catalogNorm.includes(norm)
            || norm.includes(catalogNorm)
            || item.examCatalog.name.toLowerCase().includes(norm)
          );
        });
        if (found) matchedExamCount++;
      }
    } else if (examQNorm) {
      matchedExamCount = lab.exams.filter((item) => {
        const c = item.examCatalog;
        return (
          c.searchName.includes(examQNorm)
          || c.name.toLowerCase().includes(examQNorm)
          || (c.code?.toLowerCase().includes(examQNorm) ?? false)
        );
      }).length;
    }

    const hit = buildLabHit(lab, patientPoint, matchedExamCount);
    if (hit) hits.push(hit);
  }

  hits.sort((a, b) => {
    if (requestedExamNorms.length > 0 && b.matchedExamCount !== a.matchedExamCount) {
      return b.matchedExamCount - a.matchedExamCount;
    }
    const da = a.distanceKm ?? 9999;
    const db = b.distanceKm ?? 9999;
    if (da !== db) return da - db;
    return a.nomeFantasia.localeCompare(b.nomeFantasia, "pt");
  });

  return hits.slice(0, opts.limit ?? 20);
}

export async function getLaboratoryExamPrices(
  laboratoryId: string,
  examQ?: string,
  highlightNames?: string[],
): Promise<LaboratoryExamPrice[]> {
  const examQNorm = examQ ? normalizeSearch(examQ) : "";
  const highlightNorms = (highlightNames ?? []).map(normalizeSearch).filter((n) => n.length >= 2);

  const items = await db.laboratoryExamItem.findMany({
    where: {
      laboratoryId,
      available: true,
      ...(examQNorm
        ? {
            examCatalog: {
              OR: [
                { searchName: { contains: examQNorm } },
                { name: { contains: examQ!, mode: "insensitive" } },
                { code: { contains: examQ!, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    include: {
      examCatalog: {
        select: { id: true, name: true, category: true, code: true, searchName: true },
      },
    },
    orderBy: { examCatalog: { name: "asc" } },
    take: 500,
  });

  const prices: LaboratoryExamPrice[] = items.map((item) => ({
    itemId: item.id,
    examCatalogId: item.examCatalogId,
    name: item.examCatalog.name,
    category: item.examCatalog.category,
    code: item.examCatalog.code,
    priceCents: item.priceCents,
    internalCode: item.internalCode,
  }));

  if (highlightNorms.length === 0) return prices;

  return prices.sort((a, b) => {
    const aNorm = normalizeSearch(a.name);
    const bNorm = normalizeSearch(b.name);
    const aMatch = highlightNorms.some((h) => aNorm.includes(h) || h.includes(aNorm));
    const bMatch = highlightNorms.some((h) => bNorm.includes(h) || h.includes(bNorm));
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return a.name.localeCompare(b.name, "pt");
  });
}

export function isLaboratoryNetworkEnabled(): boolean {
  const raw = process.env.LABORATORY_NETWORK_ENABLED;
  if (raw === "false") return false;
  return true;
}

export function getLaboratoryNetworkMinLabs(): number {
  const raw = process.env.LABORATORY_NETWORK_MIN_LABS;
  const n = parseInt(raw || "0", 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export async function countActiveLaboratories(): Promise<number> {
  return db.laboratory.count({
    where: {
      status: "ACTIVE",
      exams: { some: { available: true } },
    },
  });
}

export async function isLaboratoryNetworkPublic(): Promise<boolean> {
  if (!isLaboratoryNetworkEnabled()) return false;
  const min = getLaboratoryNetworkMinLabs();
  if (min <= 0) return true;
  const count = await countActiveLaboratories();
  return count >= min;
}
