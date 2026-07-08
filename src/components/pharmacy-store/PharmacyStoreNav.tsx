"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Settings, Pill, ShoppingBag } from "lucide-react";

const STORE_LINKS = [
  { href: "/farmacias/painel", label: "Painel", icon: LayoutDashboard },
  { href: "/farmacias/estoque", label: "Estoque e preços", icon: Package },
  { href: "/farmacias/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/farmacias/configuracoes", label: "Configurações", icon: Settings },
] as const;

export default function PharmacyStoreNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-slate-200 bg-white sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 flex items-center gap-1 overflow-x-auto">
        <Link href="/farmacias/painel" className="flex items-center gap-2 py-3 pr-4 mr-2 border-r border-slate-200 shrink-0">
          <Pill size={18} className="text-emerald-600" />
          <span className="text-sm font-bold text-slate-800 hidden sm:inline">Doctor8 Farmácias</span>
        </Link>
        {STORE_LINKS.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2 px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                active
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <Icon size={16} />
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
