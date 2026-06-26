"use client";
// src/app/(dashboard)/layout.tsx
// Shared layout for all dashboard pages — patient and professional and admin.
// Reads role + language from the session; menu adapts and is translated.

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import NotificationBell from "@/components/NotificationBell";
import { useI18n } from "@/lib/i18n/I18nProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  LayoutDashboard, FileText, Pill, Calendar, MessageSquare,
  User, Settings, LogOut, Menu, X, Bell, ChevronRight,
  Stethoscope, ClipboardList, Users, UserCog, Inbox, Layers, CreditCard,
  Building2,
  BookOpen, Radio, TrendingUp, MapPin, ShoppingBag, Brain, BarChart3,
  Shield, Briefcase, FileSpreadsheet, Receipt, Package, Megaphone, Sparkles,
} from "lucide-react";

interface NavItem {
  href: string;
  labelKey: string;   // i18n key
  icon: React.ReactNode;
  roles: string[];
}

const PATIENT_NAV: NavItem[] = [
  { href: "/patient", labelKey: "nav.dashboard", icon: <LayoutDashboard size={18} />, roles: ["PATIENT"] },
  { href: "/patient/history", labelKey: "nav.medicalHistory", icon: <FileText size={18} />, roles: ["PATIENT"] },
  { href: "/patient/medications", labelKey: "nav.medications", icon: <Pill size={18} />, roles: ["PATIENT"] },
  { href: "/patient/buying-club", labelKey: "nav.buyingClub", icon: <ShoppingBag size={18} />, roles: ["PATIENT"] },
  { href: "/patient/club-doctor", labelKey: "nav.clubDoctor", icon: <Sparkles size={18} />, roles: ["PATIENT"] },
  { href: "/patient/prescriptions", labelKey: "nav.myPrescriptions", icon: <Stethoscope size={18} />, roles: ["PATIENT"] },
  { href: "/patient/appointments", labelKey: "nav.appointments", icon: <Calendar size={18} />, roles: ["PATIENT"] },
  { href: "/patient/documents", labelKey: "nav.documents", icon: <ClipboardList size={18} />, roles: ["PATIENT"] },
  { href: "/patient/messages", labelKey: "nav.messages", icon: <MessageSquare size={18} />, roles: ["PATIENT"] },
  { href: "/urgent", labelKey: "nav.urgent", icon: <Radio size={18} />, roles: ["PATIENT"] },
  { href: "/patient/find", labelKey: "nav.find", icon: <MapPin size={18} />, roles: ["PATIENT"] },
  { href: "/patient/account", labelKey: "nav.account", icon: <Settings size={18} />, roles: ["PATIENT"] },
];

const PROFESSIONAL_NAV: NavItem[] = [
  { href: "/professional", labelKey: "nav.dashboard", icon: <LayoutDashboard size={18} />, roles: ["PROFESSIONAL"] },
  { href: "/professional/settings", labelKey: "nav.myProfile", icon: <UserCog size={18} />, roles: ["PROFESSIONAL"] },
  { href: "/professional/patients", labelKey: "nav.patients", icon: <Users size={18} />, roles: ["PROFESSIONAL"] },
  { href: "/professional/psychology", labelKey: "nav.psychologyArea", icon: <Brain size={18} />, roles: ["PROFESSIONAL"] },
  { href: "/professional/shared", labelKey: "nav.sharedWithMe", icon: <Inbox size={18} />, roles: ["PROFESSIONAL"] },
  { href: "/professional/categories", labelKey: "nav.categories", icon: <Layers size={18} />, roles: ["PROFESSIONAL"] },
  { href: "/professional/appointments", labelKey: "nav.appointments", icon: <Calendar size={18} />, roles: ["PROFESSIONAL"] },
  { href: "/professional/prescriptions", labelKey: "nav.prescriptions", icon: <Stethoscope size={18} />, roles: ["PROFESSIONAL"] },
  { href: "/professional/buying-club", labelKey: "nav.buyingClub", icon: <ShoppingBag size={18} />, roles: ["PROFESSIONAL"] },
  { href: "/professional/resources", labelKey: "nav.library", icon: <BookOpen size={18} />, roles: ["PROFESSIONAL"] },
  { href: "/professional/jit", labelKey: "nav.jit", icon: <Radio size={18} />, roles: ["PROFESSIONAL"] },
  { href: "/professional/financeiro", labelKey: "nav.financeiro", icon: <TrendingUp size={18} />, roles: ["PROFESSIONAL"] },
  { href: "/professional/messages", labelKey: "nav.messages", icon: <MessageSquare size={18} />, roles: ["PROFESSIONAL"] },
  { href: "/professional/settings/availability", labelKey: "nav.availability", icon: <Calendar size={18} />, roles: ["PROFESSIONAL"] },
  { href: "/professional/account", labelKey: "nav.account", icon: <Settings size={18} />, roles: ["PROFESSIONAL"] },
];

const PSYCHOANALYST_NAV: NavItem[] = [
  { href: "/psychoanalyst", labelKey: "nav.dashboard", icon: <LayoutDashboard size={18} />, roles: ["PSYCHOANALYST"] },
  { href: "/psychoanalyst/settings", labelKey: "nav.myProfile", icon: <UserCog size={18} />, roles: ["PSYCHOANALYST"] },
  { href: "/psychoanalyst/analysands", labelKey: "pa.nav.analysands", icon: <Users size={18} />, roles: ["PSYCHOANALYST"] },
  { href: "/psychoanalyst/appointments", labelKey: "nav.appointments", icon: <Calendar size={18} />, roles: ["PSYCHOANALYST"] },
  { href: "/psychoanalyst/settings/availability", labelKey: "nav.availability", icon: <Calendar size={18} />, roles: ["PSYCHOANALYST"] },
];

