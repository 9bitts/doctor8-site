"use client";

import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import type { AngelOnboardingStep } from "@/lib/humanitarian/angel-onboarding";
import { ANGEL_ONBOARDING_STEPS, stepIndex } from "@/lib/humanitarian/angel-onboarding";
import { buildVerifyAccountHref, ANGEL_LOGIN } from "@/lib/auth-portals";

type Props = {
  currentStep: AngelOnboardingStep;
  email?: string;
  emailVerified: boolean;
  pendingCourseIds?: string[];
  t: (key: string) => string;
};

const STEP_KEYS: Record<AngelOnboardingStep, string> = {
  REGISTERED: "angel.timeline.registered",
  EMAIL: "angel.timeline.email",
  SCREENING: "angel.timeline.screening",
  TRACKS: "angel.timeline.tracks",
  TRAINING: "angel.timeline.training",
  ACTIVE: "angel.timeline.active",
};

export default function AngelOnboardingTimeline({
  currentStep,
  email,
  emailVerified,
  pendingCourseIds = [],
  t,
}: Props) {
  const currentIdx = stepIndex(currentStep);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
      <h2 className="text-sm font-semibold text-slate-900">{t("angel.timeline.title")}</h2>
      <ol className="space-y-3">
        {ANGEL_ONBOARDING_STEPS.map((step, idx) => {
          const done = idx < currentIdx;
          const active = idx === currentIdx;
          const Icon = done ? CheckCircle2 : Circle;
          const iconClass = done
            ? "text-emerald-500"
            : active
              ? "text-rose-500"
              : "text-slate-300";
          return (
            <li key={step} className="flex items-start gap-3">
              <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconClass}`} aria-hidden />
              <div className="min-w-0">
                <p className={`text-sm font-medium ${active ? "text-slate-900" : done ? "text-slate-600" : "text-slate-400"}`}>
                  {t(STEP_KEYS[step])}
                </p>
                {active && step === "EMAIL" && !emailVerified && email && (
                  <Link
                    href={buildVerifyAccountHref({
                      email,
                      callbackUrl: "/admin/angel",
                      from: ANGEL_LOGIN,
                    })}
                    className="text-xs text-rose-600 hover:text-rose-800 font-medium mt-1 inline-block"
                  >
                    {t("angel.timeline.ctaVerifyEmail")}
                  </Link>
                )}
                {active && step === "TRAINING" && pendingCourseIds.length > 0 && (
                  <div className="mt-1 space-y-1">
                    {pendingCourseIds.map((courseId) => (
                      <Link
                        key={courseId}
                        href={`/courses/${courseId}`}
                        className="block text-xs text-rose-600 hover:text-rose-800 font-medium"
                      >
                        {t("angel.timeline.ctaCourse")}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
