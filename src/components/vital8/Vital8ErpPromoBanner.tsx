"use client";

import { useEffect, useState } from "react";
import { BarChart3, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { VITAL8_ERP_URL, type Vital8B2BRole } from "@/lib/vital8-erp";

const DISMISS_PREFIX = "doctor8:vital8erp:dismissed";

const ROLE_THEME: Record<
  Vital8B2BRole,
  { bg: string; border: string; iconBorder: string; title: string; desc: string; cta: string; dismiss: string }
> = {
  ORGANIZATION: {
    bg: "#eef2ff",
    border: "#a5b4fc",
    iconBorder: "#6366f1",
    title: "#1e1b4b",
    desc: "#334155",
    cta: "#4f46e5",
    dismiss: "#4338ca",
  },
  EMPLOYER: {
    bg: "#e0f2fe",
    border: "#7dd3fc",
    iconBorder: "#0284c7",
    title: "#0c4a6e",
    desc: "#334155",
    cta: "#0369a1",
    dismiss: "#075985",
  },
  PHARMACY_STORE: {
    bg: "#ecfdf5",
    border: "#6ee7b7",
    iconBorder: "#059669",
    title: "#064e3b",
    desc: "#334155",
    cta: "#047857",
    dismiss: "#065f46",
  },
  LABORATORY: {
    bg: "#f5f3ff",
    border: "#c4b5fd",
    iconBorder: "#7c3aed",
    title: "#1e1b4b",
    desc: "#334155",
    cta: "#6d28d9",
    dismiss: "#5b21b6",
  },
};

type Props = {
  userId: string;
  role: Vital8B2BRole;
};

export function openVital8Erp() {
  window.open(VITAL8_ERP_URL, "_blank", "noopener,noreferrer");
}

export default function Vital8ErpPromoBanner({ userId, role }: Props) {
  const { t } = useI18n();
  const theme = ROLE_THEME[role];
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      const key = `${DISMISS_PREFIX}:${userId}`;
      setDismissed(localStorage.getItem(key) === "1");
    } catch {
      setDismissed(false);
    }
  }, [userId]);

  if (dismissed) return null;

  function dismiss() {
    try {
      localStorage.setItem(`${DISMISS_PREFIX}:${userId}`, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  const roleKey = role === "PHARMACY_STORE" ? "pharmacy" : role.toLowerCase();

  return (
    <div
      className="border-b-2 shadow-sm"
      style={{ backgroundColor: theme.bg, borderColor: theme.border }}
      role="region"
      aria-label={t(`vital8.banner.${roleKey}.title`)}
    >
      <div className="px-4 lg:px-8 py-4 sm:py-3.5 flex items-start gap-3 sm:gap-4">
        <div
          className="w-12 h-12 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
          style={{ backgroundColor: "#ffffff", border: `2px solid ${theme.iconBorder}` }}
        >
          <BarChart3 size={24} style={{ color: theme.iconBorder }} strokeWidth={2.5} />
        </div>

        <div className="flex-1 min-w-0 pt-0.5 pr-1">
          <p
            className="text-base sm:text-lg font-bold leading-snug"
            style={{ color: theme.title }}
          >
            {t(`vital8.banner.${roleKey}.title`)}
          </p>
          <p
            className="text-sm sm:text-[15px] mt-1.5 leading-relaxed"
            style={{ color: theme.desc }}
          >
            {t(`vital8.banner.${roleKey}.desc`)}
          </p>
          <button
            type="button"
            onClick={openVital8Erp}
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-2.5 shadow-sm transition hover:opacity-95 active:scale-[0.98]"
            style={{ backgroundColor: theme.cta, color: "#ffffff" }}
          >
            {t(`vital8.banner.${roleKey}.cta`)}
          </button>
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="p-2 rounded-lg transition shrink-0 -mr-1"
          style={{ color: theme.dismiss }}
          aria-label={t("vital8.banner.close")}
        >
          <X size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
