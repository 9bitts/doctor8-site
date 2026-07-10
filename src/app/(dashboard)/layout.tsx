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
import EightBetaLink from "@/components/EightBetaLink";
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
  ANGEL_NAV,
  INTEGRATIVE_THERAPIST_NAV,
  NUTRITIONIST_NAV,
  NURSE_NAV,
  PHARMACIST_NAV,
  DENTIST_NAV,
  ORGANIZATION_NAV,
  EMPLOYER_NAV,
  OCCUPATIONAL_PHYSICIAN_NAV,
  PHARMACY_STORE_NAV,
  LABORATORY_NAV,
  PHARMACY_NETWORK_PHARMACIST_NAV,
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
import LegalAcceptanceGate from "@/components/compliance/LegalAcceptanceGate";
import VoiceAssistantPromoBanner from "@/components/voice-assistant/VoiceAssistantPromoBanner";
import VoiceAssistantShell from "@/components/voice-assistant/VoiceAssistantShell";
import { resolveVoicePortalFromPathname } from "@/lib/voice-assistant/portal-resolver";
import { isValidIanaTimeZone } from "@/lib/timezone";
import { hasAnyNaturalMedicinePractice } from "@/lib/natural-medicine/config";
import {
  User, Settings, LogOut, Menu, X, ChevronRight,
} from "lucide-react";

interface NavItem extends DashboardNavItem {}

