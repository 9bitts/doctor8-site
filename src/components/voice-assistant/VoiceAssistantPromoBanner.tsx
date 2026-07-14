"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Mic, Sparkles, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { voiceT } from "@/lib/voice-assistant/i18n";
import { getPrimaryVoiceExample } from "@/lib/voice-assistant/portal-examples";
import { resolveSkillsPortalFromPathname } from "@/lib/voice-assistant/portal-resolver";
import type { VoicePortalId } from "@/lib/voice-assistant/types";
import OwlIcon from "@/components/voice-assistant/OwlIcon";

const DISMISS_PREFIX = "doctor8:voiceAssistant:promoDismissed";

type Props = {
  userId: string;
  portalId: VoicePortalId;
};

export function openVoiceAssistantFromBanner() {
  window.dispatchEvent(new CustomEvent("doctor8:voice-assistant:open"));
}

export default function VoiceAssistantPromoBanner({ userId, portalId }: Props) {
  const { lang } = useI18n();
  const pathname = usePathname();
  const t = (k: string) => voiceT(k, lang);
  const [dismissed, setDismissed] = useState(true);
  const [primaryExample, setPrimaryExample] = useState<string | null>(null);

  const skillsPortal = resolveSkillsPortalFromPathname(pathname) || portalId;
  const fallbackExample = getPrimaryVoiceExample(skillsPortal);
  const example = primaryExample ?? fallbackExample;

  useEffect(() => {
    try {
      const key = `${DISMISS_PREFIX}:${userId}`;
      setDismissed(localStorage.getItem(key) === "1");
    } catch {
      setDismissed(false);
    }
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    fetch(
      `/api/voice-assistant/context?portalId=${encodeURIComponent(portalId)}&pathname=${encodeURIComponent(pathname)}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        setPrimaryExample(data?.primaryExample ?? null);
      })
      .catch(() => {
        if (!cancelled) setPrimaryExample(null);
      });
    return () => {
      cancelled = true;
    };
  }, [portalId, pathname]);

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
      className="relative overflow-hidden border-b"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 45%, #312e81 100%)",
        borderColor: "rgba(99, 102, 241, 0.35)",
      }}
      role="region"
      aria-label={t("promoBanner.title")}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.15) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div
        className="pointer-events-none absolute -top-16 -left-10 h-40 w-40 rounded-full blur-3xl"
        style={{ backgroundColor: "rgba(34, 211, 238, 0.25)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-20 right-0 h-44 w-44 rounded-full blur-3xl"
        style={{ backgroundColor: "rgba(124, 58, 237, 0.3)" }}
      />

      <div className="relative px-4 lg:px-8 py-4 sm:py-5 flex items-start gap-3 sm:gap-4">
        <div className="relative shrink-0">
          <div
            className="absolute inset-0 rounded-2xl animate-pulse"
            style={{ boxShadow: "0 0 24px rgba(34, 211, 238, 0.35)" }}
          />
          <div
            className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(145deg, rgba(15,23,42,0.9) 0%, rgba(49,46,129,0.85) 100%)",
              border: "1px solid rgba(103, 232, 249, 0.35)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
          >
            <OwlIcon size={34} variant="light" />
          </div>
        </div>

        <div className="flex-1 min-w-0 pt-0.5 pr-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-base sm:text-lg font-bold leading-snug" style={{ color: "#f8fafc" }}>
              {t("promoBanner.title")}
            </p>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{
                color: "#67e8f9",
                backgroundColor: "rgba(34, 211, 238, 0.12)",
                border: "1px solid rgba(34, 211, 238, 0.25)",
              }}
            >
              <Sparkles size={10} />
              AI
            </span>
          </div>
          <p className="text-sm sm:text-[15px] mt-1.5 leading-relaxed" style={{ color: "#cbd5e1" }}>
            {t("promoBanner.desc")}
          </p>
          {example && (
            <div
              className="mt-3 inline-flex max-w-full items-start gap-2 rounded-xl px-3 py-2"
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(148, 163, 184, 0.2)",
              }}
            >
              <Mic size={14} className="shrink-0 mt-0.5" style={{ color: "#67e8f9" }} />
              <p className="text-xs sm:text-sm italic leading-relaxed" style={{ color: "#e2e8f0" }}>
                {t("promoBanner.examplePrefix")} &ldquo;{example}&rdquo;
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={openVoiceAssistantFromBanner}
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-2.5 transition hover:brightness-110 active:scale-[0.98]"
            style={{
              background: "linear-gradient(90deg, #0891b2 0%, #6366f1 50%, #7c3aed 100%)",
              color: "#ffffff",
              boxShadow: "0 8px 24px rgba(99, 102, 241, 0.35)",
            }}
          >
            <Mic size={16} strokeWidth={2.5} />
            {t("promoBanner.cta")}
          </button>
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="p-2 rounded-lg transition shrink-0 -mr-1 hover:bg-white/10"
          style={{ color: "#94a3b8" }}
          aria-label={t("close")}
        >
          <X size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
