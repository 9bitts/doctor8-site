"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { translate, type Lang } from "@/lib/i18n/translations";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PwaVariant = "hum" | "patient";

function dismissKey(variant: PwaVariant, userId?: string): string {
  if (variant === "patient" && userId) return `doctor8.pwa-install-dismissed.${userId}`;
  return "doctor8:pwa-install-dismissed";
}

export default function PwaInstallPrompt({
  lang,
  variant = "hum",
  userId,
}: {
  lang: Lang;
  variant?: PwaVariant;
  userId?: string;
}) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  const titleKey = variant === "patient" ? "patient.pwa.installTitle" : "hum.pwa.installTitle";
  const descKey = variant === "patient" ? "patient.pwa.installDesc" : "hum.pwa.installDesc";
  const actionKey = variant === "patient" ? "patient.pwa.installAction" : "hum.pwa.installAction";
  const dismissKeyLabel = variant === "patient" ? "patient.pwa.installDismiss" : "hum.pwa.installDismiss";

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (variant === "patient" && !userId) return;
    if (localStorage.getItem(dismissKey(variant, userId))) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, [variant, userId]);

  if (!visible || !deferred) return null;

  const isPatient = variant === "patient";

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setVisible(false);
    setDeferred(null);
  }

  function dismiss() {
    localStorage.setItem(dismissKey(variant, userId), "1");
    setVisible(false);
    setDeferred(null);
  }

  return (
    <div
      className={
        isPatient
          ? "fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto rounded-2xl border border-brand-200 bg-white shadow-lg p-4"
          : "fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto rounded-2xl border border-emerald-500/30 bg-slate-900/95 backdrop-blur-md shadow-xl p-4"
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={
            isPatient
              ? "w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 overflow-hidden"
              : "w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden"
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" className="w-8 h-8 object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${isPatient ? "text-slate-900" : "text-white"}`}>
            {translate(lang, titleKey)}
          </p>
          <p className={`text-xs mt-1 leading-relaxed ${isPatient ? "text-slate-500" : "text-slate-400"}`}>
            {translate(lang, descKey)}
          </p>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={install}
              className={
                isPatient
                  ? "px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold"
                  : "px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold"
              }
            >
              {translate(lang, actionKey)}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className={
                isPatient
                  ? "px-3 py-2 rounded-lg text-slate-500 hover:text-slate-800 text-xs"
                  : "px-3 py-2 rounded-lg text-slate-400 hover:text-white text-xs"
              }
            >
              {translate(lang, dismissKeyLabel)}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className={`shrink-0 p-1 ${isPatient ? "text-slate-400 hover:text-slate-700" : "text-slate-500 hover:text-white"}`}
          aria-label={translate(lang, dismissKeyLabel)}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
