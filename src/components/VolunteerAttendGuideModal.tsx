"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { X, User, Calendar, Radio, FileText, Heart, ChevronRight } from "lucide-react";
import { useT } from "@/lib/i18n/I18nProvider";
import { isPsychologistSpecialty } from "@/lib/psychologist-portal";
import {
  clearVolunteerAttendGuideFlag,
  isVolunteerGuideProviderRole,
  shouldShowVolunteerAttendGuide,
  volunteerGuidePaths,
} from "@/lib/volunteer-attend-guide";

type ProviderSession = {
  role: string;
  specialty: string | null;
  showVolunteerGuide: boolean;
};

async function fetchProviderSession(maxAttempts = 20): Promise<ProviderSession | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch("/api/auth/session", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (res.ok) {
        const session = await res.json();
        const role = session?.user?.role as string | undefined;
        if (role && !isVolunteerGuideProviderRole(role)) return null;
        if (role && isVolunteerGuideProviderRole(role)) {
          return {
            role,
            specialty: session?.user?.professionalSpecialty ?? null,
            showVolunteerGuide: session?.user?.showVolunteerGuide === true,
          };
        }
      }
    } catch {
      /* retry */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return null;
}

export default function VolunteerAttendGuideModal() {
  const t = useT();
  const pathname = usePathname();
  const { update } = useSession();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("");
  const [specialty, setSpecialty] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const clientFlag = shouldShowVolunteerAttendGuide();
    let cancelled = false;

    (async () => {
      const session = await fetchProviderSession();
      if (cancelled || !session) return;
      if (!session.showVolunteerGuide && !clientFlag) return;
      setRole(session.role);
      setSpecialty(session.specialty);
      setOpen(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted]);

  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  async function dismiss() {
    clearVolunteerAttendGuideFlag();
    try {
      await update({ clearVolunteerGuide: true });
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  if (!mounted || !open || !role) return null;

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

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label={t("volguide.dismiss")}
        onClick={dismiss}
      />
      <div className="absolute inset-0 overflow-y-auto overscroll-contain touch-pan-y">
        <div className="flex min-h-full items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="volguide-title"
            className="relative z-10 w-full sm:max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col min-h-0 max-h-[min(88dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem))]"
          >
            <div className="bg-gradient-to-r from-rose-600 to-emerald-600 px-5 py-4 flex items-start gap-3 shrink-0 rounded-t-2xl">
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
                className="text-white/70 hover:text-white transition shrink-0 p-1"
                aria-label={t("volguide.dismiss")}
              >
                <X size={20} />
              </button>
            </div>

            <ol className="overflow-y-auto overscroll-contain touch-pan-y divide-y divide-slate-100 flex-1 min-h-0">
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
                    className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 min-h-[44px]"
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
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition min-h-[48px]"
              >
                {t("volguide.dismiss")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
