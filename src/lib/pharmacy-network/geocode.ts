const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";

export type GeoPoint = { latitude: number; longitude: number };

function buildAddressQuery(parts: {
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string;
}): string {
  return [
    parts.street,
    parts.number,
    parts.neighborhood,
    parts.city,
    parts.state,
    parts.zip,
    parts.country || "Brasil",
  ]
    .filter(Boolean)
    .join(", ");
}

export async function geocodeAddress(parts: {
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): Promise<GeoPoint | null> {
  const q = buildAddressQuery(parts);
  if (!q || q.length < 8) return null;

  try {
    const url = new URL(NOMINATIM_BASE);
    url.searchParams.set("q", q);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "br");

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "Doctor8-Pharmacy/1.0 (contact@doctor8.org)" },
      next: { revalidate: 86400 * 7 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { lat?: string; lon?: string }[];
    const hit = data[0];
    if (!hit?.lat || !hit?.lon) return null;
    return { latitude: parseFloat(hit.lat), longitude: parseFloat(hit.lon) };
  } catch {
    return null;
  }
}

export async function geocodeCep(
  cep: string,
  city?: string,
  state?: string,
): Promise<GeoPoint | null> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  return geocodeAddress({
    zip: digits,
    city: city || undefined,
    state: state || undefined,
  });
}

/** Haversine distance in km */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
