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
    <div className="bg-gradient-to-r from-violet-600 via-violet-600 to-indigo-700 text-white border-b border-violet-500/40">
      <div className="px-4 lg:px-8 py-3.5 flex items-start gap-3 sm:gap-4">
        <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0 text-white">
          <OwlIcon size={30} />
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-sm sm:text-base font-bold tracking-tight">{t("promoBanner.title")}</p>
          <p className="text-xs sm:text-sm text-violet-100 mt-1 leading-relaxed max-w-3xl">
            {t("promoBanner.desc")}
          </p>
          <button
            type="button"
            onClick={openVoiceAssistantFromBanner}
            className="mt-2.5 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold bg-white/15 hover:bg-white/25 border border-white/25 rounded-lg px-3 py-1.5 transition"
          >
            <Mic size={14} />
            {t("promoBanner.cta")}
          </button>
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="p-1.5 rounded-lg text-violet-200 hover:text-white hover:bg-white/10 transition shrink-0"
          aria-label={t("close")}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
