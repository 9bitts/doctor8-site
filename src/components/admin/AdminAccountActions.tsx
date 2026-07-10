"use client";

import { useState } from "react";
import { Loader2, Mail, KeyRound, Unlock, CheckCircle2, AlertTriangle, Lock } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import AdminViewPhoneButton from "@/components/admin/AdminViewPhoneButton";

interface AdminAccountActionsProps {
  userId: string;
  emailVerified: boolean;
  locked?: boolean;
  compact?: boolean;
  onActionDone?: () => void;
}

export default function AdminAccountActions({
  userId,
  emailVerified,
  locked = false,
  compact = false,
  onActionDone,
}: AdminAccountActionsProps) {
  const { t } = useI18n();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function verifyEmail() {
    if (!confirm(t("admin.providers.verifyEmailConfirm"))) return;
    setBusy("verify");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/users/${userId}/verify-email`, { method: "POST" });
      if (!res.ok) {
        setMessage(t("admin.providers.verifyEmailFail"));
        return;
      }
      setMessage(t("admin.account.emailVerifiedOk"));
      onActionDone?.();
    } catch {
      setMessage(t("admin.providers.verifyEmailErr"));
    } finally {
      setBusy(null);
    }
  }

  async function resetPassword() {
    if (!confirm(t("admin.account.resetPasswordConfirm"))) return;
    setBusy("reset");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, { method: "POST" });
      if (!res.ok) {
        setMessage(t("admin.account.resetPasswordFail"));
        return;
      }
      setMessage(t("admin.account.resetPasswordOk"));
    } catch {
      setMessage(t("admin.account.resetPasswordFail"));
    } finally {
      setBusy(null);
    }
  }

  async function unlockAccount() {
    if (!confirm(t("admin.account.unlockConfirm"))) return;
    setBusy("unlock");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/users/${userId}/unlock`, { method: "POST" });
      if (!res.ok) {
        setMessage(t("admin.account.unlockFail"));
        return;
      }
      setMessage(t("admin.account.unlockOk"));
      onActionDone?.();
    } catch {
      setMessage(t("admin.account.unlockFail"));
    } finally {
      setBusy(null);
    }
  }

  const btnClass = compact
    ? "inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition disabled:opacity-50"
    : "inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border transition disabled:opacity-50";

  return (
    <div className={compact ? "flex flex-wrap gap-2" : "bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3"}>
      {!compact && (
        <div>
          <h2 className="text-sm font-bold text-slate-900">{t("admin.account.title")}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t("admin.account.subtitle")}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!emailVerified && (
          <button
            type="button"
            onClick={verifyEmail}
            disabled={!!busy}
            className={`${btnClass} border-amber-200 text-amber-700 hover:bg-amber-50`}
          >
            {busy === "verify" ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
            {t("admin.providers.verifyEmail")}
          </button>
        )}
        {emailVerified && !compact && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
            <CheckCircle2 size={12} /> {t("admin.account.emailVerifiedBadge")}
          </span>
        )}

        <button
          type="button"
          onClick={resetPassword}
          disabled={!!busy}
          className={`${btnClass} border-slate-200 text-slate-700 hover:bg-slate-50`}
        >
          {busy === "reset" ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
          {t("admin.account.resetPassword")}
        </button>

        {locked && (
          <button
            type="button"
            onClick={unlockAccount}
            disabled={!!busy}
            className={`${btnClass} border-rose-200 text-rose-700 hover:bg-rose-50`}
          >
            {busy === "unlock" ? <Loader2 size={14} className="animate-spin" /> : <Unlock size={14} />}
            {t("admin.account.unlock")}
          </button>
        )}

        {locked && !compact && (
          <span className="inline-flex items-center gap-1 text-xs text-rose-700 bg-rose-50 px-2 py-1 rounded-lg">
            <Lock size={12} /> {t("admin.account.lockedBadge")}
          </span>
        )}

        {!compact && <AdminViewPhoneButton userId={userId} />}
      </div>

      {message && (
        <p className={`text-xs ${message.includes("Fail") || message.includes("Erro") || message.includes("falha") ? "text-rose-600" : "text-emerald-700"}`}>
          {message}
        </p>
      )}
    </div>
  );
}

/** Inline status chips for list views. */
export function AdminAccountStatusBadges({
  emailVerified,
  locked,
  failedLoginAttempts,
}: {
  emailVerified: boolean;
  locked: boolean;
  failedLoginAttempts?: number;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-1">
      {!emailVerified && (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">
          <AlertTriangle size={10} /> {t("admin.account.unverified")}
        </span>
      )}
      {locked && (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100">
          <Lock size={10} /> {t("admin.account.lockedBadge")}
        </span>
      )}
      {!locked && (failedLoginAttempts ?? 0) >= 3 && (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-100">
          {failedLoginAttempts} {t("admin.account.failedAttempts")}
        </span>
      )}
    </div>
  );
}
