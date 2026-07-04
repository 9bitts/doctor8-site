import type { MetadataRoute } from "next";
import { APP_BASE_URL } from "@/lib/public-slugs";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/privacy",
        "/terms",
        "/hipaa",
        "/cookies",
        "/tcle-telemedicina",
        "/acura-voluntariado",
        "/sos-venezuela",
        "/especialistas/",
        "/dr/",
      ],
      disallow: [
        "/patient/",
        "/professional/",
        "/psychologist/",
        "/psychoanalyst/",
        "/integrative-therapist/",
        "/organization/",
        "/humanitarian/",
        "/admin/",
        "/login",
        "/register",
        "/api/",
        "/share/",
        "/embed/",
      ],
    },
    sitemap: `${APP_BASE_URL}/sitemap.xml`,
  };
}
