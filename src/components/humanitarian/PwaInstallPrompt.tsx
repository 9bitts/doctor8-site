"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { translate, type Lang } from "@/lib/i18n/translations";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "doctor8:pwa-install-dismissed";

export default function PwaInstallPrompt({ lang }: { lang: Lang }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (!visible || !deferred) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setVisible(false);
    setDeferred(null);
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
    setDeferred(null);
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto rounded-2xl border border-emerald-500/30 bg-slate-900/95 backdrop-blur-md shadow-xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
          <Download size={18} className="text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{translate(lang, "hum.pwa.installTitle")}</p>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{translate(lang, "hum.pwa.installDesc")}</p>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={install}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold"
            >
              {translate(lang, "hum.pwa.installAction")}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="px-3 py-2 rounded-lg text-slate-400 hover:text-white text-xs"
            >
              {translate(lang, "hum.pwa.installDismiss")}
            </button>
          </div>
        </div>
        <button type="button" onClick={dismiss} className="text-slate-500 hover:text-white shrink-0 p-1" aria-label={translate(lang, "hum.pwa.installDismiss")}>
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
