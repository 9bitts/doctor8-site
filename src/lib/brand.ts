/** Shared Doctor8 wordmark asset paths (public/). */
export const BRAND_LOGO_PATH = "/branding/doctor8-logo.png";
export const BRAND_LOGO_WHITE_PATH = "/branding/doctor8-logo-white.png";

export function brandLogoAbsoluteUrl(appUrl: string, white = false): string {
  const base = appUrl.trim().replace(/\/$/, "");
  return `${base}${white ? BRAND_LOGO_WHITE_PATH : BRAND_LOGO_PATH}`;
}

/** HTML img for transactional emails (gradient header background). */
export function emailBrandLogoImg(appUrl: string, height = 36): string {
  const url = brandLogoAbsoluteUrl(appUrl);
  return `<img src="${url}" alt="Doctor8" height="${height}" style="display:block;margin:0 auto;height:${height}px;width:auto;max-width:200px;" />`;
}

/** HTML img for printable patient PDFs. */
export function printBrandLogoImg(appUrl: string, height = 28): string {
  const url = brandLogoAbsoluteUrl(appUrl);
  return `<img src="${url}" alt="Doctor8" style="height:${height}px;width:auto;display:block;" />`;
}
