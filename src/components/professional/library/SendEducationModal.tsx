"use client";

import { useCallback, useEffect, useState } from "react";
import {
  X, BookOpen, Loader2, Share2, Package,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/toast";
import type { LibraryResourceDto } from "@/lib/professional-library/types";
import ShareResourceModal from "./ShareResourceModal";

interface SendEducationModalProps {
  apiBase?: string;
  chartId: string;
  patientName: string;
  recipientMode?: "patient" | "analysand" | "integrative_client";
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

  const shareBodyKey = recipientMode === "analysand"
    ? "analysandRecordId"
    : recipientMode === "integrative_client"
      ? "integrativeClientRecordId"
      : "patientRecordId";

  const shareEndpoint = (resourceId: string) => {
    if (recipientMode === "analysand") return `/api/psychoanalyst/resources/${resourceId}/share`;
    return `${apiBase}/resources/${resourceId}/share`;
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/library/suggestions?chartId=${encodeURIComponent(chartId)}&lang=${lang}`);
      const data = await res.json();
      if (res.ok) {
        setSuggestions(data.suggestions || []);
        setPacks(data.packs || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [apiBase, chartId, lang]);

  useEffect(() => { void load(); }, [load]);

  async function shareResourceToChart(resourceId: string) {
    const res = await fetch(shareEndpoint(resourceId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [shareBodyKey]: chartId }),
    });
    return res.ok;
  }

  async function importAndShare(packId: string) {
    setImporting(packId);
    try {
      const res = await fetch(`${apiBase}/library/import-pack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId, lang }),
      });
      if (res.status === 409) {
        toast.success(t("libHub.imported"));
        await load();
      } else if (res.ok) {
        const data = await res.json();
        const imported: LibraryResourceDto[] = data.resources || [];
        let shared = 0;
        for (const r of imported) {
          if (await shareResourceToChart(r.id)) shared++;
        }
        toast.success(
          shared > 0
            ? t("libHub.importAndShared").replace("{{count}}", String(shared))
            : t("libHub.importSuccess"),
        );
        await load();
      } else {
        toast.error(t("lib.errGeneric"));
      }
    } catch {
      toast.error(t("rec.networkError"));
    }
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
              <p className="text-xs font-semibold text-accent-500 mt-0.5">{patientName}</p>
              <p className="text-xs text-slate-400 mt-1">{t("libHub.sendEducationDesc")}</p>
            </div>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
            ) : (
              <>
                {suggestions.length > 0 && (
                  <section>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                      {t("libHub.tabMine")}
                    </h3>
                    {suggestions.map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-100 mb-2">
                        <p className="text-sm font-medium text-slate-800 truncate">{r.title}</p>
                        <button
                          type="button"
                          onClick={() => setShareResource(r)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 shrink-0"
                        >
                          <Share2 size={12} /> {t("libHub.sharePrimary")}
                        </button>
                      </div>
                    ))}
                  </section>
                )}

                {packs.length > 0 && (
                  <section>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                      {t("libHub.tabPacks")}
                    </h3>
                    {packs.map((pack) => (
                      <div key={pack.id} className="p-3 rounded-xl border border-violet-100 bg-violet-50/30 mb-2">
                        <p className="text-sm font-semibold text-slate-800">{pack.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{pack.description}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {pack.itemCount} {t("libHub.packItems")}
                        </p>
                        <button
                          type="button"
                          disabled={importing === pack.id}
                          onClick={() => importAndShare(pack.id)}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 px-3 py-1.5 rounded-lg"
                        >
                          {importing === pack.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Package size={12} />
                          )}
                          {t("libHub.importAndShare")}
                        </button>
                      </div>
                    ))}
                  </section>
                )}

                {suggestions.length === 0 && packs.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">{t("libHub.noLibraryMaterials")}</p>
                )}
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
          onClose={() => setShareResource(null)}
          onShared={() => {}}
        />
      )}
    </>
  );
}
