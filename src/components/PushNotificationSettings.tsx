"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { useT, useI18n } from "@/lib/i18n/I18nProvider";
import { isIosSafariBrowserTab, isWebPushSupported, pushIosAlternativeMessage } from "@/lib/push-subscribe-client";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

type PushState = "unsupported" | "ios_browser" | "disabled" | "prompt" | "granted" | "denied" | "server_off";

export default function PushNotificationSettings() {
  const t = useT();
  const { lang } = useI18n();
  const [state, setState] = useState<PushState>("prompt");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    if (isIosSafariBrowserTab()) {
      setState("ios_browser");
      setLoading(false);
      return;
    }
    if (!isWebPushSupported()) {
      setState("unsupported");
      setLoading(false);
      return;
    }
    try {
      const cfg = await fetch("/api/push/vapid-public-key").then((r) => r.json());
      if (!cfg.enabled) {
        setState("server_off");
        setLoading(false);
        return;
      }
      const perm = Notification.permission;
      if (perm === "granted") setState("granted");
      else if (perm === "denied") setState("denied");
      else setState("prompt");
    } catch {
      setState("server_off");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function enablePush() {
    setBusy(true);
    try {
      const cfg = await fetch("/api/push/vapid-public-key").then((r) => r.json());
      if (!cfg.enabled || !cfg.publicKey) return;

      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "prompt");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(cfg.publicKey) as BufferSource,
        });
      }
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setState("granted");
    } finally {
      setBusy(false);
    }
  }

  async function disablePush() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState(Notification.permission === "denied" ? "denied" : "prompt");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center gap-2 text-slate-400 text-sm">
        <Loader2 size={16} className="animate-spin" /> {t("common.loading")}
      </div>
    );
  }

  if (state === "unsupported" || state === "ios_browser") {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-brand-500" />
          <h2 className="font-bold text-slate-900">{t("push.settingsTitle")}</h2>
        </div>
        <p className="text-sm text-amber-700">{pushIosAlternativeMessage(lang)}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-3">
      <div className="flex items-center gap-2">
        <Bell size={18} className="text-brand-500" />
        <h2 className="font-bold text-slate-900">{t("push.settingsTitle")}</h2>
      </div>
      <p className="text-sm text-slate-500">{t("push.settingsDesc")}</p>

      {state === "server_off" && (
        <p className="text-xs text-slate-400">{t("push.serverOff")}</p>
      )}

      {state === "granted" && (
        <p className="text-sm text-emerald-700 flex items-center gap-2">
          <Bell size={14} /> {t("push.enabled")}
        </p>
      )}

      {state === "denied" && (
        <p className="text-sm text-amber-700">{t("push.deniedHint")}</p>
      )}

      <div className="flex gap-2 flex-wrap">
        {state === "prompt" && (
          <button
            type="button"
            onClick={enablePush}
            disabled={busy}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-xl disabled:opacity-50"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
            {t("push.enable")}
          </button>
        )}
        {state === "granted" && (
          <button
            type="button"
            onClick={disablePush}
            disabled={busy}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 disabled:opacity-50"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <BellOff size={14} />}
            {t("push.disable")}
          </button>
        )}
      </div>
    </div>
  );
}
