"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Heart, ArrowLeft, Home, User, Stethoscope, ExternalLink } from "lucide-react";
import { translate, Lang } from "@/lib/i18n/translations";
import { HUMANITARIAN_LANDING_URL, VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import HumanitarianLangSwitcher from "@/components/humanitarian/HumanitarianLangSwitcher";
import { humanitarianBackFallback, navigateBack } from "@/lib/safe-nav";
import { resolveRoleHome } from "@/lib/role-home";
import { BrandLogo } from "@/components/brand/BrandLogo";

type UserRole =
  | "PATIENT"
  | "PROFESSIONAL"
  | "PSYCHOANALYST"
  | "INTEGRATIVE_THERAPIST"
  | "ADMIN"
  | "ORGANIZATION"
  | "ANGEL";

function homeHrefForRole(
  role: UserRole | null,
  specialty: string | null | undefined,
  isVolunteer: boolean,
  isAngel: boolean,
): string {
  if (isAngel) return "/humanitarian/angel";
  if (!isVolunteer) return "/patient";
  if (!role) return "/patient";
  if (role === "PROFESSIONAL" || role === "PSYCHOANALYST" || role === "INTEGRATIVE_THERAPIST") {
    return resolveRoleHome(role, specialty);
  }
  return "/patient";
}

type Props = {
  lang: Lang;
  onLangChange: (l: Lang) => void;
  dark?: boolean;
  children: React.ReactNode;
  showBack?: boolean;
};

export default function HumanitarianShell({
  lang,
  onLangChange,
  dark = false,
  children,
  showBack = true,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const t = (key: string) => translate(lang, key);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [professionalSpecialty, setProfessionalSpecialty] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => {
        setUserRole((s?.user?.role as UserRole) ?? null);
        setProfessionalSpecialty(s?.user?.professionalSpecialty ?? null);
      })
      .catch(() => {});
  }, []);

  const isVolunteer = pathname.includes("/volunteer");
  const isAngel = pathname.includes("/angel");
  const campaignHref = `/humanitarian/${VENEZUELA_CAMPAIGN_SLUG}`;
  const accountHref = homeHrefForRole(userRole, professionalSpecialty, isVolunteer, isAngel);

  const navLink = (href: string, active: boolean, label: string, icon: React.ReactNode) => (
    <Link
      href={href}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition ${
        active
          ? dark
            ? "bg-white/15 text-white"
            : "bg-emerald-100 text-emerald-800"
          : dark
            ? "text-slate-400 hover:text-white hover:bg-white/10"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );

  return (
    <div className={`min-h-screen flex flex-col overflow-x-hidden humanitarian-shell ${dark ? "humanitarian-dark bg-slate-950 text-white" : "bg-slate-50 text-slate-900"}`}>
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-md ${
          dark ? "bg-slate-950/90 border-white/10" : "bg-white/95 border-slate-200"
        }`}
      >
        <div className="max-w-2xl mx-auto w-full px-4 sm:px-6">
          <div className="flex items-center gap-2 py-3">
            {showBack && (
              <button
                type="button"
                onClick={() => navigateBack(router, humanitarianBackFallback(pathname))}
                className={`p-2 rounded-lg shrink-0 ${dark ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"}`}
                aria-label={t("hum.shell.back")}
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <BrandLogo variant={dark ? "on-dark" : "on-light"} size="sm" className="shrink-0" />
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${dark ? "bg-rose-500/20" : "bg-rose-100"}`}>
                <Heart size={18} className="text-rose-500" />
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-semibold uppercase tracking-wide truncate ${dark ? "text-rose-300" : "text-rose-600"}`}>
                  {t("hum.shell.brand")}
                </p>
                <p className={`text-sm font-bold truncate ${dark ? "text-white" : "text-slate-900"}`}>
                  {t("hum.shell.subtitle")}
                </p>
              </div>
            </div>
            <HumanitarianLangSwitcher lang={lang} onChange={onLangChange} dark={dark} />
          </div>

          <nav className="flex items-center gap-1 pb-3 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-1 px-1">
            {navLink(campaignHref, !isVolunteer && !isAngel, t("hum.shell.patient"), <User size={15} />)}
            {navLink("/humanitarian/volunteer", isVolunteer, t("hum.shell.volunteer"), <Stethoscope size={15} />)}
            {navLink("/humanitarian/angel", isAngel, t("angel.shell.nav"), <Heart size={15} />)}
            {navLink(accountHref, false, t("hum.shell.home"), <Home size={15} />)}
            <a
              href={HUMANITARIAN_LANDING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition ${
                dark ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <ExternalLink size={15} />
              <span className="hidden sm:inline">{t("hum.shell.landing")}</span>
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-20">
        {children}
      </main>
    </div>
  );
}
