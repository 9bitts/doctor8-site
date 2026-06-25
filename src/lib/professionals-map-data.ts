import { db } from "@/lib/db";
import { geocodeAddress, buildClinicAddress, haversineKm, GeoPoint } from "@/lib/geo";
import { getProfessionInfo, formatLicense } from "@/lib/profession-label";
import { PSYCHOANALYSIS_SPECIALTY } from "@/lib/professions";
import { safeDecrypt } from "@/lib/psychoanalyst-api";

const GEOCODE_BATCH = 8;
const RADIUS_OPTIONS = [5, 10, 50];

function hasClinicLocation(pro: {
  clinicAddress?: string | null;
  clinicCity?: string | null;
  clinicState?: string | null;
  acceptsInPerson: boolean;
}): boolean {
  return pro.acceptsInPerson || !!(pro.clinicAddress || pro.clinicCity);
}

export type ProfessionalsMapQuery = {
  lat?: string | null;
  lng?: string | null;
  q?: string | null;
  specialty?: string | null;
  radiusKm?: string | null;
  patientUserId?: string | null;
};

export async function getProfessionalsMap(query: ProfessionalsMapQuery) {
  const latParam = query.lat;
  const lngParam = query.lng;
  const q = query.q?.trim() || "";
  const specialtyFilter = query.specialty?.trim() || "";
  const radiusParam = parseInt(query.radiusKm || "0", 10);
  const radiusKm = RADIUS_OPTIONS.includes(radiusParam) ? radiusParam : 0;

  let center: GeoPoint | null = null;
  if (latParam && lngParam) {
    const lat = parseFloat(latParam);
    const lng = parseFloat(lngParam);
    if (!isNaN(lat) && !isNaN(lng)) center = { lat, lng };
  }
  if (!center && q) center = await geocodeAddress(q);

  const patientUserId = query.patientUserId ?? null;

  const patient = patientUserId
    ? await db.patientProfile.findUnique({
        where: { userId: patientUserId },
        select: { id: true },
      })
    : null;

  let favorites: { professionalId: string; notifyOnline: boolean }[] = [];
  let reviewAgg: { professionalId: string; _avg: { rating: number | null }; _count: { rating: number } }[] = [];

  if (patientUserId) {
    try {
      [favorites, reviewAgg] = await Promise.all([
        db.patientFavorite.findMany({
          where: { patientUserId },
          select: { professionalId: true, notifyOnline: true },
        }),
        db.professionalReview.groupBy({
          by: ["professionalId"],
          _avg: { rating: true },
          _count: { rating: true },
        }),
      ]);
    } catch (e) {
      console.error("[PROFESSIONALS-MAP] favorites/reviews unavailable:", e);
    }
  }

  const specialtyRows = await db.professionalProfile.findMany({
    where: { verified: true },
    select: { specialty: true },
    distinct: ["specialty"],
    orderBy: { specialty: "asc" },
  });

  const favoriteSet = new Set(favorites.map((f) => f.professionalId));
  const reviewMap = new Map(
    reviewAgg.map((r) => [
      r.professionalId,
      {
        avg: Math.round((r._avg.rating ?? 0) * 10) / 10,
        count: r._count.rating,
      },
    ])
  );

  const completedProIds = patient
    ? new Set(
        (
          await db.appointment.findMany({
            where: { patientId: patient.id, status: "COMPLETED" },
            select: { professionalId: true },
            distinct: ["professionalId"],
          })
        ).map((a) => a.professionalId)
      )
    : new Set<string>();

  const psychoOnly = specialtyFilter === PSYCHOANALYSIS_SPECIALTY;
  const healthOnly = specialtyFilter && specialtyFilter !== PSYCHOANALYSIS_SPECIALTY;

  const professionals = healthOnly
    ? []
    : await db.professionalProfile.findMany({
        where: {
          verified: true,
          ...(specialtyFilter ? { specialty: { equals: specialtyFilter, mode: "insensitive" } } : {}),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          specialty: true,
          avatarUrl: true,
          licenseNumber: true,
          licenseState: true,
          consultPrice: true,
          currency: true,
          acceptsTeleconsult: true,
          acceptsInPerson: true,
          clinicName: true,
          clinicAddress: true,
          clinicCity: true,
          clinicState: true,
          clinicCountry: true,
          clinicZip: true,
          clinicLatitude: true,
          clinicLongitude: true,
          jitSessions: {
            where: { status: "ONLINE" },
            select: {
              id: true,
              specialty: true,
              isFree: true,
              priceAmount: true,
              currency: true,
              estimatedMinutesPerPatient: true,
              _count: {
                select: {
                  queue: { where: { status: { in: ["WAITING", "CALLED"] } } },
                },
              },
            },
            take: 1,
          },
        },
        orderBy: { firstName: "asc" },
        take: 200,
      });

  const analysts =
    psychoOnly || !specialtyFilter
      ? await db.psychoanalystProfile.findMany({
          where: { verified: true },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            trainingInstitution: true,
            yearsOfPractice: true,
            associations: true,
            consultPrice: true,
            currency: true,
            acceptsTeleconsult: true,
            acceptsInPerson: true,
            clinicName: true,
            clinicAddress: true,
            clinicCity: true,
            clinicState: true,
            clinicCountry: true,
            clinicZip: true,
            clinicLatitude: true,
            clinicLongitude: true,
          },
          orderBy: { firstName: "asc" },
          take: 100,
        })
      : [];

  let geocoded = 0;
  if (!psychoOnly) {
    for (const pro of professionals) {
      if (geocoded >= GEOCODE_BATCH) break;
      if (pro.clinicLatitude != null && pro.clinicLongitude != null) continue;
      if (!hasClinicLocation(pro)) continue;
      const addr = buildClinicAddress(pro);
      if (!addr) continue;
      const point = await geocodeAddress(addr);
      if (!point) continue;
      await db.professionalProfile.update({
        where: { id: pro.id },
        data: { clinicLatitude: point.lat, clinicLongitude: point.lng },
      });
      pro.clinicLatitude = point.lat;
      pro.clinicLongitude = point.lng;
      geocoded++;
    }
  }

  for (const pa of analysts) {
    if (geocoded >= GEOCODE_BATCH) break;
    if (pa.clinicLatitude != null && pa.clinicLongitude != null) continue;
    if (!hasClinicLocation(pa)) continue;
    const addr = buildClinicAddress(pa);
    if (!addr) continue;
    const point = await geocodeAddress(addr);
    if (!point) continue;
    await db.psychoanalystProfile.update({
      where: { id: pa.id },
      data: { clinicLatitude: point.lat, clinicLongitude: point.lng },
    });
    pa.clinicLatitude = point.lat;
    pa.clinicLongitude = point.lng;
    geocoded++;
  }

  const mapped = professionals.map((pro) => {
    const profInfo = getProfessionInfo(pro.specialty);
    const jit = pro.jitSessions[0] ?? null;
    const queueCount = jit?._count.queue ?? 0;
    const waitMins = jit ? queueCount * (jit.estimatedMinutesPerPatient || 20) : null;

    const hasCoords = pro.clinicLatitude != null && pro.clinicLongitude != null;
    const point: GeoPoint | null = hasCoords ? { lat: pro.clinicLatitude!, lng: pro.clinicLongitude! } : null;

    const clinicLoc = hasClinicLocation(pro);
    const showOnMap = !!(point && clinicLoc);
    const teleconsultOnly = pro.acceptsTeleconsult && !showOnMap;

    const displayName = (() => {
      const full = `${pro.firstName} ${pro.lastName}`.trim();
      switch (profInfo.typeKey) {
        case "psychologist":
          return `Psic. ${full}`;
        case "nutritionist":
          return `Nutr. ${full}`;
        case "physiotherapist":
          return `Fisio. ${full}`;
        case "nurse":
          return `Enf. ${full}`;
        case "dentist":
          return `Dent. ${full}`;
        default:
          return `Dr. ${full}`;
      }
    })();

    const rev = reviewMap.get(pro.id);
    const distanceKm =
      center && point ? Math.round(haversineKm(center, point) * 10) / 10 : null;

    const priceCents = jit ? (jit.isFree ? 0 : jit.priceAmount) : Math.round(pro.consultPrice);

    return {
      id: pro.id,
      providerType: "health" as const,
      name: displayName,
      firstName: pro.firstName,
      lastName: pro.lastName,
      specialty: pro.specialty,
      professionType: profInfo.typeKey,
      license: formatLicense(pro.licenseNumber, pro.licenseState, profInfo.councilKey),
      avatarUrl: pro.avatarUrl,
      consultPrice: pro.consultPrice,
      currency: jit?.currency || pro.currency,
      acceptsTeleconsult: pro.acceptsTeleconsult,
      acceptsInPerson: pro.acceptsInPerson,
      clinicName: pro.clinicName,
      clinicCity: pro.clinicCity,
      clinicState: pro.clinicState,
      clinicCountry: pro.clinicCountry,
      lat: showOnMap ? point!.lat : null,
      lng: showOnMap ? point!.lng : null,
      showOnMap,
      teleconsultOnly,
      distanceKm,
      isOnline: !!jit,
      isFavorite: favoriteSet.has(pro.id),
      jitSessionId: jit?.id ?? null,
      jitIsFree: jit?.isFree ?? false,
      jitPriceAmount: jit?.priceAmount ?? 0,
      jitQueueCount: queueCount,
      estimatedWaitMinutes: waitMins,
      displayPriceCents: priceCents,
      ratingAvg: rev?.avg ?? null,
      ratingCount: rev?.count ?? 0,
      canReview: completedProIds.has(pro.id),
    };
  });

  const analystMapped = analysts.map((pa) => {
    const hasCoords = pa.clinicLatitude != null && pa.clinicLongitude != null;
    const point: GeoPoint | null = hasCoords ? { lat: pa.clinicLatitude!, lng: pa.clinicLongitude! } : null;
    const clinicLoc = hasClinicLocation(pa);
    const showOnMap = !!(point && clinicLoc);
    const teleconsultOnly = pa.acceptsTeleconsult && !showOnMap;
    const distanceKm =
      center && point ? Math.round(haversineKm(center, point) * 10) / 10 : null;

    return {
      id: pa.id,
      providerType: "psychoanalyst" as const,
      name: `${safeDecrypt(pa.firstName)} ${safeDecrypt(pa.lastName)}`.trim(),
      firstName: safeDecrypt(pa.firstName),
      lastName: safeDecrypt(pa.lastName),
      specialty: PSYCHOANALYSIS_SPECIALTY,
      professionType: "psychoanalyst",
      license: "",
      trainingInstitution: pa.trainingInstitution,
      yearsOfPractice: pa.yearsOfPractice,
      avatarUrl: pa.avatarUrl,
      consultPrice: pa.consultPrice,
      currency: pa.currency,
      acceptsTeleconsult: pa.acceptsTeleconsult,
      acceptsInPerson: pa.acceptsInPerson,
      clinicName: pa.clinicName,
      clinicCity: pa.clinicCity,
      clinicState: pa.clinicState,
      clinicCountry: pa.clinicCountry,
      lat: showOnMap ? point!.lat : null,
      lng: showOnMap ? point!.lng : null,
      showOnMap,
      teleconsultOnly,
      distanceKm,
      isOnline: false,
      isFavorite: false,
      jitSessionId: null,
      jitIsFree: false,
      jitPriceAmount: 0,
      jitQueueCount: 0,
      estimatedWaitMinutes: null,
      displayPriceCents: Math.round(pa.consultPrice),
      ratingAvg: null,
      ratingCount: 0,
      canReview: false,
    };
  });

  const allMapped = [...mapped, ...analystMapped];

  const withinRadius = (p: (typeof allMapped)[number]) => {
    if (!radiusKm || !center) return true;
    if (p.teleconsultOnly && p.isOnline) return true;
    if (p.distanceKm == null) return !radiusKm;
    return p.distanceKm <= radiusKm;
  };

  const filtered = allMapped.filter(withinRadius);

  filtered.sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
    if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
    if (a.distanceKm != null) return -1;
    if (b.distanceKm != null) return 1;
    return a.name.localeCompare(b.name);
  });

  return {
    center,
    radiusKm,
    specialties: [
      ...specialtyRows.map((s) => s.specialty),
      ...(specialtyRows.some((s) => s.specialty === PSYCHOANALYSIS_SPECIALTY) ? [] : [PSYCHOANALYSIS_SPECIALTY]),
    ],
    favoriteIds: [...favoriteSet],
    professionals: filtered,
    withLocation: filtered.filter((p) => p.showOnMap).length,
    teleconsultOnline: filtered.filter((p) => p.teleconsultOnly && p.isOnline).length,
    total: filtered.length,
  };
}
