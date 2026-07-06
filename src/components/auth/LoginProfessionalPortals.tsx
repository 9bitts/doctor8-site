"use client";

import Link from "next/link";
import { Stethoscope, Brain, Leaf, Utensils, HeartPulse } from "lucide-react";
import { buildAuthHref } from "@/components/auth/login-shared";

type PortalLink = {
  href: string;
  labelKey: string;
  icon: typeof Stethoscope;
  className: string;
};

const PORTAL_LINKS: PortalLink[] = [
  {
    href: "/login?portal=doctor",
    labelKey: "login.proDoctorPortal",
    icon: Stethoscope,
    className: "text-slate-400 hover:text-emerald-300",
  },
  {
    href: "/login?portal=psychologist",
    labelKey: "login.proPsychologistPortal",
    icon: Brain,
    className: "text-slate-400 hover:text-violet-300",
  },
  {
    href: "/login?portal=psychoanalyst",
    labelKey: "login.proPsychoanalystPortal",
    icon: Brain,
    className: "text-slate-400 hover:text-violet-300",
  },
  {
    href: "/login?portal=integrative",
    labelKey: "login.proIntegrativePortal",
    icon: Leaf,
    className: "text-slate-400 hover:text-teal-300",
  },
  {
    href: "/login?portal=nutritionist",
    labelKey: "login.proNutritionistPortal",
    icon: Utensils,
    className: "text-slate-400 hover:text-amber-300",
  },
  {
    href: "/login?portal=nurse",
    labelKey: "login.proNursePortal",
    icon: HeartPulse,
    className: "text-slate-400 hover:text-rose-300",
  },
];

export function loginTaglineForPortal(
  portal: string | null,
  t: (key: string) => string,
): string | undefined {
  switch (portal) {
    case "psychologist":
      return t("login.psychologistTagline");
    case "psychoanalyst":
      return t("login.psychoanalystTagline");
    case "integrative":
      return t("login.integrativeTagline");
    case "nutritionist":
      return t("login.nutritionistTagline");
    case "nurse":
      return t("login.nurseTagline");
    case "doctor":
      return t("login.doctorTagline");
    default:
      return undefined;
  }
}

export function LoginProfessionalPortals({
  t,
  callbackUrl,
}: {
  t: (key: string) => string;
  callbackUrl?: string;
}) {
  return (
    <div className="border-t border-white/10 mt-6 pt-6">
      <p className="text-center text-slate-500 text-xs uppercase tracking-wider mb-3">
        {t("login.proPortalHeading")}
      </p>
      <ul className="flex flex-col gap-2">
        {PORTAL_LINKS.map((link) => {
          const Icon = link.icon;
          const href = buildAuthHref(link.href, { callbackUrl });
          return (
            <li key={link.href}>
              <Link
                href={href}
                className={`flex items-center justify-center gap-2 text-xs font-medium transition ${link.className}`}
              >
                <Icon size={14} aria-hidden />
                {t(link.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
