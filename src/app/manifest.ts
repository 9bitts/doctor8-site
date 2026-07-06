import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Doctor8",
    short_name: "Doctor8",
    description: "Teleconsulta online. Arquitetura alinhada aos princípios LGPD e HIPAA.",
    start_url: "/patient",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#176a88",
    lang: "en",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
