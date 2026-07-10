"use client";

import Link from "next/link";
import { useState } from "react";
import { Sparkles, ChevronRight, Circle, CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { RegistrationChecklistKey } from "@/lib/provider-registration-complete";
import { registrationChecklistHash } from "@/lib/provider-registration-complete";

const CHECKLIST_ITEMS: { key: RegistrationChecklistKey; labelKey: string }[] = [
  { key: "professionalData", labelKey: "provider.registration.checklist1" },
  { key: "verificationDocuments", labelKey: "provider.registration.checklist2" },
  { key: "careSettings", labelKey: "provider.registration.checklist3" },
];

export default function ProviderIncompleteRegistrationCard({
  settingsHref,
  checklist,
  missing,
  showStripeConnect = false,
}: {
  settingsHref: string;
  checklist?: Partial<Record<RegistrationChecklistKey, boolean>>;
  missing?: RegistrationChecklistKey[];
  showStripeConnect?: boolean;
}) {
  const { t } = useI18n();
  const [stripeLoading, setStripeLoading] = useState(false);

  const firstMissing = missing?.[0];
  const href = firstMissing
    ? `${settingsHref}#${registrationChecklistHash(firstMissing)}`
    : settingsHref;

  async function handleStripeConnect(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setStripeLoading(true);
    try {
      const res = await fetch("/api/professional/stripe-connect/onboard", { method: "POST" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setStripeLoading(false);
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50 p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100">
          <Sparkles size={24} className="text-rose-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-slate-900">{t("provider.registration.title")}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {t("provider.registration.intro")}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {t("provider.registration.visibility")}
          </p>
          <p className="mt-3 text-sm font-medium text-slate-800">
            {t("provider.registration.checklistTitle")}
          </p>
          <ul className="mt-2 space-y-1.5">
            {CHECKLIST_ITEMS.map(({ key, labelKey }) => {
              const done = checklist?.[key] === true;
              return (
                <li
                  key={key}
                  className={`flex items-start gap-2 text-sm ${
                    done ? "text-slate-500" : "font-semibold text-red-600"
                  }`}
                >
                  {done ? (
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                  ) : (
                    <Circle size={8} className="mt-1.5 shrink-0 fill-red-500 text-red-500" />
                  )}
                  <span>{t(labelKey)}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            {t("provider.registration.footer")}
          </p>
          <div className="mt-4 flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap">
            <Link
              href={href}
              className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              {t("provider.registration.action")} <ChevronRight size={16} />
            </Link>
            {showStripeConnect && (
              <button
                type="button"
                onClick={(e) => void handleStripeConnect(e)}
                disabled={stripeLoading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-60"
              >
                {stripeLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CreditCard size={16} />
                )}
                {t("provider.registration.stripeAction")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