function resolveProviderPortalId(
  role: string,
  opts: { isPsychologistPortal: boolean; isNutritionistPortal: boolean; isNursePortal: boolean; isPharmacistPortal: boolean; isDentistPortal: boolean },
): PlatformPortalId | null {
  if (role === "PROFESSIONAL" && opts.isPsychologistPortal) return "PSYCHOLOGIST";
  if (role === "PROFESSIONAL" && opts.isNutritionistPortal) return "NUTRITIONIST";
  if (role === "PROFESSIONAL" && opts.isNursePortal) return "NURSE";
  if (role === "PROFESSIONAL" && opts.isPharmacistPortal) return "PHARMACIST";
  if (role === "PROFESSIONAL" && opts.isDentistPortal) return "DENTIST";
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
  const [showNaturalMedicineNav, setShowNaturalMedicineNav] = useState(true);

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
    try {
      if (sessionStorage.getItem(guardKey)) return;
    } catch (err) {
      console.warn("sessionStorage unavailable:", err);
      return;
    }

    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!isValidIanaTimeZone(browserTz)) {
      try {
        sessionStorage.setItem(guardKey, "1");
      } catch (err) {
        console.warn("sessionStorage unavailable:", err);
      }
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/timezone");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data.timezone === browserTz) {
          try {
            sessionStorage.setItem(guardKey, "1");
          } catch (err) {
            console.warn("sessionStorage unavailable:", err);
          }
          return;
        }
        await fetch("/api/user/timezone", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timezone: browserTz }),
        });
        if (!cancelled) {
          try {
            sessionStorage.setItem(guardKey, "1");
          } catch (err) {
            console.warn("sessionStorage unavailable:", err);
          }
        }
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
    const portalId = resolveProviderPortalId(role, {
      isPsychologistPortal: pathname.startsWith("/psychologist"),
      isNutritionistPortal: pathname.startsWith("/nutricionista"),
      isNursePortal: pathname.startsWith("/enfermeiro"),
      isPharmacistPortal: pathname.startsWith("/farmaceutico"),
      isDentistPortal: pathname.startsWith("/odontologo"),
    });
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

  useEffect(() => {
    if (role !== "INTEGRATIVE_THERAPIST" || !sessionLoaded) {
      setShowNaturalMedicineNav(true);
      return;
    }
    fetch("/api/integrative-therapist/profile")
      .then((r) => r.json())
      .then((data) => {
        const practices = data?.profile?.picsPractices ?? [];
        setShowNaturalMedicineNav(hasAnyNaturalMedicinePractice(practices));
      })
      .catch(() => setShowNaturalMedicineNav(false));
  }, [role, sessionLoaded]);

  const isPsychologistPortal = pathname.startsWith("/psychologist");
  const isNutritionistPortal = pathname.startsWith("/nutricionista");
  const isNursePortal = pathname.startsWith("/enfermeiro");
  const isPharmacistPortal = pathname.startsWith("/farmaceutico");
  const isPharmacyNetworkPharmacistPortal = pathname.startsWith("/farmacias/farmaceutico");
  const isPharmacyValidateHub = pathname === "/farmacias/validar";
  const isPharmacyStorePortal =
    pathname.startsWith("/farmacias") && !isPharmacyNetworkPharmacistPortal;
  const isLaboratoryPortal = pathname.startsWith("/laboratorios");
  const isDentistPortal = pathname.startsWith("/odontologo");
  const providerPortalId = resolveProviderPortalId(role, {
    isPsychologistPortal,
    isNutritionistPortal,
    isNursePortal,
    isPharmacistPortal,
    isDentistPortal,
  });

  const isPharmacyStore =
    !isPharmacyValidateHub || role === "PHARMACY_STORE"
      ? role === "PHARMACY_STORE" || (role === "ADMIN" && isPharmacyStorePortal)
      : false;
  const isLaboratory =
    role === "LABORATORY" || (role === "ADMIN" && isLaboratoryPortal);
  const isPharmacyNetworkPharmacist =
    (isPharmacyNetworkPharmacistPortal && (role === "PROFESSIONAL" || role === "ADMIN"))
    || (isPharmacyValidateHub && role === "PROFESSIONAL");

  const navItems: NavItem[] =
    isPharmacyStore ? withNavIcons(PHARMACY_STORE_NAV)
    : isLaboratory ? withNavIcons(LABORATORY_NAV)
    : isPharmacyNetworkPharmacist ? withNavIcons(PHARMACY_NETWORK_PHARMACIST_NAV)
    : role === "ADMIN" ? withNavIcons(ADMIN_NAV)
    : role === "ANGEL" ? withNavIcons(ANGEL_NAV)
    : role === "ORGANIZATION" ? withNavIcons(ORGANIZATION_NAV)
    : role === "EMPLOYER" ? withNavIcons(EMPLOYER_NAV)
    : role === "OCCUPATIONAL_PHYSICIAN" ? withNavIcons(OCCUPATIONAL_PHYSICIAN_NAV)
    : isPsychologistPortal ? withNavIcons(PSYCHOLOGIST_NAV)
    : isNutritionistPortal ? withNavIcons(NUTRITIONIST_NAV)
    : isNursePortal ? withNavIcons(NURSE_NAV)
    : isPharmacistPortal ? withNavIcons(PHARMACIST_NAV)
    : isDentistPortal ? withNavIcons(DENTIST_NAV)
    : role === "PROFESSIONAL" ? withNavIcons(PROFESSIONAL_NAV)
    : role === "PSYCHOANALYST" ? withNavIcons(PSYCHOANALYST_NAV)
    : role === "INTEGRATIVE_THERAPIST" ? withNavIcons(INTEGRATIVE_THERAPIST_NAV)
    : role === "PHARMACY_STORE" ? withNavIcons(PHARMACY_STORE_NAV)
    : role === "LABORATORY" ? withNavIcons(LABORATORY_NAV)
    : withNavIcons(PATIENT_NAV);
  const providerGroupedNav = providerPortalId
    ? (PLATFORM_NAV_GROUPS_BY_PORTAL[providerPortalId] ?? []).map((group) => ({
        ...group,
        items: withNavIcons(group.items).filter(
          (item) =>
            !item.href.includes("/medicina-natural") || showNaturalMedicineNav,
        ),
      })).filter((group) => group.items.length > 0)
    : [];
  const roleLabel =
    role === "ORGANIZATION" ? t("role.organization")
    : role === "EMPLOYER" ? t("role.employer")
    : role === "OCCUPATIONAL_PHYSICIAN" ? "Médico do trabalho"
    : isPharmacyStore ? t("role.pharmacyStore")
    : isLaboratory ? t("role.laboratory")
    : isPharmacyNetworkPharmacist ? t("role.pharmacist")
    : isPsychologistPortal ? t("role.psychologist")
    : isNutritionistPortal ? t("role.nutritionist")
    : isNursePortal ? t("role.nurse")
    : isPharmacistPortal ? t("role.pharmacist")
    : isDentistPortal ? t("role.dentist")
    : role === "PROFESSIONAL" ? t("role.professional")
    : role === "PSYCHOANALYST" ? t("role.psychoanalyst")
    : role === "INTEGRATIVE_THERAPIST" ? t("role.integrativeTherapist")
    : role === "ADMIN" ? t("role.admin")
    : role === "ANGEL" ? t("role.angel")
    : t("role.patient");
  const isProfessional = role === "PROFESSIONAL" && !isPsychologistPortal && !isNutritionistPortal && !isNursePortal && !isPharmacistPortal && !isDentistPortal;
  const isPsychologist = isPsychologistPortal;
  const isNutritionist = isNutritionistPortal;
  const isNurse = isNursePortal;
  const isPharmacist = isPharmacistPortal;
  const isDentist = isDentistPortal;
  const isPsychoanalyst = role === "PSYCHOANALYST";
  const isIntegrativeTherapist = role === "INTEGRATIVE_THERAPIST";
  const voicePortalId = resolveVoicePortalFromPathname(pathname);
  const showVoiceAssistant = sessionLoaded && !!userId && !!voicePortalId;
  const isOrganization = role === "ORGANIZATION";
  const isEmployer = role === "EMPLOYER";
  const isOccupationalPhysician = role === "OCCUPATIONAL_PHYSICIAN";
  const isPharmacyStoreUser = isPharmacyStore;
  const isLaboratoryUser = isLaboratory;
  const isAngel = role === "ANGEL";
  const isPatient = role === "PATIENT";
  const patientDashboardItem = withNavIcons([PATIENT_DASHBOARD_ENTRY])[0];
  const patientHumanitarianItem = withNavIcons([PATIENT_HUMANITARIAN_ENTRY])[0];
  const patientScheduledVolunteerItem = withNavIcons([PATIENT_SCHEDULED_VOLUNTEER_ENTRY])[0];
  const patientGroupedNav = PATIENT_NAV_GROUPS.map((group) => ({
    ...group,
    items: withNavIcons(group.items),
  }));
  const navActive = isAngel
    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
    : isOrganization
    ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
    : isEmployer
    ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
    : isOccupationalPhysician
    ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
    : isPharmacyStoreUser
    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
    : isLaboratoryUser
    ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
    : isPsychologist
      ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
    : isNutritionist
      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
    : isNurse
      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
    : isPharmacist
      ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
    : isDentist
      ? "bg-fuchsia-500/20 text-fuchsia-100 border border-fuchsia-400/45 shadow-sm shadow-fuchsia-500/10"
    : isProfessional
    ? "bg-brand-500/10 text-brand-400 border border-brand-500/20"
    : isPsychoanalyst
      ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
      : isIntegrativeTherapist
        ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
  const avatarBg = isAngel ? "bg-rose-500/20" : isOrganization ? "bg-indigo-500/20" : isEmployer ? "bg-sky-500/20" : isOccupationalPhysician ? "bg-teal-500/20" : isPharmacyStoreUser ? "bg-emerald-500/20" : isLaboratoryUser ? "bg-violet-500/20" : isPsychologist ? "bg-violet-500/20" : isNutritionist ? "bg-amber-500/20" : isNurse ? "bg-rose-500/20" : isPharmacist ? "bg-teal-500/20" : isDentist ? "bg-fuchsia-500/20" : isProfessional ? "bg-brand-500/20" : isPsychoanalyst ? "bg-violet-500/20" : isIntegrativeTherapist ? "bg-teal-500/20" : "bg-emerald-500/20";
  const avatarIcon = isAngel ? "text-rose-400" : isOrganization ? "text-indigo-400" : isEmployer ? "text-sky-400" : isOccupationalPhysician ? "text-teal-400" : isPharmacyStoreUser ? "text-emerald-400" : isLaboratoryUser ? "text-violet-400" : isPsychologist ? "text-violet-400" : isNutritionist ? "text-amber-400" : isNurse ? "text-rose-400" : isPharmacist ? "text-teal-400" : isDentist ? "text-fuchsia-300" : isProfessional ? "text-brand-400" : isPsychoanalyst ? "text-violet-400" : isIntegrativeTherapist ? "text-teal-400" : "text-emerald-400";
  const headerAvatar = isAngel ? "bg-rose-500" : isOrganization ? "bg-indigo-500" : isEmployer ? "bg-sky-600" : isOccupationalPhysician ? "bg-teal-600" : isPharmacyStoreUser ? "bg-emerald-600" : isLaboratoryUser ? "bg-violet-600" : isPsychologist ? "bg-violet-500" : isNutritionist ? "bg-amber-500" : isNurse ? "bg-rose-500" : isPharmacist ? "bg-teal-500" : isDentist ? "bg-fuchsia-500" : isProfessional ? "bg-brand-500" : isPsychoanalyst ? "bg-violet-500" : isIntegrativeTherapist ? "bg-teal-500" : "bg-emerald-500";
  const signOutHref = resolveLoginPathForSession(role, pathname, isPsychologistPortal || isNutritionistPortal || isNursePortal || isPharmacistPortal || isDentistPortal);

  function isNavItemActive(href: string): boolean {
    if (pathname === href) return true;
    const portalRoots = [
      "/odontologo", "/professional", "/psychologist", "/nutricionista",
      "/enfermeiro", "/farmaceutico", "/psychoanalyst", "/integrative-therapist",
      "/patient", "/organization", "/admin", "/angel", "/farmacias", "/laboratorios",
    ];
    if (portalRoots.includes(href)) return false;
    return pathname.startsWith(`${href}/`);
  }

  function renderNavLink(item: NavItem, badge?: number, accentRed = false) {
    const isActive = isNavItemActive(item.href);
    const redActive = "bg-red-500/10 text-red-400 border border-red-500/20";
    const redIdle = "text-red-500 hover:text-red-400 hover:bg-red-500/10";
    const dentistActive = "bg-fuchsia-600 text-white border border-fuchsia-400/70 shadow-md shadow-fuchsia-950/40 [&_svg]:text-white";
    const dentistIdle = "text-slate-300 hover:text-white hover:bg-fuchsia-500/15";
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setSidebarOpen(false)}
        className={`
          flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
          ${isActive
            ? (accentRed ? redActive : isDentist ? dentistActive : navActive)
            : (accentRed ? redIdle : isDentist ? dentistIdle : "text-slate-400 hover:text-white hover:bg-slate-800")}
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
      <JitSessionHeartbeat enabled={isProfessional || isPsychologist || isNutritionist || isNurse || isPharmacist} />
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
          {isPharmacyStoreUser ? (
            <Link href="/farmacias/painel" className="text-lg font-black text-white tracking-tight">
              Doctor8 Farmácias
            </Link>
          ) : isLaboratoryUser ? (
            <Link href="/laboratorios/painel" className="text-lg font-black text-white tracking-tight">
              Doctor8 Laboratórios
            </Link>
          ) : isPharmacyNetworkPharmacist ? (
            <Link href="/farmacias/farmaceutico/painel" className="text-lg font-black text-white tracking-tight">
              {t("portal.pharmacyNetworkBrand")}
            </Link>
          ) : isPsychologist ? (
            <Link href="/psychologist" className="text-lg font-black text-white tracking-tight uppercase">
              {t("portal.psychologyBrand")}
            </Link>
          ) : isNutritionist ? (
            <Link href="/nutricionista" className="text-lg font-black text-white tracking-tight uppercase">
              {t("portal.nutritionBrand")}
            </Link>
          ) : isNurse ? (
            <Link href="/enfermeiro" className="text-lg font-black text-white tracking-tight uppercase">
              {t("portal.nurseBrand")}
            </Link>
          ) : isPharmacist ? (
            <Link href="/farmaceutico" className="text-lg font-black text-white tracking-tight uppercase">
              {t("portal.pharmacyBrand")}
            </Link>
          ) : isDentist ? (
            <Link href="/odontologo" className="text-lg font-black text-white tracking-tight uppercase">
              {t("portal.dentistryBrand")}
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

        {!isPharmacyStoreUser && !isPharmacyNetworkPharmacist && <BrVeSolidarityBadge />}

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
              navItems.map((item) =>
                renderNavLink(
                  item,
                  undefined,
                  item.labelKey === "angel.nav.followUp",
                ),
              )
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
            {showVoiceAssistant && voicePortalId && (
              <VoiceAssistantShell portalId={voicePortalId} userId={userId} variant="header" />
            )}
            {isOrganization && <OrganizationScopeSwitcher />}
            {isProfessional && <ProfessionalScopeSwitcher />}
            <EightBetaLink />
            <LanguageSwitcher variant="header" />
            <NotificationBell />
            <div className={`w-8 h-8 rounded-xl ${headerAvatar} flex items-center justify-center text-white text-sm font-bold`}>
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {showVoiceAssistant && voicePortalId && userId && (
          <VoiceAssistantPromoBanner userId={userId} />
        )}

        <main className="flex-1 p-4 lg:p-8 overflow-auto overflow-x-hidden min-w-0">
          <PushSubscribe />
          {role === "PATIENT" && userId && (
            <PwaInstallPrompt lang={lang} variant="patient" userId={userId} />
          )}
          {!isPharmacyStoreUser && !isPharmacyNetworkPharmacist && (
            <ProviderDashboardAlerts role={role} />
          )}
          <LegalAcceptanceGate>{children}</LegalAcceptanceGate>
        </main>
        {showVoiceAssistant && voicePortalId && (
          <VoiceAssistantShell portalId={voicePortalId} userId={userId} variant="fab" />
        )}
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
