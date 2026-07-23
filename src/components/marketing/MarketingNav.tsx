"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { BrandLogoLink } from "@/components/brand/BrandLogo";
import type { AudienceId } from "@/lib/audience-landing-content";
import { MARKETING_STRATEGIES } from "@/lib/marketing-strategy-content";

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
const STRATEGIES_HREF = "/marketing/estrategias";

export default function MarketingNav({
  active,
  logoHref = "/marketing",
}: {
  active?: AudienceId;
  logoHref?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [strategiesOpen, setStrategiesOpen] = useState(false);
  const [strategiesMobileOpen, setStrategiesMobileOpen] = useState(false);
  const strategiesRef = useRef<HTMLDivElement>(null);

  const mapaActive = pathname === "/marketing";
  const strategiesActive =
    pathname === STRATEGIES_HREF || pathname.startsWith(`${STRATEGIES_HREF}/`);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!strategiesRef.current?.contains(e.target as Node)) {
        setStrategiesOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setStrategiesOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    setOpen(false);
    setStrategiesOpen(false);
    setStrategiesMobileOpen(false);
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
                    activeItem
                      ? "bg-white/15 text-white"
                      : "text-slate-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            <div className="relative" ref={strategiesRef}>
              <button
                type="button"
                aria-expanded={strategiesOpen}
                aria-haspopup="menu"
                onClick={() => setStrategiesOpen((v) => !v)}
                className={`inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  strategiesActive
                    ? "bg-white/15 text-white"
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                }`}
              >
                Estratégias
                <ChevronDown
                  size={14}
                  className={`transition-transform ${strategiesOpen ? "rotate-180" : ""}`}
                />
              </button>
              {strategiesOpen && (
                <div
                  role="menu"
                  className="absolute left-0 top-full mt-1 w-56 rounded-xl border border-white/10 bg-slate-900 shadow-xl shadow-black/40 py-2 z-50"
                >
                  <Link
                    href={STRATEGIES_HREF}
                    role="menuitem"
                    className={`block px-4 py-2 text-sm font-semibold border-b border-white/10 mb-1 ${
                      pathname === STRATEGIES_HREF
                        ? "text-accent-400"
                        : "text-white hover:bg-white/10"
                    }`}
                  >
                    Todas as estratégias
                  </Link>
                  {MARKETING_STRATEGIES.map((s) => {
                    const href = `${STRATEGIES_HREF}/${s.slug}`;
                    const itemActive = pathname === href;
                    return (
                      <Link
                        key={s.slug}
                        href={href}
                        role="menuitem"
                        className={`block px-4 py-2 text-sm ${
                          itemActive
                            ? "bg-white/15 text-white"
                            : "text-slate-300 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        <span className="text-slate-500 mr-2 text-xs font-mono">
                          {String(s.order).padStart(2, "0")}
                        </span>
                        {s.navLabel}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          <div className="hidden md:flex items-center gap-2 shrink-0">
            <Link
              href={PATIENT_HOME}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition"
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
            className="md:hidden p-2 text-slate-300 hover:text-white"
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
                    activeItem ? "bg-white/15 text-white" : "text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setStrategiesMobileOpen((v) => !v)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                  strategiesActive ? "bg-white/15 text-white" : "text-slate-300 hover:bg-white/10"
                }`}
                aria-expanded={strategiesMobileOpen}
              >
                Estratégias
                <ChevronDown
                  size={14}
                  className={`transition-transform ${strategiesMobileOpen ? "rotate-180" : ""}`}
                />
              </button>
              {strategiesMobileOpen && (
                <div className="mt-1 ml-2 pl-3 border-l border-white/10 space-y-1">
                  <Link
                    href={STRATEGIES_HREF}
                    onClick={() => setOpen(false)}
                    className={`block px-3 py-2 rounded-lg text-sm font-semibold ${
                      pathname === STRATEGIES_HREF
                        ? "bg-white/15 text-white"
                        : "text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    Todas
                  </Link>
                  {MARKETING_STRATEGIES.map((s) => {
                    const href = `${STRATEGIES_HREF}/${s.slug}`;
                    return (
                      <Link
                        key={s.slug}
                        href={href}
                        onClick={() => setOpen(false)}
                        className={`block px-3 py-2 rounded-lg text-sm ${
                          pathname === href
                            ? "bg-white/15 text-white"
                            : "text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        {s.navLabel}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-3 border-t border-white/10 mt-2">
              <Link
                href={PATIENT_HOME}
                onClick={() => setOpen(false)}
                className="flex-1 text-center px-4 py-2.5 rounded-lg border border-white/20 text-sm text-white"
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
