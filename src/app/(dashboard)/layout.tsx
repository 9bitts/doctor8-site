"use client";
// src/app/(dashboard)/layout.tsx
// Shared layout for all dashboard pages — patient and professional and admin.
// Reads role + language from the session; menu adapts and is translated.

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import NotificationBell from "@/components/NotificationBell";
import PushSubscribe from "@/components/PushSubscribe";
import { useI18n } from "@/lib/i18n/I18nProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import OrganizationScopeSwitcher from "@/components/organization/OrganizationScopeSwitcher";
import ProfessionalScopeSwitcher from "@/components/professional/ProfessionalScopeSwitcher";
import { resolveLoginPathForSession } from "@/lib/auth-portals";
import { clearSensitiveClientState } from "@/lib/logout-cleanup";
import { BrandLogo, BrandLogoLink } from "@/components/brand/BrandLogo";
import BrVeSolidarityBadge from "@/components/BrVeSolidarityBadge";
import JitSessionHeartbeat from "@/components/professional/JitSessionHeartbeat";
import ProviderDashboardAlerts from "@/components/ProviderDashboardAlerts";
import {
  ADMIN_NAV,
  INTEGRATIVE_THERAPIST_NAV,
  ORGANIZATION_NAV,
  PATIENT_NAV,
  PROFESSIONAL_NAV,
  PSYCHOANALYST_NAV,
  PSYCHOLOGIST_NAV,
} from "@/lib/platform-nav-registry";
import { withNavIcons, type DashboardNavItem } from "@/lib/dashboard-nav-icons";
import {
  User, Settings, LogOut, Menu, X, ChevronRight,
} from "lucide-react";

interface NavItem extends DashboardNavItem {}

function DashboardInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [role, setRole] = useState<string>("PATIENT");
  const [userName, setUserName] = useState<string>("User");

  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch("/api/auth/session");
        const session = await res.json();
        if (session?.user?.role) setRole(session.user.role);
        if (session?.user?.name) setUserName(session.user.name);
        else if (session?.user?.email) setUserName(session.user.email.split("@")[0]);
      } catch { /* keep defaults */ }
    }
    loadSession();
  }, []);

  const isPsychologistPortal = pathname.startsWith("/psychologist");

  const navItems: NavItem[] =
    role === "ADMIN" ? withNavIcons(ADMIN_NAV)
    : role === "ORGANIZATION" ? withNavIcons(ORGANIZATION_NAV)
    : isPsychologistPortal ? withNavIcons(PSYCHOLOGIST_NAV)
    : role === "PROFESSIONAL" ? withNavIcons(PROFESSIONAL_NAV)
    : role === "PSYCHOANALYST" ? withNavIcons(PSYCHOANALYST_NAV)
    : role === "INTEGRATIVE_THERAPIST" ? withNavIcons(INTEGRATIVE_THERAPIST_NAV)
    : withNavIcons(PATIENT_NAV);
  const roleLabel =
    role === "ORGANIZATION" ? t("role.organization")
    : isPsychologistPortal ? t("role.psychologist")
    : role === "PROFESSIONAL" ? t("role.professional")
    : role === "PSYCHOANALYST" ? t("role.psychoanalyst")
    : role === "INTEGRATIVE_THERAPIST" ? t("role.integrativeTherapist")
    : role === "ADMIN" ? t("role.admin")
    : t("role.patient");
  const isProfessional = role === "PROFESSIONAL" && !isPsychologistPortal;
  const isPsychologist = isPsychologistPortal;
  const isPsychoanalyst = role === "PSYCHOANALYST";
  const isIntegrativeTherapist = role === "INTEGRATIVE_THERAPIST";
  const isOrganization = role === "ORGANIZATION";
  const navActive = isOrganization
    ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
    : isPsychologist
      ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
    : isProfessional
    ? "bg-brand-500/10 text-brand-400 border border-brand-500/20"
    : isPsychoanalyst
      ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
      : isIntegrativeTherapist
        ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
  const avatarBg = isOrganization ? "bg-indigo-500/20" : isPsychologist ? "bg-violet-500/20" : isProfessional ? "bg-brand-500/20" : isPsychoanalyst ? "bg-violet-500/20" : isIntegrativeTherapist ? "bg-teal-500/20" : "bg-emerald-500/20";
  const avatarIcon = isOrganization ? "text-indigo-400" : isPsychologist ? "text-violet-400" : isProfessional ? "text-brand-400" : isPsychoanalyst ? "text-violet-400" : isIntegrativeTherapist ? "text-teal-400" : "text-emerald-400";
  const headerAvatar = isOrganization ? "bg-indigo-500" : isPsychologist ? "bg-violet-500" : isProfessional ? "bg-brand-500" : isPsychoanalyst ? "bg-violet-500" : isIntegrativeTherapist ? "bg-teal-500" : "bg-emerald-500";
  const signOutHref = resolveLoginPathForSession(role, pathname, isPsychologistPortal);

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-x-hidden">
      <JitSessionHeartbeat enabled={isProfessional || isPsychologist} />
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-slate-900 z-40 flex flex-col
          transform transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700/50">
          {isPsychologist ? (
            <Link href="/psychologist" className="text-lg font-black text-white tracking-tight uppercase">
              {t("portal.psychologyBrand")}
            </Link>
          ) : isPsychoanalyst ? (
            <Link href="/psychoanalyst" className="text-lg font-black text-white tracking-tight uppercase">
              Psicanálise
            </Link>
          ) : (
            <BrandLogoLink href="/" variant="on-dark" size="md" />
          )}
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="px-4 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${avatarBg} flex items-center justify-center`}>
              <User size={16} className={avatarIcon} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{userName}</p>
              <p className="text-xs text-slate-400">{roleLabel}</p>
            </div>
          </div>
        </div>

        <BrVeSolidarityBadge />

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== `/${role.toLowerCase()}` && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                    ${isActive ? navActive : "text-slate-400 hover:text-white hover:bg-slate-800"}
                  `}
                >
                  {item.icon}
                  {t(item.labelKey)}
                  {isActive && <ChevronRight size={14} className="ml-auto" />}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="px-3 py-4 border-t border-slate-700/50 space-y-1">
          <LanguageSwitcher variant="sidebar" />
          <button
            onClick={() => {
              clearSensitiveClientState();
              signOut({ callbackUrl: signOutHref });
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all w-full"
          >
            <LogOut size={18} />
            {t("common.signOut")}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-4 lg:px-8 py-4 flex items-center gap-3 sticky top-0 z-20 min-w-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-700 shrink-0">
            <Menu size={22} />
          </button>

          <div className="lg:hidden flex-1 min-w-0 text-center">
            <span className="text-lg font-bold text-slate-900 uppercase">
              {isPsychologist ? (
                t("portal.psychologyBrand")
              ) : isPsychoanalyst ? (
                "Psicanálise"
              ) : (
                <BrandLogo variant="on-light" size="sm" className="inline-block" />
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto shrink-0">
            {isOrganization && <OrganizationScopeSwitcher />}
            {isProfessional && <ProfessionalScopeSwitcher />}
            <LanguageSwitcher variant="header" />
            <NotificationBell />
            <div className={`w-8 h-8 rounded-xl ${headerAvatar} flex items-center justify-center text-white text-sm font-bold`}>
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto overflow-x-hidden min-w-0">
          <PushSubscribe />
          <ProviderDashboardAlerts role={role} />
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardInner>{children}</DashboardInner>;
}
