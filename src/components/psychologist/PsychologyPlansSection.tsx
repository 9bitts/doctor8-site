"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { CheckCircle2, Sparkles } from "lucide-react";

type Props = {
  subscribed: boolean;
  patientCount?: number;
};

export default function PsychologyPlansSection({ subscribed, patientCount = 0 }: Props) {
  const { t } = useI18n();
  const currentTier = subscribed ? "pro" : "free";

  const plans = [
    {
      id: "free",
      price: "R$ 0",
      period: t("psy.plans.forever"),
      highlight: false,
      features: [
        t("psy.plans.free.patients"),
        t("psy.plans.free.scales"),
        t("psy.plans.free.anamnesis"),
        t("psy.plans.free.ai"),
      ],
    },
    {
      id: "pro",
      price: "R$ 79",
      period: t("psy.plans.perMonth"),
      highlight: true,
      features: [
        t("psy.plans.pro.unlimited"),
        t("psy.plans.pro.jit"),
        t("psy.plans.pro.chartChat"),
        t("psy.plans.pro.gcal"),
        t("psy.plans.pro.whatsapp"),
      ],
    },
    {
      id: "clinic",
      price: "R$ 149",
      period: t("psy.plans.perMonth"),
      highlight: false,
      features: [
        t("psy.plans.clinic.professionals"),
        t("psy.plans.clinic.allPro"),
        t("psy.plans.clinic.repasse"),
      ],
    },
  ];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">{t("psy.plans.title")}</h2>
        <p className="text-sm text-slate-500 mt-1">{t("psy.plans.subtitle")}</p>
        {!subscribed && patientCount > 0 && (
          <p className="text-xs text-violet-700 mt-2">
            {t("psy.plans.usage")
              .replace("{{count}}", String(patientCount))
              .replace("{{limit}}", "3")}
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-2xl border p-5 flex flex-col ${
              plan.highlight
                ? "border-violet-300 bg-violet-50/50 shadow-sm"
                : "border-slate-200 bg-white"
            } ${currentTier === plan.id ? "ring-2 ring-violet-400" : ""}`}
          >
            {plan.highlight && (
              <span className="text-xs font-semibold text-violet-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Sparkles size={14} /> {t("psy.plans.recommended")}
              </span>
            )}
            <p className="font-bold text-slate-900 capitalize">{t(`psy.plans.tier.${plan.id}`)}</p>
            <p className="mt-2">
              <span className="text-2xl font-bold text-slate-900">{plan.price}</span>
              <span className="text-sm text-slate-500">/{plan.period}</span>
            </p>
            <ul className="mt-4 space-y-2 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                  <CheckCircle2 size={14} className="text-violet-500 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            {plan.id === "pro" && !subscribed && (
              <Link
                href="/psychologist/account"
                className="mt-4 block text-center py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700"
              >
                {t("psy.plans.upgrade")}
              </Link>
            )}
            {plan.id === "clinic" && (
              <a
                href="mailto:suporte@doctor8.app?subject=Plano%20Cl%C3%ADnica%20Psicologia"
                className="mt-4 block text-center py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {t("psy.plans.contact")}
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
