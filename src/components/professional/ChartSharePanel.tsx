"use client";

import { useEffect, useState } from "react";
import { Users, Copy, Loader2, X, Search, Building2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

type ShareItem = {
  id: string;
  permission: string;
  colleague: { name: string; specialty: string } | null;
  clinic: { id: string; name: string } | null;
};

type ProResult = { id: string; name: string; specialty: string };

export default function ChartSharePanel({ chartId }: { chartId: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [clinic, setClinic] = useState<{ id: string; name: string } | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProResult[]>([]);
  const [permission, setPermission] = useState<"VIEW" | "EDIT">("VIEW");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [shRes, clRes] = await Promise.all([
          fetch(`/api/professional/records/${chartId}/share-colleague`),
          fetch("/api/professional/clinic"),
        ]);
        const shData = await shRes.json();
        const clData = await clRes.json();
        if (!active) return;
        if (shRes.ok) setShares(shData.shares || []);
        if (clRes.ok && clData.clinic) setClinic({ id: clData.clinic.id, name: clData.clinic.name });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [open, chartId]);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const tmr = setTimeout(async () => {
      const res = await fetch(`/api/professional/search-pros?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.professionals || []);
    }, 300);
    return () => clearTimeout(tmr);
  }, [query]);

  async function shareWithColleague(colleagueId: string) {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`/api/professional/records/${chartId}/share-colleague`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: "colleague", colleagueId, permission }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || t("clinic.shareError"));
        return;
      }
      setQuery("");
      setResults([]);
      const shRes = await fetch(`/api/professional/records/${chartId}/share-colleague`);
      const shData = await shRes.json();
      if (shRes.ok) setShares(shData.shares || []);
      setMsg(t("clinic.shareSuccess"));
    } finally {
      setSaving(false);
    }
  }

  async function shareWithClinic() {
    if (!clinic) return;
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`/api/professional/records/${chartId}/share-colleague`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: "clinic", permission }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || t("clinic.shareError"));
        return;
      }
      const shRes = await fetch(`/api/professional/records/${chartId}/share-colleague`);
      const shData = await shRes.json();
      if (shRes.ok) setShares(shData.shares || []);
      setMsg(t("clinic.shareSuccess"));
    } finally {
      setSaving(false);
    }
  }

  async function revoke(shareId: string) {
    await fetch(`/api/professional/records/${chartId}/share-colleague/${shareId}`, { method: "DELETE" });
    setShares((prev) => prev.filter((s) => s.id !== shareId));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-brand-600 border border-slate-200 hover:border-brand-200 px-3 py-1.5 rounded-lg transition"
      >
        <Users size={14} /> {t("clinic.shareChart")}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="font-bold text-slate-900">{t("clinic.shareChart")}</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("clinic.permission")}</label>
                <select
                  value={permission}
                  onChange={(e) => setPermission(e.target.value as "VIEW" | "EDIT")}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                >
                  <option value="VIEW">{t("clinic.permView")}</option>
                  <option value="EDIT">{t("clinic.permEdit")}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("clinic.searchColleague")}</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("clinic.searchPlaceholder")}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                {results.length > 0 && (
                  <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {results.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        disabled={saving}
                        onClick={() => shareWithColleague(p.id)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm disabled:opacity-50"
                      >
                        <span className="font-medium text-slate-800">{p.name}</span>
                        <span className="text-xs text-slate-400 ml-2">{p.specialty}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {clinic && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={shareWithClinic}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-brand-200 bg-brand-50 text-brand-700 text-sm font-semibold hover:bg-brand-100 disabled:opacity-50"
                >
                  <Building2 size={16} /> {t("clinic.shareWithTeam").replace("{name}", clinic.name)}
                </button>
              )}

              {msg && <p className="text-xs text-brand-600">{msg}</p>}

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">{t("clinic.activeShares")}</p>
                {loading ? (
                  <Loader2 size={16} className="animate-spin text-slate-400" />
                ) : shares.length === 0 ? (
                  <p className="text-xs text-slate-400">{t("clinic.noShares")}</p>
                ) : (
                  <ul className="space-y-2">
                    {shares.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-2 text-sm bg-slate-50 rounded-lg px-3 py-2">
                        <div>
                          <p className="font-medium text-slate-800">
                            {s.colleague?.name || s.clinic?.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {s.permission === "EDIT" ? t("clinic.permEdit") : t("clinic.permView")}
                          </p>
                        </div>
                        <button type="button" onClick={() => revoke(s.id)} className="text-xs text-rose-600 hover:underline">
                          {t("clinic.revoke")}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
