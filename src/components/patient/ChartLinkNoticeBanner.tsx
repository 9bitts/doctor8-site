"use client";

import { useState } from "react";
import Link from "next/link";
import { Link2, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

export type ChartLinkNoticeItem = {
  id: string;
  doctorName: string;
  body: string;
};

type Props = {
  notices: ChartLinkNoticeItem[];
};

export default function ChartLinkNoticeBanner({ notices: initial }: Props) {
  const { t } = useI18n();
  const [notices, setNotices] = useState(initial);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ id: string; text: string } | null>(null);

  if (notices.length === 0) return null;

  async function respond(id: string, action: "ack" | "reject") {
    setLoadingId(id);
    setActionMsg(null);
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok) {
        setActionMsg({ id, text: t("chartLink.err") });
        return;
      }
      setNotices((prev) => prev.filter((n) => n.id !== id));
      if (action === "reject") {
        setActionMsg({ id: "done", text: t("chartLink.rejectDone") });
      }
    } catch {
      setActionMsg({ id, text: t("chartLink.err") });
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {actionMsg?.id === "done" && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-900">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>{actionMsg.text}</span>
        </div>
      )}

      {notices.map((notice) => {
        const doctor = notice.doctorName || t("chartLink.unknownDoctor");
        const loading = loadingId === notice.id;

        return (
          <div
            key={notice.id}
            className="relative bg-gradient-to-r from-sky-50/90 to-blue-50/70 border border-sky-200/80 rounded-2xl p-5 sm:p-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white border border-sky-200 flex items-center justify-center shrink-0">
                <Link2 size={18} className="text-sky-600" />
              </div>

              <div className="flex-1 space-y-3 min-w-0">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {t("chartLink.title").replace("{{doctor}}", doctor)}
                  </p>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    {notice.body || t("chartLink.body").replace("{{doctor}}", doctor)}
                  </p>
                </div>

                {actionMsg?.id === notice.id && (
                  <p className="text-xs text-red-600">{actionMsg.text}</p>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => respond(notice.id, "ack")}
                    disabled={loading}
                    className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
                  >
                    {loading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    {t("chartLink.ack")}
                  </button>
                  <Link
                    href="/patient/providers"
                    className="inline-flex items-center text-sm font-medium text-sky-700 hover:text-sky-900 px-3 py-2.5"
                  >
                    {t("nav.myProviders")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => respond(notice.id, "reject")}
                    disabled={loading}
                    className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-red-700 px-3 py-2.5"
                  >
                    {t("chartLink.reject")}
                  </button>
                </div>

                <p className="text-xs text-slate-400">{t("chartLink.footnote")}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
