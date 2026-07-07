// Doctor Image — public profile personalization types, parsing, and theme helpers.

export const DOCTOR_IMAGE_THEME_PRESETS = [
  "default",
  "clinical",
  "warm",
  "modern",
  "nature",
] as const;

export type DoctorImageThemePreset = (typeof DOCTOR_IMAGE_THEME_PRESETS)[number];

export const SOCIAL_LINK_KEYS = [
  "instagram",
  "facebook",
  "linkedin",
  "youtube",
  "tiktok",
  "twitter",
] as const;

export type SocialLinkKey = (typeof SOCIAL_LINK_KEYS)[number];

export type DoctorImageSocialLinks = Partial<Record<SocialLinkKey, string>>;

export type DoctorImageContentBlock = {
  id: string;
  title: string;
  body: string;
  order: number;
};

export type DoctorImageData = {
  headline: string | null;
  website: string | null;
  whatsappNumber: string | null;
  socialLinks: DoctorImageSocialLinks;
  coverImageUrl: string | null;
  galleryImages: string[];
  videoUrl: string | null;
  themePreset: DoctorImageThemePreset;
  accentColor: string | null;
  contentBlocks: DoctorImageContentBlock[];
};

export const MAX_GALLERY_IMAGES = 8;
export const MAX_CONTENT_BLOCKS = 10;
export const MAX_HEADLINE_LENGTH = 160;
export const MAX_BLOCK_TITLE_LENGTH = 120;
export const MAX_BLOCK_BODY_LENGTH = 4000;

const THEME_COLORS: Record<DoctorImageThemePreset, string> = {
  default: "#0d9488",
  clinical: "#2563eb",
  warm: "#d97706",
  modern: "#7c3aed",
  nature: "#059669",
};

export function resolveAccentColor(
  preset: DoctorImageThemePreset,
  accentColor: string | null
): string {
  if (accentColor && isValidHexColor(accentColor)) return accentColor;
  return THEME_COLORS[preset] ?? THEME_COLORS.default;
}

export function isValidHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function parseUrl(raw: unknown): string | null | false {
  if (raw === null || raw === undefined || raw === "") return null;
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

function parseWhatsApp(raw: unknown): string | null | false {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw !== "string") return false;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length < 10 || digits.length > 15) return false;
  return digits;
}

function parseHeadline(raw: unknown): string | null | false {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw !== "string") return false;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_HEADLINE_LENGTH) return false;
  return trimmed;
}

function parseThemePreset(raw: unknown): DoctorImageThemePreset | false {
  if (raw === null || raw === undefined || raw === "") return "default";
  if (typeof raw !== "string") return false;
  return DOCTOR_IMAGE_THEME_PRESETS.includes(raw as DoctorImageThemePreset)
    ? (raw as DoctorImageThemePreset)
    : false;
}

function parseAccentColor(raw: unknown): string | null | false {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw !== "string") return false;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return isValidHexColor(trimmed) ? trimmed : false;
}

function parseImageDataUrl(raw: unknown): string | null | false {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw !== "string") return false;
  if (!raw.startsWith("data:image/")) return false;
  if (raw.length > 900_000) return false;
  return raw;
}

function parseGallery(raw: unknown): string[] | false {
  if (raw === null || raw === undefined) return [];
  if (!Array.isArray(raw)) return false;
  const images: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string" || !item.startsWith("data:image/")) return false;
    if (item.length > 900_000) return false;
    images.push(item);
  }
  if (images.length > MAX_GALLERY_IMAGES) return false;
  return images;
}

function parseSocialLinks(raw: unknown): DoctorImageSocialLinks | false {
  if (raw === null || raw === undefined) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) return false;
  const result: DoctorImageSocialLinks = {};
  for (const key of SOCIAL_LINK_KEYS) {
    if (!(key in (raw as Record<string, unknown>))) continue;
    const parsed = parseUrl((raw as Record<string, unknown>)[key]);
    if (parsed === false) return false;
    if (parsed) result[key] = parsed;
  }
  return result;
}

function parseContentBlocks(raw: unknown): DoctorImageContentBlock[] | false {
  if (raw === null || raw === undefined) return [];
  if (!Array.isArray(raw)) return false;
  const blocks: DoctorImageContentBlock[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return false;
    const block = item as Record<string, unknown>;
    const id = typeof block.id === "string" ? block.id : "";
    const title = typeof block.title === "string" ? block.title.trim() : "";
    const body = typeof block.body === "string" ? block.body.trim() : "";
    const order = typeof block.order === "number" ? block.order : blocks.length;
    if (!id || !title) return false;
    if (title.length > MAX_BLOCK_TITLE_LENGTH) return false;
    if (body.length > MAX_BLOCK_BODY_LENGTH) return false;
    blocks.push({ id, title, body, order });
  }
  if (blocks.length > MAX_CONTENT_BLOCKS) return false;
  return blocks.sort((a, b) => a.order - b.order);
}

