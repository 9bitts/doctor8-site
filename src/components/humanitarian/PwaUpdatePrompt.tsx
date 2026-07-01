"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { getHumanitarianLang } from "@/components/humanitarian/HumanitarianLangSwitcher";
import { translate, type Lang } from "@/lib/i18n/translations";

function isHumanitarianPath(pathname: string) {
  return pathname === "/sos-venezuela" || pathname.startsWith("/humanitarian/");
}

export default function PwaUpdatePrompt() {
  const [lang, setLang] = useState<Lang>("es");
  const [visible, setVisible] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    setLang(getHumanitarianLang());
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (!isHumanitarianPath(window.location.pathname)) return;

    let active = true;

    function onUpdate(registration: ServiceWorkerRegistration) {
      const worker = registration.waiting;
      if (!worker || !active) return;
      setWaitingWorker(worker);
      setVisible(true);
    }

    navigator.serviceWorker.getRegistration("/").then((registration) => {
      if (!registration || !active) return;
      if (registration.waiting) onUpdate(registration);

      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            onUpdate(registration);
          }
        });
      });
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    function onControllerChange() {
      window.location.reload();
    }
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, [visible]);

  if (!visible || !waitingWorker) return null;

  function applyUpdate() {
    waitingWorker?.postMessage({ type: "SKIP_WAITING" });
  }

  function dismiss() {
    setVisible(false);
    setWaitingWorker(null);
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto rounded-2xl border border-emerald-500/30 bg-slate-900/95 backdrop-blur-md shadow-xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
          <RefreshCw size={18} className="text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{translate(lang, "hum.pwa.updateTitle")}</p>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{translate(lang, "hum.pwa.updateDesc")}</p>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={applyUpdate}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold"
            >
              {translate(lang, "hum.pwa.updateAction")}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="px-3 py-2 rounded-lg text-slate-400 hover:text-white text-xs"
            >
              {translate(lang, "hum.pwa.updateDismiss")}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-slate-500 hover:text-white shrink-0 p-1"
          aria-label={translate(lang, "hum.pwa.updateDismiss")}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
