"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Loader2, Columns2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

export type PatientChartImage = {
  id: string;
  docId: string;
  docTitle: string;
  docDate: string;
  index: number;
  url: string;
  name: string;
};

type Props = {
  chartId: string;
  open: boolean;
  onClose: () => void;
};

export default function ImageCompareModal({ chartId, open, onClose }: Props) {
  const { t } = useI18n();
  const [images, setImages] = useState<PatientChartImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError(false);
    setLeftId("");
    setRightId("");
    (async () => {
      try {
        const res = await fetch(`/api/professional/records/${chartId}/images`);
        const data = await res.json();
        if (!active) return;
        if (!res.ok) {
          setError(true);
          return;
        }
        const list: PatientChartImage[] = data.images || [];
        setImages(list);
        if (list.length >= 2) {
          setLeftId(list[1].id);
          setRightId(list[0].id);
        } else if (list.length === 1) {
          setLeftId(list[0].id);
        }
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [open, chartId]);

  const left = useMemo(() => images.find((i) => i.id === leftId), [images, leftId]);
  const right = useMemo(() => images.find((i) => i.id === rightId), [images, rightId]);

  if (!open) return null;

  function formatDocDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function imageLabel(img: PatientChartImage) {
    return `${img.docTitle} ? ${formatDocDate(img.docDate)}`;
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 inline-flex items-center gap-2">
            <Columns2 size={18} className="text-brand-500" />
            {t("compare.title")}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {loading && (
            <p className="text-sm text-slate-500 inline-flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" /> {t("compare.loading")}
            </p>
          )}
          {error && !loading && (
            <p className="text-sm text-rose-600">{t("compare.error")}</p>
          )}
          {!loading && !error && images.length < 2 && (
            <p className="text-sm text-slate-500">{t("compare.needTwo")}</p>
          )}

          {!loading && !error && images.length >= 2 && (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t("compare.left")}
                  </label>
                  <select
                    value={leftId}
                    onChange={(e) => setLeftId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    {images.map((img) => (
                      <option key={img.id} value={img.id} disabled={img.id === rightId}>
                        {imageLabel(img)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t("compare.right")}
                  </label>
                  <select
                    value={rightId}
                    onChange={(e) => setRightId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    {images.map((img) => (
                      <option key={img.id} value={img.id} disabled={img.id === leftId}>
                        {imageLabel(img)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {[left, right].map((img, side) => (
                  <div
                    key={side}
                    className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden"
                  >
                    {img ? (
                      <>
                        <div className="px-3 py-2 border-b border-slate-200 bg-white">
                          <p className="text-xs font-medium text-slate-700 truncate">{img.docTitle}</p>
                          <p className="text-[10px] text-slate-400">{formatDocDate(img.docDate)}</p>
                        </div>
                        <div className="p-2 flex items-center justify-center min-h-[240px] max-h-[50vh]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.url}
                            alt={img.name}
                            className="max-w-full max-h-[48vh] object-contain rounded-lg"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="min-h-[240px] flex items-center justify-center text-xs text-slate-400">
                        {t("compare.select")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
