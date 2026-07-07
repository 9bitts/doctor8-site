// Shared helpers for public-profile GET/PATCH routes.

import {
  parseDoctorImagePatch,
  serializeDoctorImage,
  type DoctorImageData,
} from "@/lib/doctor-image";

export function parseGoogleBusinessUrl(raw: unknown): string | null | false {
  if (raw === null || raw === "") return null;
  if (typeof raw !== "string") return false;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return u.toString();
  } catch {
    return false;
  }
}

type VirtualCardRow = {
  headline: string | null;
  website: string | null;
  whatsappNumber: string | null;
  socialLinks: unknown;
  coverImageUrl: string | null;
  galleryImages: unknown;
  videoUrl: string | null;
  themePreset: string;
  accentColor: string | null;
  contentBlocks: unknown;
  googleBusinessUrl: string | null;
};

export function doctorImageFromCard(card: VirtualCardRow): DoctorImageData {
  return serializeDoctorImage(card);
}

export type PublicProfilePatchFields = {
  isPublic?: boolean;
  googleBusinessUrl?: string | null;
} & Record<string, unknown>;

export function parsePublicProfilePatch(
  body: Record<string, unknown>
): { ok: true; data: PublicProfilePatchFields } | { ok: false; error: string } {
  const data: PublicProfilePatchFields = {};

  if (typeof body.isPublic === "boolean") {
    data.isPublic = body.isPublic;
  }

  if ("googleBusinessUrl" in body) {
    const parsed = parseGoogleBusinessUrl(body.googleBusinessUrl);
    if (parsed === false) {
      return { ok: false, error: "Invalid Google Business URL" };
    }
    data.googleBusinessUrl = parsed;
  }

  const doctorImage = parseDoctorImagePatch(body);
  if (!doctorImage.ok) {
    return { ok: false, error: doctorImage.error };
  }

  Object.assign(data, doctorImage.data);

  if (Object.keys(data).length === 0) {
    return { ok: false, error: "No valid fields to update" };
  }

  return { ok: true, data };
}
