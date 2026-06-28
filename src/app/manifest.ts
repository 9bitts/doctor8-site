import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Doctor8 ? Atendimento humanit?rio",
    short_name: "Doctor8 SOS",
    description: "Triagem, fila e telemedicina humanit?ria",
    start_url: "/sos-venezuela",
    scope: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#059669",
    lang: "es",
    icons: [
      {
        src: "/icons/icon-192.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
