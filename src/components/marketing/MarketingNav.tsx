"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { BrandLogoLink } from "@/components/brand/BrandLogo";
import type { AudienceId } from "@/lib/audience-landing-content";

const NAV_ITEMS: { id: AudienceId; label: string; href: string }[] = [
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

export default function MarketingNav({ active }: { active?: AudienceId }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-d8-dark/95 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex h-14 sm:h-16 items-center justify-between gap-4">
          <BrandLogoLink href="/empresas" variant="on-dark" size="md" />

          <nav className="hidden md:flex items-center gap-1" aria-label="Audiências Doctor8">
            {NAV_ITEMS.map((item) => {
              const activeItem = active ? item.id === active : isActive(pathname, item.href);
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
          </nav>

          <div className="hidden md:flex items-center gap-2 shrink-0">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition"
            >
              Entrar
            </Link>
            <Link
              href="/empresas/cadastro"
              className="px-4 py-2 rounded-lg bg-accent-500 text-white text-sm font-semibold hover:bg-accent-600 transition shadow-lg shadow-accent-500/20"
            >
              Criar conta
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
              const activeItem = active ? item.id === active : isActive(pathname, item.href);
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
            <div className="flex gap-2 pt-3 border-t border-white/10 mt-2">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex-1 text-center px-4 py-2.5 rounded-lg border border-white/20 text-sm text-white"
              >
                Entrar
              </Link>
              <Link
                href="/empresas/cadastro"
                onClick={() => setOpen(false)}
                className="flex-1 text-center px-4 py-2.5 rounded-lg bg-accent-500 text-white text-sm font-semibold"
              >
                Criar conta
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
