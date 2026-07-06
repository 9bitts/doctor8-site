import type { Metadata } from "next";

/** Public-facing copy — describes safeguards, not certified compliance. */
export const SITE_TITLE = "Doctor8 — Plataforma de Saúde Segura";
export const SITE_DESCRIPTION =
  "Teleconsulta online com especialistas. Arquitetura desenhada seguindo os princípios da LGPD e HIPAA.";

export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://app.doctor8.org").replace(/\/$/, "");
}

export function buildRootMetadata(overrides?: Partial<Metadata>): Metadata {
  const siteUrl = getSiteUrl();
  return {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    metadataBase: new URL(siteUrl),
    openGraph: {
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      siteName: "Doctor8",
      type: "website",
      locale: "pt_BR",
      images: [{ url: "/branding/doctor8-logo.png", width: 512, height: 512, alt: "Doctor8" }],
    },
    twitter: {
      card: "summary",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      images: ["/branding/doctor8-logo.png"],
    },
    ...overrides,
  };
}
