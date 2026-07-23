import Link from "next/link";
import { BrandLogoLink } from "@/components/brand/BrandLogo";

/** Logo + CTA bar that sits in document flow (never overlays hero text). */
export default function IntentLandingHeader() {
  return (
    <div className="relative z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur-sm pt-[env(safe-area-inset-top)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between gap-3">
        <BrandLogoLink href="/" variant="on-dark" size="md" />
        <Link
          href="/register"
          className="shrink-0 rounded-lg bg-accent-500 px-3.5 sm:px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-600 transition shadow-lg shadow-accent-500/20 min-h-11 inline-flex items-center"
        >
          Agendar Consulta
        </Link>
      </div>
    </div>
  );
}
