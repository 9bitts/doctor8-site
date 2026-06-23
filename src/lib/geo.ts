// Geocoding and distance helpers (OpenStreetMap Nominatim — no API key required).

const NOMINATIM = "https://nominatim.openstreetmap.org";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export async function geocodeAddress(query: string): Promise<GeoPoint | null> {
  const q = query.trim();
  if (!q) return null;
  try {
    const url = `${NOMINATIM}/search?${new URLSearchParams({
      q,
      format: "json",
      limit: "1",
    })}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Doctor8/1.0 (health platform)" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || !data[0]) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

export function buildClinicAddress(parts: {
  clinicAddress?: string | null;
  clinicCity?: string | null;
  clinicState?: string | null;
  clinicCountry?: string | null;
  clinicZip?: string | null;
}): string {
  return [
    parts.clinicAddress,
    parts.clinicCity,
    parts.clinicState,
    parts.clinicZip,
    parts.clinicCountry,
  ]
    .filter(Boolean)
    .join(", ");
}
