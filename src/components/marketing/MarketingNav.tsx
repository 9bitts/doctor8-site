"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { BrandLogoLink } from "@/components/brand/BrandLogo";
import type { AudienceId } from "@/lib/audience-landing-content";

const NAV_ITEMS: { id: AudienceId | "mapa"; label: string; href: string }[] = [
  { id: "mapa", label: "Mapa", href: "/marketing" },
  { id: "empresas", label: "Empresas", href: "/empresas" },
  { id: "pacientes", label: "Pacientes", href: "/pacientes" },
  { id: "especialistas", label: "Especialistas", href: "/especialistas" },
  { id: "parceiros", label: "Parceiros", href: "/parceiros" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/empresas") {
    return pathname === "/empresas" || (pathname.startsWith("/empresas/") && !pathname.startsWith("/empresas/colaborador"));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

const PATIENT_HOME = "/";

/** Inactive nav links on dark header — high contrast */
const NAV_IDLE = "text-slate-100 hover:text-white hover:bg-white/10";
const NAV_ACTIVE = "bg-white/15 text-white";

export default function MarketingNav({
  active,
  logoHref = "/marketing",
}: {
  active?: AudienceId;
  logoHref?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const mapaActive = pathname === "/marketing";

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-d8-dark/95 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex h-14 sm:h-16 items-center justify-between gap-4">
          <BrandLogoLink href={logoHref} variant="on-dark" size="md" />

          <nav className="hidden md:flex items-center gap-1" aria-label="Audiências Doctor8">
            {NAV_ITEMS.map((item) => {
              const activeItem =
                item.id === "mapa"
                  ? mapaActive
                  : active
                    ? item.id === active
                    : isActive(pathname, item.href);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeItem ? NAV_ACTIVE : NAV_IDLE
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-2 shrink-0">
            <Link
              href={PATIENT_HOME}
              className="px-4 py-2 text-sm font-medium text-slate-100 hover:text-white transition"
            >
              Paciente
            </Link>
            <Link
              href={PATIENT_HOME}
              className="px-4 py-2 rounded-lg bg-accent-500 text-white text-sm font-semibold hover:bg-accent-600 transition shadow-lg shadow-accent-500/20"
            >
              Agendar Consulta
            </Link>
          </div>

          <button
            type="button"
            className="md:hidden p-2 text-slate-100 hover:text-white"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {open && (
          <nav className="md:hidden pb-4 space-y-1 border-t border-white/10 pt-3" aria-label="Audiências Doctor8">
            {NAV_ITEMS.map((item) => {
              const activeItem =
                item.id === "mapa"
                  ? mapaActive
                  : active
                    ? item.id === active
                    : isActive(pathname, item.href);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium ${
                    activeItem ? NAV_ACTIVE : NAV_IDLE
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="flex gap-2 pt-3 border-t border-white/10 mt-2">
              <Link
                href={PATIENT_HOME}
                onClick={() => setOpen(false)}
                className="flex-1 text-center px-4 py-2.5 rounded-lg border border-white/30 text-sm font-medium text-white"
              >
                Paciente
              </Link>
              <Link
                href={PATIENT_HOME}
                onClick={() => setOpen(false)}
                className="flex-1 text-center px-4 py-2.5 rounded-lg bg-accent-500 text-white text-sm font-semibold"
              >
                Agendar Consulta
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