const ORGANIZATION_NAV: NavItem[] = [
  { href: "/organization", labelKey: "nav.dashboard", icon: <LayoutDashboard size={18} />, roles: ["ORGANIZATION"] },
  { href: "/organization/appointments", labelKey: "nav.appointments", icon: <Calendar size={18} />, roles: ["ORGANIZATION"] },
  { href: "/organization/patients", labelKey: "nav.patients", icon: <Users size={18} />, roles: ["ORGANIZATION"] },
  { href: "/organization/financeiro", labelKey: "nav.financeiro", icon: <TrendingUp size={18} />, roles: ["ORGANIZATION"] },
  { href: "/organization/ledger", labelKey: "org.nav.ledger", icon: <ClipboardList size={18} />, roles: ["ORGANIZATION"] },
  { href: "/organization/reports", labelKey: "org.nav.reports", icon: <BarChart3 size={18} />, roles: ["ORGANIZATION"] },
  { href: "/organization/convenios", labelKey: "org.nav.convenios", icon: <Shield size={18} />, roles: ["ORGANIZATION"] },
  { href: "/organization/hr", labelKey: "org.nav.hr", icon: <Briefcase size={18} />, roles: ["ORGANIZATION"] },
  { href: "/organization/accounting", labelKey: "org.nav.accounting", icon: <FileSpreadsheet size={18} />, roles: ["ORGANIZATION"] },
  { href: "/organization/invoices", labelKey: "org.nav.invoices", icon: <Receipt size={18} />, roles: ["ORGANIZATION"] },
  { href: "/organization/purchases", labelKey: "org.nav.purchases", icon: <Package size={18} />, roles: ["ORGANIZATION"] },
  { href: "/organization/marketing", labelKey: "org.nav.marketing", icon: <Megaphone size={18} />, roles: ["ORGANIZATION"] },
  { href: "/organization/team", labelKey: "org.nav.team", icon: <Building2 size={18} />, roles: ["ORGANIZATION"] },
  { href: "/organization/settings", labelKey: "nav.account", icon: <Settings size={18} />, roles: ["ORGANIZATION"] },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin/categories", labelKey: "nav.adminCategories", icon: <Layers size={18} />, roles: ["ADMIN"] },
  { href: "/admin/doctors", labelKey: "nav.adminDoctors", icon: <Stethoscope size={18} />, roles: ["ADMIN"] },
  { href: "/admin/patients", labelKey: "nav.adminPatients", icon: <Users size={18} />, roles: ["ADMIN"] },
  { href: "/admin/payments", labelKey: "nav.adminPayments", icon: <CreditCard size={18} />, roles: ["ADMIN"] },
  { href: "/admin/jit-events", labelKey: "nav.adminJitEvents", icon: <Radio size={18} />, roles: ["ADMIN"] },
  { href: "/admin/buying-clubs", labelKey: "nav.adminBuyingClubs", icon: <ShoppingBag size={18} />, roles: ["ADMIN"] },
];

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

  const navItems =
    role === "ADMIN" ? ADMIN_NAV
    : role === "ORGANIZATION" ? ORGANIZATION_NAV
    : role === "PROFESSIONAL" ? PROFESSIONAL_NAV
    : role === "PSYCHOANALYST" ? PSYCHOANALYST_NAV
    : PATIENT_NAV;
  const roleLabel =
    role === "ORGANIZATION" ? t("role.organization")
    : role === "PROFESSIONAL" ? t("role.professional")
    : role === "PSYCHOANALYST" ? t("role.psychoanalyst")
    : role === "ADMIN" ? t("role.admin")
    : t("role.patient");
  const isProfessional = role === "PROFESSIONAL";
  const isPsychoanalyst = role === "PSYCHOANALYST";
  const isOrganization = role === "ORGANIZATION";
  const logoAccent = isOrganization ? "text-indigo-400" : isProfessional ? "text-accent-500" : isPsychoanalyst ? "text-violet-400" : "text-emerald-400";
  const logoAccentHeader = isOrganization ? "text-indigo-500" : isProfessional ? "text-accent-500" : isPsychoanalyst ? "text-violet-500" : "text-emerald-500";
  const navActive = isOrganization
    ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
    : isProfessional
    ? "bg-brand-500/10 text-brand-400 border border-brand-500/20"
    : isPsychoanalyst
      ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
  const avatarBg = isOrganization ? "bg-indigo-500/20" : isProfessional ? "bg-brand-500/20" : isPsychoanalyst ? "bg-violet-500/20" : "bg-emerald-500/20";
  const avatarIcon = isOrganization ? "text-indigo-400" : isProfessional ? "text-brand-400" : isPsychoanalyst ? "text-violet-400" : "text-emerald-400";
  const headerAvatar = isOrganization ? "bg-indigo-500" : isProfessional ? "bg-brand-500" : isPsychoanalyst ? "bg-violet-500" : "bg-emerald-500";

  return (
    <div className="min-h-screen bg-slate-50 flex">
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
          <Link href="/" className="text-2xl font-black text-white tracking-tight">
            Doctor<span className={logoAccent}>8</span>
          </Link>
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
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all w-full"
          >
            <LogOut size={18} />
            {t("common.signOut")}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-4 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-700">
            <Menu size={22} />
          </button>

          <div className="lg:hidden">
            <span className="text-lg font-bold text-slate-900">
              Doctor<span className={logoAccentHeader}>8</span>
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <LanguageSwitcher variant="header" />
            <NotificationBell />
            <div className={`w-8 h-8 rounded-xl ${headerAvatar} flex items-center justify-center text-white text-sm font-bold`}>
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardInner>{children}</DashboardInner>;
}
