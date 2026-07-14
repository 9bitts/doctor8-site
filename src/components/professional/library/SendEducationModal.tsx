"use client";

import { useCallback, useEffect, useState } from "react";
import {
  X, BookOpen, Loader2, Share2, Package, Sparkles, ExternalLink,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/toast";
import type { LibraryResourceDto } from "@/lib/professional-library/types";
import ShareResourceModal from "./ShareResourceModal";

interface SendEducationModalProps {
  apiBase?: string;
  chartId: string;
  patientName: string;
  recipientMode?: "patient" | "analysand";
  onClose: () => void;
}

export default function SendEducationModal({
  apiBase = "/api/professional",
  chartId,
  patientName,
  recipientMode = "patient",
  onClose,
}: SendEducationModalProps) {
  const { t, lang } = useI18n();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<LibraryResourceDto[]>([]);
  const [packs, setPacks] = useState<{ id: string; title: string; description: string; itemCount: number }[]>([]);
  const [shareResource, setShareResource] = useState<LibraryResourceDto | null>(null);
  const [importing, setImporting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/library/suggestions?chartId=${encodeURIComponent(chartId)}`);
      const data = await res.json();
      if (res.ok) {
        setSuggestions(data.suggestions || []);
        setPacks(data.packs || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [apiBase, chartId]);

  useEffect(() => { void load(); }, [load]);

  async function importAndShare(packId: string) {
    setImporting(packId);
    try {
      const res = await fetch(`${apiBase}/library/import-pack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId, lang }),
      });
      if (res.ok || res.status === 409) {
        await load();
        toast.success(t("libHub.importSuccess"));
      }
    } catch { /* ignore */ }
    setImporting(null);
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-[90] p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <BookOpen size={18} className="text-brand-500" /> {t("libHub.sendEducation")}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{patientName}</p>
            </div>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            {loading ? (
              <div className="flex justify-center py-8 text-slate-400 gap-2">
                <Loader2 size={18} className="animate-spin" /> {t("common.loading")}
              </div>
            ) : (
              <>
                {packs.length > 0 && (
                  <section>
                    <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Sparkles size={12} /> {t("libHub.suggestedForChart")}
                    </p>
                    <div className="space-y-2">
                      {packs.map((pack) => (
                        <div key={pack.id} className="flex items-center justify-between p-3 rounded-xl border border-violet-100 bg-violet-50/50">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{pack.title}</p>
                            <p className="text-xs text-slate-500">{pack.itemCount} itens</p>
                          </div>
                          <button
                            type="button"
                            disabled={importing === pack.id}
                            onClick={() => importAndShare(pack.id)}
                            className="text-xs font-semibold text-violet-700 bg-white border border-violet-200 px-3 py-1.5 rounded-lg disabled:opacity-50"
                          >
                            {importing === pack.id ? <Loader2 size={12} className="animate-spin" /> : t("libHub.importPack")}
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {suggestions.length > 0 ? (
                  <section className="space-y-2">
                    {suggestions.map((r) => (
                      <div key={r.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-brand-200">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800 truncate">{r.title}</p>
                          {r.url && (
                            <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-500 inline-flex items-center gap-0.5">
                              <ExternalLink size={10} /> link
                            </a>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setShareResource(r)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-brand-500 px-3 py-1.5 rounded-lg shrink-0 ml-2"
                        >
                          <Share2 size={12} /> {t("libHub.sharePrimary")}
                        </button>
                      </div>
                    ))}
                  </section>
                ) : packs.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">{t("libHub.noSuggestions")}</p>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>

      {shareResource && (
        <ShareResourceModal
          apiBase={apiBase}
          resource={shareResource}
          recipientMode={recipientMode}
          preselectedChartId={chartId}
          preselectedName={patientName}
          onClose={() => { setShareResource(null); onClose(); }}
          onShared={() => {}}
        />
      )}
    </>
  );
}
