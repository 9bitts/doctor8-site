"use client";

import { useState } from "react";
import { Phone, Loader2, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import AdminContactWhatsAppActions from "@/components/admin/AdminContactWhatsAppActions";

interface PhoneData {
  accountPhone: string | null;
  profilePhone: string | null;
  phoneVerified: boolean;
  hasPhone: boolean;
}

export default function AdminViewPhoneButton({
  userId,
  whatsappMessage,
}: {
  userId: string;
  whatsappMessage?: string;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<PhoneData | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${userId}/phone`);
      const json = await res.json();
      if (!res.ok) {
        setError(t("admin.viewPhone.fail"));
        return;
      }
      setData(json);
    } catch {
      setError(t("admin.viewPhone.fail"));
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setData(null);
    setError("");
  }

  const displayPhone = data?.profilePhone || data?.accountPhone || "";

  return (
    <>
      <button
        type="button"
        onClick={load}
        disabled={busy}
        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Phone size={14} />}
        {t("admin.viewPhone.button")}
      </button>

      {(data || error) && (
        <div className="fixed inset-0 bg-black/50 z-[1200] flex items-center justify-center p-4" onClick={close}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-900">{t("admin.viewPhone.title")}</h3>
              <button type="button" onClick={close} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {error ? (
              <p className="text-sm text-rose-600">{error}</p>
            ) : data && !data.hasPhone ? (
              <p className="text-sm text-slate-500">{t("admin.viewPhone.empty")}</p>
            ) : data ? (
              <div className="space-y-3 text-sm">
                {(data.profilePhone || data.accountPhone) && (
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">
                      {data.profilePhone ? t("admin.viewPhone.profile") : t("admin.viewPhone.account")}
                    </p>
                    <p className="font-medium text-slate-800">
                      {data.profilePhone || data.accountPhone}
                    </p>
                  </div>
                )}
                {data.profilePhone && data.accountPhone && data.accountPhone !== data.profilePhone && (
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">{t("admin.viewPhone.account")}</p>
                    <p className="font-medium text-slate-800">{data.accountPhone}</p>
                  </div>
                )}
                {data.accountPhone && (
                  <p className="text-xs text-slate-500">
                    {data.phoneVerified
                      ? t("admin.viewPhone.verified")
                      : t("admin.viewPhone.notVerified")}
                  </p>
                )}
                {displayPhone && (
                  <AdminContactWhatsAppActions
                    phone={displayPhone}
                    whatsappMessage={whatsappMessage}
                    onInboxClick={close}
                  />
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
