"use client";

// src/app/(dashboard)/admin/payments/PaymentsAdminClient.tsx
import { useState, useEffect } from "react";
import { CreditCard, Loader2, CheckCircle2, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";

interface Payment {
  id: string;
  patientName: string;
  doctorName: string;
  amount: number;
  currency: string;
  status: string;
  paid: boolean;
  paidAt: string | null;
  stripePaymentId: string | null;
  scheduledAt: string;
  createdAt: string;
}
interface Total { currency: string; paidCount: number; paidAmount: number; }

function money(cents: number, currency: string, locale: string) {
  const v = (cents || 0) / 100;
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: currency || "USD" }).format(v);
  } catch {
    return `${currency} ${v.toFixed(2)}`;
  }
}

function fmtDate(iso: string, locale: string) {
  try {
    return new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return iso.slice(0, 10);
  }
}

export default function PaymentsAdminClient() {
  const { lang, t } = useI18n();
  const locale = localeOf(lang);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totals, setTotals] = useState<Total[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/payments");
        const data = await res.json();
        if (res.ok) { setPayments(data.payments || []); setTotals(data.totals || []); }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("admin.payments.title")}</h1>
        <p className="text-slate-500 mt-1">{t("admin.payments.subtitle")}</p>
      </div>

      {totals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {totals.map((tot) => (
            <div key={tot.currency} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-xs text-slate-400 uppercase tracking-wide">
                {t("admin.payments.received").replace("{{currency}}", tot.currency)}
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{money(tot.paidAmount, tot.currency, locale)}</p>
              <p className="text-xs text-slate-500 mt-1">
                {t("admin.payments.confirmedCount").replace("{{count}}", String(tot.paidCount))}
              </p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-10 justify-center">
          <Loader2 size={18} className="animate-spin" /> {t("common.loading")}
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm text-center py-16">
          <CreditCard className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-400 text-sm">{t("admin.payments.empty")}</p>
          <p className="text-slate-400 text-xs mt-1">{t("admin.payments.emptyHint")}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${p.paid ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                {p.paid ? <CheckCircle2 size={18} /> : <Clock size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">{p.patientName} <span className="text-slate-400 font-normal">→</span> {p.doctorName}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t("admin.payments.appointmentOn").replace("{{date}}", fmtDate(p.scheduledAt, locale))}
                  {" · "}
                  {p.paid
                    ? t("admin.payments.paidOn").replace("{{date}}", p.paidAt ? fmtDate(p.paidAt, locale) : "—")
                    : t("admin.payments.notPaid")}
                  {" · "}{p.status}
                </p>
                {p.stripePaymentId && <p className="text-[11px] text-slate-400 mt-0.5">Stripe: {p.stripePaymentId}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-slate-900 text-sm">{money(p.amount, p.currency, locale)}</p>
                <p className={`text-[11px] mt-0.5 ${p.paid ? "text-emerald-600" : "text-slate-400"}`}>
                  {p.paid ? t("admin.payments.statusConfirmed") : t("admin.payments.statusPending")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
