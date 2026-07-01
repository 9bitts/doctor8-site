"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { resolveLoginPathForSession } from "@/lib/auth-portals";
import { clearSensitiveClientState } from "@/lib/logout-cleanup";

const inputClass =
  "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-400 transition";

interface DeleteAccountConfirmModalProps {
  open: boolean;
  confirmWord: string;
  onClose: () => void;
}

function DeleteAccountConfirmModal({
  open,
  confirmWord,
  onClose,
}: DeleteAccountConfirmModalProps) {
  const { t } = useI18n();
  const [typed, setTyped] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTyped("");
      setError("");
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  const canConfirm = typed.trim().toUpperCase() === confirmWord.toUpperCase();

  function handleClose() {
    if (loading) return;
    setTyped("");
    setError("");
    onClose();
  }

  async function handleConfirm() {
    if (!canConfirm || loading) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : t("acct.deleteAccount.errGeneric"),
        );
        return;
      }

      clearSensitiveClientState();
      await signOut({ callbackUrl: resolveLoginPathForSession() });
    } catch {
      setError(t("acct.deleteAccount.errGeneric"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          disabled={loading}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 disabled:opacity-40"
          aria-label={t("acct.deleteAccount.cancel")}
        >
          <X size={20} />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <div className="shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div>
            <h2
              id="delete-account-modal-title"
              className="text-lg font-bold text-slate-900"
            >
              {t("acct.deleteAccount.modalTitle")}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {t("acct.deleteAccount.modalDesc")}
            </p>
          </div>
        </div>

        <div>
          <label
            htmlFor="delete-account-confirm-input"
            className="block text-sm font-medium text-slate-600 mb-1.5"
          >
            {t("acct.deleteAccount.typeHint")}
          </label>
          <input
            id="delete-account-confirm-input"
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            disabled={loading}
            className={inputClass + (loading ? " opacity-60" : "")}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="w-full sm:w-auto text-sm font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 rounded-xl transition min-h-[44px]"
          >
            {t("acct.deleteAccount.cancel")}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
            className="w-full sm:w-auto text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 rounded-xl transition min-h-[44px] flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {loading ? t("acct.deleteAccount.deleting") : t("acct.deleteAccount.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DeleteAccountSection() {
  const { t } = useI18n();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-semibold text-red-700">
            {t("acct.deleteAccount.title")}
          </p>
          <p className="text-xs text-slate-500 leading-relaxed">
            {t("acct.deleteAccount.desc")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="w-full sm:w-auto shrink-0 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 px-4 py-2.5 rounded-xl transition min-h-[44px]"
        >
          {t("acct.deleteAccount.btn")}
        </button>
      </div>

      <DeleteAccountConfirmModal
        open={modalOpen}
        confirmWord={t("acct.deleteAccount.confirmWord")}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
