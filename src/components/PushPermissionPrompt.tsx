"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { requestPushPermissionAndSubscribe } from "@/lib/push-subscribe-client";

type Context = "booking" | "jit";

type Props = {
  context: Context;
  userId?: string;
};

function canPrompt(): boolean {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;
  return Notification.permission === "default";
}

export default function PushPermissionPrompt({ context, userId }: Props) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!canPrompt()) return;
    if (userId) {
      try {
        if (localStorage.getItem(`doctor8.push.declined.${userId}`)) return;
        if (localStorage.getItem(`doctor8.push.dismissed.${context}.${userId}`)) return;
      } catch { /* ignore */ }
    }
    setVisible(true);
  }, [context, userId]);

  if (!visible || !canPrompt()) return null;

  const titleKey = context === "booking" ? "push.prompt.booking.title" : "push.prompt.jit.title";
  const descKey = context === "booking" ? "push.prompt.booking.desc" : "push.prompt.jit.desc";

  async function enable() {
    setLoading(true);
    const result = await requestPushPermissionAndSubscribe();
    setLoading(false);
    setVisible(false);
    if (userId && result === "denied") {
      try {
        localStorage.setItem(`doctor8.push.declined.${userId}`, "1");
      } catch { /* ignore */ }
    }
  }

  function dismiss() {
    setVisible(false);
    if (userId) {
      try {
        localStorage.setItem(`doctor8.push.dismissed.${context}.${userId}`, "1");
      } catch { /* ignore */ }
    }
  }

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 flex gap-3 items-start">
      <div className="w-9 h-9 rounded-lg bg-white border border-brand-100 flex items-center justify-center shrink-0">
        <Bell size={16} className="text-brand-500" />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <p className="text-sm font-semibold text-slate-800">{t(titleKey)}</p>
        <p className="text-xs text-slate-600 leading-relaxed">{t(descKey)}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={enable}
            disabled={loading}
            className="inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} />}
            {t("push.prompt.enable")}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-2"
          >
            {t("push.prompt.later")}
          </button>
        </div>
      </div>
      <button type="button" onClick={dismiss} className="text-slate-400 hover:text-slate-600 p-1 shrink-0" aria-label={t("common.cancel")}>
        <X size={14} />
      </button>
    </div>
  );
}
