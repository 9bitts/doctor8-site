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
import PwaInstallPrompt from "@/components/humanitarian/PwaInstallPrompt";
import JitSessionHeartbeat from "@/components/professional/JitSessionHeartbeat";
import ProviderDashboardAlerts from "@/components/ProviderDashboardAlerts";
import VolunteerAttendGuideModal from "@/components/VolunteerAttendGuideModal";
import {
  ADMIN_NAV,
  INTEGRATIVE_THERAPIST_NAV,
  ORGANIZATION_NAV,
  PATIENT_DASHBOARD_ENTRY,
  PATIENT_HUMANITARIAN_ENTRY,
  PATIENT_SCHEDULED_VOLUNTEER_ENTRY,
  PATIENT_NAV,
  PATIENT_NAV_GROUPS,
  PLATFORM_NAV_GROUPS_BY_PORTAL,
  PROFESSIONAL_NAV,
  PSYCHOANALYST_NAV,
  PSYCHOLOGIST_NAV,
  type PlatformPortalId,
} from "@/lib/platform-nav-registry";
import { withNavIcons, type DashboardNavItem } from "@/lib/dashboard-nav-icons";
import { ToastProvider } from "@/components/ui/toast";
import { isValidIanaTimeZone } from "@/lib/timezone";
import {
  User, Settings, LogOut, Menu, X, ChevronRight,
} from "lucide-react";

interface NavItem extends DashboardNavItem {}

function resolveProviderPortalId(role: string, isPsychologistPortal: boolean): PlatformPortalId | null {
  if (role === "PROFESSIONAL" && isPsychologistPortal) return "PSYCHOLOGIST";
  if (role === "PROFESSIONAL") return "PROFESSIONAL";
  if (role === "PSYCHOANALYST") return "PSYCHOANALYST";
  if (role === "INTEGRATIVE_THERAPIST") return "INTEGRATIVE_THERAPIST";
  return null;
}

function messagesHrefForPortal(portalId: PlatformPortalId | null): string | null {
  if (!portalId) return null;
  const groups = PLATFORM_NAV_GROUPS_BY_PORTAL[portalId];
  if (!groups) return null;
  return groups.flatMap((g) => g.items).find((i) => i.labelKey === "nav.messages")?.href ?? null;
}

function DashboardInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t, lang } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [role, setRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("User");
  const [userId, setUserId] = useState<string>("");
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch("/api/auth/session");
        const session = await res.json();
        if (session?.user?.role) setRole(session.user.role);
        if (session?.user?.id) setUserId(session.user.id);
        if (session?.user?.name) setUserName(session.user.name);
        else if (session?.user?.email) setUserName(session.user.email.split("@")[0]);
      } catch { /* keep defaults */ }
      finally { setSessionLoaded(true); }
    }
    loadSession();
  }, []);

  useEffect(() => {
    const providerRoles = ["PATIENT", "PROFESSIONAL", "PSYCHOANALYST", "INTEGRATIVE_THERAPIST"];
    if (!sessionLoaded || !userId || !providerRoles.includes(role)) return;
    const guardKey = `doctor8.tz.sync.${userId}`;
    if (sessionStorage.getItem(guardKey)) return;

    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!isValidIanaTimeZone(browserTz)) {
      sessionStorage.setItem(guardKey, "1");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/timezone");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data.timezone === browserTz) {
          sessionStorage.setItem(guardKey, "1");
          return;
        }
        await fetch("/api/user/timezone", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timezone: browserTz }),
        });
        if (!cancelled) sessionStorage.setItem(guardKey, "1");
      } catch {
        /* silent — retry on next session */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [role, userId, sessionLoaded]);

  useEffect(() => {
    if (!sessionLoaded) return;
    const portalId = resolveProviderPortalId(role, pathname.startsWith("/psychologist"));
    const messagesHref =
      role === "PATIENT"
        ? "/patient/messages"
        : messagesHrefForPortal(portalId);
    if (!messagesHref) return;

    async function loadUnread() {
      try {
        const res = await fetch("/api/messages");
        if (!res.ok) return;
        const data = await res.json();
        const total = (data.conversations || []).reduce(
          (sum: number, c: { unread?: number }) => sum + (c.unread || 0),
          0,
        );
        setUnreadMessages(total);
      } catch { /* silent */ }
    }

    loadUnread();
    const interval = setInterval(loadUnread, 30000);
    return () => clearInterval(interval);
  }, [role, sessionLoaded, pathname]);

  const isPsychologistPortal = pathname.startsWith("/psychologist");
  const providerPortalId = resolveProviderPortalId(role, isPsychologistPortal);

  const navItems: NavItem[] =
    role === "ADMIN" ? withNavIcons(ADMIN_NAV)
    : role === "ORGANIZATION" ? withNavIcons(ORGANIZATION_NAV)
    : isPsychologistPortal ? withNavIcons(PSYCHOLOGIST_NAV)
    : role === "PROFESSIONAL" ? withNavIcons(PROFESSIONAL_NAV)
    : role === "PSYCHOANALYST" ? withNavIcons(PSYCHOANALYST_NAV)
    : role === "INTEGRATIVE_THERAPIST" ? withNavIcons(INTEGRATIVE_THERAPIST_NAV)
    : withNavIcons(PATIENT_NAV);
  const providerGroupedNav = providerPortalId
    ? (PLATFORM_NAV_GROUPS_BY_PORTAL[providerPortalId] ?? []).map((group) => ({
        ...group,
        items: withNavIcons(group.items),
      }))
    : [];
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
  const isPatient = role === "PATIENT";
  const patientDashboardItem = withNavIcons([PATIENT_DASHBOARD_ENTRY])[0];
  const patientHumanitarianItem = withNavIcons([PATIENT_HUMANITARIAN_ENTRY])[0];
  const patientScheduledVolunteerItem = withNavIcons([PATIENT_SCHEDULED_VOLUNTEER_ENTRY])[0];
  const patientGroupedNav = PATIENT_NAV_GROUPS.map((group) => ({
    ...group,
    items: withNavIcons(group.items),
  }));
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

  function renderNavLink(item: NavItem, badge?: number, accentRed = false) {
    const isActive = pathname === item.href ||
      (item.href !== `/${role.toLowerCase()}` && pathname.startsWith(item.href));
    const redActive = "bg-red-500/10 text-red-400 border border-red-500/20";
    const redIdle = "text-red-500 hover:text-red-400 hover:bg-red-500/10";
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setSidebarOpen(false)}
        className={`
          flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
          ${isActive
            ? (accentRed ? redActive : navActive)
            : (accentRed ? redIdle : "text-slate-400 hover:text-white hover:bg-slate-800")}
        `}
      >
        {item.icon}
        <span className="flex-1 min-w-0 truncate">{t(item.labelKey)}</span>
        {badge && badge > 0 ? (
          <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
        {isActive && <ChevronRight size={14} className="ml-auto shrink-0" />}
      </Link>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-x-hidden">
      <JitSessionHeartbeat enabled={isProfessional || isPsychologist} />
      <VolunteerAttendGuideModal />
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
            {!sessionLoaded ? (
              <div className="px-3 py-6 space-y-3 animate-pulse">
                <div className="h-3 bg-slate-800 rounded w-24" />
                <div className="h-9 bg-slate-800 rounded-xl" />
                <div className="h-9 bg-slate-800 rounded-xl" />
                <div className="h-9 bg-slate-800 rounded-xl" />
              </div>
            ) : isPatient ? (
              <>
                {renderNavLink(patientHumanitarianItem, undefined, true)}
                {renderNavLink(patientScheduledVolunteerItem, undefined, true)}
                {renderNavLink(patientDashboardItem)}
                {patientGroupedNav.map((group) => (
                  <div key={group.labelKey}>
                    <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      {t(group.labelKey)}
                    </p>
                    <div className="space-y-1">
                      {group.items.map((item) =>
                        renderNavLink(
                          item,
                          item.href === "/patient/messages" ? unreadMessages : undefined,
                        ),
                      )}
                    </div>
                  </div>
                ))}
              </>
            ) : providerGroupedNav.length > 0 ? (
              providerGroupedNav.map((group) => (
                <div key={group.labelKey}>
                  <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {t(group.labelKey)}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((item) =>
                      renderNavLink(
                        item,
                        item.labelKey === "nav.messages" ? unreadMessages : undefined,
                        item.labelKey === "nav.humanitarianVolunteer",
                      ),
                    )}
                  </div>
                </div>
              ))
            ) : (
              navItems.map((item) => renderNavLink(item))
            )}
          </div>
        </nav>

        <div className="px-3 py-4 border-t border-slate-700/50 space-y-1">
          <LanguageSwitcher variant="sidebar" />
          <button
            onClick={() => {
              clearSensitiveClientState(userId || undefined);
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
          {role === "PATIENT" && userId && (
            <PwaInstallPrompt lang={lang} variant="patient" userId={userId} />
          )}
          <ProviderDashboardAlerts role={role} />
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <DashboardInner>{children}</DashboardInner>
    </ToastProvider>
  );
}
