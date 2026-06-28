"use client";

import { useState, useEffect } from "react";
import { ShoppingBag, Loader2, Search, Users, Stethoscope, User } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { TranslationKey } from "@/lib/i18n/translations";

interface Club {
  id: string;
  status: string;
  activeCount: number;
  patientCount: number;
  professionalCount: number;
  drugName: string;
  activeIngredient: string;
  presentation: string;
  manufacturer: string | null;
  createdAt: string;
  updatedAt: string;
}

function clubStatusKey(status: string): TranslationKey | null {
  switch (status) {
    case "OPEN":
      return "admin.buyingClubs.statusOpen";
    case "READY":
      return "admin.buyingClubs.statusReady";
    case "CLOSED":
      return "admin.buyingClubs.statusClosed";
    default:
      return null;
  }
}

export default function BuyingClubsAdminClient() {
  const { t } = useI18n();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/buying-clubs");
        const data = await res.json();
        if (res.ok) setClubs(data.clubs || []);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const filtered = clubs.filter((c) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      c.drugName.toLowerCase().includes(s) ||
      c.activeIngredient.toLowerCase().includes(s)
    );
  });

  const totalMembers = clubs.reduce((sum, c) => sum + c.activeCount, 0);
  const totalPatients = clubs.reduce((sum, c) => sum + c.patientCount, 0);
  const totalProfessionals = clubs.reduce((sum, c) => sum + c.professionalCount, 0);

  const summary = t("admin.buyingClubs.summary")
    .replace("{{clubs}}", String(clubs.length))
    .replace("{{members}}", String(totalMembers))
    .replace("{{patients}}", String(totalPatients))
    .replace("{{pros}}", String(totalProfessionals));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("admin.buyingClubs.title")}</h1>
        <p className="text-slate-500 mt-1">{summary}</p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("admin.buyingClubs.searchPlaceholder")}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm"
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-10 justify-center">
          <Loader2 size={18} className="animate-spin" /> {t("common.loading")}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm text-center py-16">
          <ShoppingBag className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-400 text-sm">{t("admin.buyingClubs.empty")}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
          {filtered.map((c) => {
            const statusKey = clubStatusKey(c.status);
            return (
              <div key={c.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <ShoppingBag size={18} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{c.drugName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {c.activeIngredient} · {c.presentation}
                    {c.manufacturer ? ` · ${c.manufacturer}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <p className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
                    <Users size={14} />{" "}
                    {t("admin.buyingClubs.activeCount").replace("{{n}}", String(c.activeCount))}
                  </p>
                  <p className="text-[11px] text-slate-500 flex items-center justify-end gap-2">
                    <span className="inline-flex items-center gap-0.5">
                      <User size={11} /> {c.patientCount}
                    </span>
                    <span className="inline-flex items-center gap-0.5">
                      <Stethoscope size={11} /> {c.professionalCount}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {statusKey ? t(statusKey) : c.status}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