/** Extract embed URL from YouTube or Vimeo watch/share links. */
export function parseVideoEmbedUrl(raw: unknown): string | null | false {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw !== "string") return false;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v");
      if (id && /^[\w-]{11}$/.test(id)) {
        return `https://www.youtube.com/embed/${id}`;
      }
      const shorts = u.pathname.match(/^\/shorts\/([\w-]{11})$/);
      if (shorts) return `https://www.youtube.com/embed/${shorts[1]}`;
    }

    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      if (id && /^[\w-]{11}$/.test(id)) {
        return `https://www.youtube.com/embed/${id}`;
      }
    }

    if (host === "vimeo.com") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      if (id && /^\d+$/.test(id)) {
        return `https://player.vimeo.com/video/${id}`;
      }
    }

    if (host === "player.vimeo.com") {
      const match = u.pathname.match(/^\/video\/(\d+)/);
      if (match) return `https://player.vimeo.com/video/${match[1]}`;
    }

    if (
      (host === "youtube.com" && u.pathname.startsWith("/embed/")) ||
      (host === "player.vimeo.com" && u.pathname.startsWith("/video/"))
    ) {
      return u.toString();
    }
  } catch {
    return false;
  }

  return false;
}

export type DoctorImageCardFields = {
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
};

export function serializeDoctorImage(card: DoctorImageCardFields): DoctorImageData {
  const socialLinks = parseSocialLinks(card.socialLinks);
  const galleryImages = parseGallery(card.galleryImages);
  const contentBlocks = parseContentBlocks(card.contentBlocks);
  const preset = parseThemePreset(card.themePreset);

  return {
    headline: card.headline,
    website: card.website,
    whatsappNumber: card.whatsappNumber,
    socialLinks: socialLinks === false ? {} : socialLinks,
    coverImageUrl: card.coverImageUrl,
    galleryImages: galleryImages === false ? [] : galleryImages,
    videoUrl: card.videoUrl,
    themePreset: preset === false ? "default" : preset,
    accentColor: card.accentColor,
    contentBlocks: contentBlocks === false ? [] : contentBlocks,
  };
}

export type DoctorImagePatchResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

/** Parse PATCH body fields for Doctor Image. Returns Prisma update data. */
export function parseDoctorImagePatch(body: Record<string, unknown>): DoctorImagePatchResult {
  const data: Record<string, unknown> = {};

  if ("headline" in body) {
    const parsed = parseHeadline(body.headline);
    if (parsed === false) return { ok: false, error: "Invalid headline" };
    data.headline = parsed;
  }

  if ("website" in body) {
    const parsed = parseUrl(body.website);
    if (parsed === false) return { ok: false, error: "Invalid website URL" };
    data.website = parsed;
  }

  if ("whatsappNumber" in body) {
    const parsed = parseWhatsApp(body.whatsappNumber);
    if (parsed === false) return { ok: false, error: "Invalid WhatsApp number" };
    data.whatsappNumber = parsed;
  }

  if ("socialLinks" in body) {
    const parsed = parseSocialLinks(body.socialLinks);
    if (parsed === false) return { ok: false, error: "Invalid social links" };
    data.socialLinks = parsed;
  }

  if ("coverImageUrl" in body) {
    const parsed = parseImageDataUrl(body.coverImageUrl);
    if (parsed === false) return { ok: false, error: "Invalid cover image" };
    data.coverImageUrl = parsed;
  }

  if ("galleryImages" in body) {
    const parsed = parseGallery(body.galleryImages);
    if (parsed === false) return { ok: false, error: "Invalid gallery images" };
    data.galleryImages = parsed;
  }

  if ("videoUrl" in body) {
    const parsed = parseVideoEmbedUrl(body.videoUrl);
    if (parsed === false) return { ok: false, error: "Invalid video URL" };
    data.videoUrl = parsed;
  }

  if ("themePreset" in body) {
    const parsed = parseThemePreset(body.themePreset);
    if (parsed === false) return { ok: false, error: "Invalid theme" };
    data.themePreset = parsed;
  }

  if ("accentColor" in body) {
    const parsed = parseAccentColor(body.accentColor);
    if (parsed === false) return { ok: false, error: "Invalid accent color" };
    data.accentColor = parsed;
  }

  if ("contentBlocks" in body) {
    const parsed = parseContentBlocks(body.contentBlocks);
    if (parsed === false) return { ok: false, error: "Invalid content blocks" };
    data.contentBlocks = parsed;
  }

  return { ok: true, data };
}

export function buildWhatsAppUrl(number: string, message?: string): string {
  const base = `https://wa.me/${number.replace(/\D/g, "")}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

export function hasDoctorImageContent(data: DoctorImageData): boolean {
  return !!(
    data.headline ||
    data.website ||
    data.whatsappNumber ||
    Object.keys(data.socialLinks).length > 0 ||
    data.coverImageUrl ||
    data.galleryImages.length > 0 ||
    data.videoUrl ||
    data.contentBlocks.length > 0 ||
    (data.themePreset !== "default" || data.accentColor)
  );
}
