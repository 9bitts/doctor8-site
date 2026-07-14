"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, FileText } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { mapProfessionalPathToPortal } from "@/lib/psychologist-portal";

type RecentRx = {
  id: string;
  createdAt: string;
  patientName: string;
  itemCount: number;
};

export default function IntegrativeRecentPrescriptions() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [items, setItems] = useState<RecentRx[]>([]);
  const [loading, setLoading] = useState(true);

  const href = (path: string) => mapProfessionalPathToPortal(pathname, path);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/professional/medicina-natural/recent-prescriptions");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setItems(data.prescriptions || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 animate-pulse">
        <div className="h-4 bg-slate-100 rounded w-48 mb-3" />
        <div className="h-10 bg-slate-50 rounded-xl" />
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            {t("nm.pro.hub.recentRxTitle")}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">{t("nm.pro.hub.recentRxHint")}</p>
        </div>
        <Link
          href={href("/professional/prescriptions")}
          className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 shrink-0"
        >
          {t("common.viewAll")} <ArrowRight size={14} />
        </Link>
      </div>
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden">
        {items.map((rx) => (
          <li key={rx.id}>
            <Link
              href={href("/professional/prescriptions")}
              className="flex items-center gap-3 px-4 py-3 hover:bg-emerald-50/50 transition"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <FileText size={16} className="text-emerald-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{rx.patientName}</p>
                <p className="text-xs text-slate-500">
                  {new Date(rx.createdAt).toLocaleDateString()} · {t("nm.pro.hub.recentRxItems").replace("{n}", String(rx.itemCount))}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
