"use client";

import { Clock, LogOut } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useSessionInactivityWarning } from "@/hooks/useSessionInactivityWarning";

export default function SessionInactivityWarning() {
  const { t } = useI18n();
  const { warningOpen, secondsLeft, continueSession, performLogout } =
    useSessionInactivityWarning(true);

  if (!warningOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-[1px]"
      role="presentation"
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5 relative"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-inactivity-title"
        aria-describedby="session-inactivity-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center">
            <Clock size={22} className="text-amber-700" aria-hidden />
          </div>
          <div>
            <h2
              id="session-inactivity-title"
              className="text-lg font-bold text-slate-900"
            >
              {t("session.inactivity.title")}
            </h2>
            <p
              id="session-inactivity-desc"
              className="text-sm text-slate-600 mt-1"
            >
              {t("session.inactivity.desc")}
            </p>
          </div>
        </div>

        <div
          className="flex flex-col items-center justify-center rounded-xl bg-slate-50 border border-slate-200 py-5"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="text-4xl font-bold tabular-nums text-slate-900">
            {secondsLeft}
          </span>
          <span className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wide">
            {t("session.inactivity.secondsLabel")}
          </span>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={() => void performLogout()}
            className="w-full sm:w-auto text-sm font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl transition min-h-[44px] inline-flex items-center justify-center gap-2"
          >
            <LogOut size={16} aria-hidden />
            {t("session.inactivity.signOut")}
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => void continueSession()}
            className="w-full sm:w-auto text-sm font-semibold text-white bg-[#176a88] hover:bg-[#125a72] px-4 py-2.5 rounded-xl transition min-h-[44px]"
          >
            {t("session.inactivity.continue")}
          </button>
        </div>
      </div>
    </div>
  );
}
