// GET — professionals for the patient map (location, online status, credentials).
// Query: lat, lng (optional — for distance sort), q (optional — search location text)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { geocodeAddress, buildClinicAddress, haversineKm, GeoPoint } from "@/lib/geo";
import { getProfessionInfo, formatLicense } from "@/lib/profession-label";

const GEOCODE_BATCH = 8;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");
  const q = searchParams.get("q")?.trim() || "";

  let center: GeoPoint | null = null;
  if (latParam && lngParam) {
    const lat = parseFloat(latParam);
    const lng = parseFloat(lngParam);
    if (!isNaN(lat) && !isNaN(lng)) center = { lat, lng };
  }
  if (!center && q) center = await geocodeAddress(q);

  const professionals = await db.professionalProfile.findMany({
    where: { verified: true },
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
        select: { id: true, specialty: true, isFree: true, priceAmount: true },
        take: 1,
      },
    },
    orderBy: { firstName: "asc" },
    take: 200,
  });

  // Geocode missing coordinates (batched)
  let geocoded = 0;
  for (const pro of professionals) {
    if (geocoded >= GEOCODE_BATCH) break;
    if (pro.clinicLatitude != null && pro.clinicLongitude != null) continue;
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

  const mapped = professionals.map((pro) => {
    const profInfo = getProfessionInfo(pro.specialty);
    const jit = pro.jitSessions[0] ?? null;
    const hasCoords = pro.clinicLatitude != null && pro.clinicLongitude != null;
    const point: GeoPoint | null = hasCoords
      ? { lat: pro.clinicLatitude!, lng: pro.clinicLongitude! }
      : null;

    const displayName = (() => {
      const full = `${pro.firstName} ${pro.lastName}`.trim();
      switch (profInfo.typeKey) {
        case "psychologist":     return `Psic. ${full}`;
        case "nutritionist":     return `Nutr. ${full}`;
        case "physiotherapist":  return `Fisio. ${full}`;
        case "nurse":            return `Enf. ${full}`;
        case "dentist":          return `Dent. ${full}`;
        default:                 return `Dr. ${full}`;
      }
    })();

    return {
      id:               pro.id,
      name:             displayName,
      firstName:        pro.firstName,
      lastName:         pro.lastName,
      specialty:        pro.specialty,
      professionType:   profInfo.typeKey,
      license:          formatLicense(pro.licenseNumber, pro.licenseState, profInfo.councilKey),
      avatarUrl:        pro.avatarUrl,
      consultPrice:     pro.consultPrice,
      currency:         pro.currency,
      acceptsTeleconsult: pro.acceptsTeleconsult,
      acceptsInPerson:    pro.acceptsInPerson,
      clinicName:       pro.clinicName,
      clinicCity:       pro.clinicCity,
      clinicState:      pro.clinicState,
      clinicCountry:    pro.clinicCountry,
      lat:              point?.lat ?? null,
      lng:              point?.lng ?? null,
      distanceKm:       center && point ? Math.round(haversineKm(center, point) * 10) / 10 : null,
      isOnline:         !!jit,
      jitSessionId:     jit?.id ?? null,
      jitIsFree:        jit?.isFree ?? false,
      jitPriceAmount:   jit?.priceAmount ?? 0,
    };
  });

  // Sort: online first, then by distance if center known, then name
  mapped.sort((a, b) => {
    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
    if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
    if (a.distanceKm != null) return -1;
    if (b.distanceKm != null) return 1;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json({
    center,
    professionals: mapped,
    withLocation: mapped.filter((p) => p.lat != null).length,
    total: mapped.length,
  });
}
