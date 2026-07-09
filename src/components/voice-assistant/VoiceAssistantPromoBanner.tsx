"use client";

import { useEffect, useState } from "react";
import { Mic, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { voiceT } from "@/lib/voice-assistant/i18n";
import OwlIcon from "@/components/voice-assistant/OwlIcon";

const DISMISS_PREFIX = "doctor8:voiceAssistant:promoDismissed";

type Props = {
  userId: string;
};

export function openVoiceAssistantFromBanner() {
  window.dispatchEvent(new CustomEvent("doctor8:voice-assistant:open"));
}

export default function VoiceAssistantPromoBanner({ userId }: Props) {
  const { lang } = useI18n();
  const t = (k: string) => voiceT(k, lang);
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

  return (
    <div
      className="border-b-2 shadow-sm"
      style={{ backgroundColor: "#ede9fe", borderColor: "#c4b5fd" }}
      role="region"
      aria-label={t("promoBanner.title")}
    >
      <div className="px-4 lg:px-8 py-4 sm:py-3.5 flex items-start gap-3 sm:gap-4">
        <div
          className="w-12 h-12 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
          style={{ backgroundColor: "#ffffff", border: "2px solid #a78bfa" }}
        >
          <OwlIcon size={32} />
        </div>

        <div className="flex-1 min-w-0 pt-0.5 pr-1">
          <p
            className="text-base sm:text-lg font-bold leading-snug"
            style={{ color: "#1e1b4b" }}
          >
            {t("promoBanner.title")}
          </p>
          <p
            className="text-sm sm:text-[15px] mt-1.5 leading-relaxed"
            style={{ color: "#334155" }}
          >
            {t("promoBanner.desc")}
          </p>
          <button
            type="button"
            onClick={openVoiceAssistantFromBanner}
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-2.5 shadow-sm transition hover:opacity-95 active:scale-[0.98]"
            style={{ backgroundColor: "#6d28d9", color: "#ffffff" }}
          >
            <Mic size={16} strokeWidth={2.5} />
            {t("promoBanner.cta")}
          </button>
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="p-2 rounded-lg transition shrink-0 -mr-1"
          style={{ color: "#5b21b6" }}
          aria-label={t("close")}
        >
          <X size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
