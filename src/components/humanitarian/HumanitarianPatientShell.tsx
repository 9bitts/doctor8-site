"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  FileText,
  FlaskConical,
  Heart,
  Home,
  MessageSquare,
  Radio,
  Settings,
  Stethoscope,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ACURA_BRASIL_LOGO_WHITE } from "@/lib/acura-volunteer";
import VenezuelaFlagBackdrop from "@/components/humanitarian/VenezuelaFlagBackdrop";
import HumanitarianLangSwitcher from "@/components/humanitarian/HumanitarianLangSwitcher";
import { translate, Lang } from "@/lib/i18n/translations";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import { HUMANITARIAN_PATIENT_HOME } from "@/lib/humanitarian/patient-identity";
import "@/app/atendimentohumanitario/portal.css";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
};

type Props = {
  lang: Lang;
  onLangChange?: (lang: Lang) => void;
  unreadMessages?: number;
  children: React.ReactNode;
};

export default function HumanitarianPatientShell({
  lang,
  onLangChange,
  unreadMessages = 0,
  children,
}: Props) {
  const pathname = usePathname();
  const t = (key: string) => translate(lang, key);
  const campaignHref = `/humanitarian/${VENEZUELA_CAMPAIGN_SLUG}`;

  const nav: NavItem[] = [
    {
      href: HUMANITARIAN_PATIENT_HOME,
      label: "Painel",
      icon: <Home size={16} />,
    },
    {
      href: campaignHref,
      label: t("nav.humanitarian"),
      icon: <Radio size={16} />,
    },
    {
      href: "/patient/volunteer-appointments",
      label: t("nav.scheduledVolunteer"),
      icon: <Calendar size={16} />,
    },
    {
      href: "/patient/prescriptions",
      label: t("nav.myPrescriptions"),
      icon: <Stethoscope size={16} />,
    },
    {
      href: "/patient/exam-requests",
      label: t("nav.myExamRequests"),
      icon: <FlaskConical size={16} />,
    },
    {
      href: "/patient/documents",
      label: t("nav.documents"),
      icon: <FileText size={16} />,
    },
    {
      href: "/patient/messages",
      label: t("nav.messages"),
      icon: <MessageSquare size={16} />,
      badge: unreadMessages,
    },
    {
      href: "/patient/account",
      label: t("nav.account"),
      icon: <Settings size={16} />,
    },
  ];

  return (
    <div className="hum-painel-page">
      <VenezuelaFlagBackdrop />
      <div className="hum-painel-wrap">
        <header className="hum-painel-header">
          <div className="hum-portal-logo-row">
            <BrandLogo variant="on-dark" size="sm" />
            <span className="hum-portal-logo-divider" aria-hidden="true" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ACURA_BRASIL_LOGO_WHITE}
              alt="AcuraBrasil"
              width={140}
              height={36}
              decoding="async"
              className="hum-portal-acura-logo"
            />
          </div>
          <div className="hum-painel-header-actions">
            {onLangChange ? (
              <HumanitarianLangSwitcher lang={lang} onChange={onLangChange} />
            ) : null}
          </div>
        </header>

        <div className="hum-painel-badge">
          <span className="hum-portal-badge-dot" />
          SOS Venezuela · Atendimento gratuito
        </div>

        <nav className="hum-painel-nav" aria-label="Menu humanitário">
          {nav.map((item) => {
            const active =
              pathname === item.href
              || (item.href !== HUMANITARIAN_PATIENT_HOME && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`hum-painel-nav-item ${active ? "hum-painel-nav-item-active" : ""}`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <span className="hum-painel-nav-badge">{item.badge}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <main className="hum-painel-card">{children}</main>

        <p className="hum-portal-footnote hum-painel-footnote">
          <Heart size={12} className="inline-block mr-1 text-rose-300" aria-hidden />
          Doctor8 + AcuraBrasil — Atendimento humanitário Venezuela
        </p>
      </div>
    </div>
  );
}
