"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, User, Calendar, Radio, FileText, Heart, ChevronRight } from "lucide-react";
import { useT } from "@/lib/i18n/I18nProvider";
import { isPsychologistSpecialty } from "@/lib/psychologist-portal";
import {
  clearVolunteerAttendGuideFlag,
  isVolunteerGuideProviderRole,
  shouldShowVolunteerAttendGuide,
  volunteerGuidePaths,
} from "@/lib/volunteer-attend-guide";

export default function VolunteerAttendGuideModal() {
  const t = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("");
  const [specialty, setSpecialty] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldShowVolunteerAttendGuide()) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/session");
        const session = await res.json();
        if (cancelled) return;
        const userRole = session?.user?.role as string | undefined;
        if (!userRole || !isVolunteerGuideProviderRole(userRole)) return;
        setRole(userRole);
        setSpecialty(session?.user?.professionalSpecialty ?? null);
        setOpen(true);
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  function dismiss() {
    clearVolunteerAttendGuideFlag();
    setOpen(false);
  }

  if (!open || !role) return null;

  const isPsychologistPortal =
    pathname.startsWith("/psychologist") ||
    (role === "PROFESSIONAL" && isPsychologistSpecialty(specialty));
  const paths = volunteerGuidePaths(role, isPsychologistPortal);

  const steps = [
    {
      icon: User,
      title: t("volguide.step1.title"),
      body: t("volguide.step1.body"),
      href: paths.profile,
      linkLabel: t("volguide.profile"),
    },
    {
      icon: Calendar,
      title: t("volguide.step2.title"),
      body: t("volguide.step2.body"),
      href: paths.availability,
      linkLabel: t("volguide.availability"),
    },
    {
      icon: Radio,
      title: t("volguide.step3.title"),
      body: t("volguide.step3.body"),
      href: paths.volunteerPortal,
      linkLabel: t("volguide.volunteerPortal"),
    },
    {
      icon: FileText,
      title: t("volguide.step4.title"),
      body: t("volguide.step4.body"),
      href: paths.registerConsult,
      linkLabel: t("volguide.registerConsult"),
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        aria-label={t("volguide.dismiss")}
        onClick={dismiss}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="volguide-title"
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="bg-gradient-to-r from-rose-600 to-emerald-600 px-5 py-4 flex items-start gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Heart size={22} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="volguide-title" className="font-bold text-white text-lg leading-tight">
              {t("volguide.title")}
            </h2>
            <p className="text-white/85 text-sm mt-1 leading-relaxed">{t("volguide.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="text-white/70 hover:text-white transition shrink-0"
            aria-label={t("volguide.dismiss")}
          >
            <X size={20} />
          </button>
        </div>

        <ol className="overflow-y-auto divide-y divide-slate-100">
          {steps.map((step, index) => (
            <li key={step.title} className="px-5 py-4">
              <div className="flex gap-3">
                <div className="shrink-0 flex flex-col items-center gap-1">
                  <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <step.icon size={16} className="text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm">{step.title}</p>
                  <p className="text-slate-500 text-sm mt-1 leading-relaxed">{step.body}</p>
                  <Link
                    href={step.href}
                    onClick={dismiss}
                    className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    {step.linkLabel}
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={dismiss}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition"
          >
            {t("volguide.dismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}
