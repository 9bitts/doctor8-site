"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { DentistChart } from "./DentistChartWorkspace";

type Photo = {
  id: string;
  storageKey: string;
  category: string;
  caption: string | null;
  takenAt: string;
};

export default function ClinicalPhotosModule({ chart }: { chart: DentistChart }) {
  const { t } = useI18n();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [storageKey, setStorageKey] = useState("");
  const [category, setCategory] = useState("INTRAORAL");
  const [caption, setCaption] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    fetch(`/api/dentist/charts/${chart.id}/photos`)
      .then((r) => r.json())
      .then((data) => setPhotos(data.photos || []))
      .catch(() => {});
  }

  useEffect(() => { load(); }, [chart.id]);

  async function add() {
    if (!storageKey.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/dentist/charts/${chart.id}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storageKey, category, caption }),
      });
      if (res.ok) {
        setStorageKey("");
        setCaption("");
        load();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {photos.map((photo) => (
          <div key={photo.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-sky-700">
              {t(`dental.photo.category.${photo.category.toLowerCase()}`)}
            </p>
            <p className="text-sm text-slate-600 mt-1 truncate">{photo.storageKey}</p>
            {photo.caption && <p className="text-xs text-slate-500 mt-1">{photo.caption}</p>}
            <p className="text-xs text-slate-400 mt-2">
              {new Date(photo.takenAt).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
        <h3 className="font-semibold text-slate-900">{t("dental.photo.add")}</h3>
        <input
          value={storageKey}
          onChange={(e) => setStorageKey(e.target.value)}
          placeholder={t("dental.photo.storageKey")}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          {["INTRAORAL", "EXTRAORAL", "RADIOGRAPH", "BEFORE", "AFTER"].map((c) => (
            <option key={c} value={c}>{t(`dental.photo.category.${c.toLowerCase()}`)}</option>
          ))}
        </select>
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder={t("dental.photo.caption")}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={add}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {t("dental.photo.save")}
        </button>
      </div>
    </div>
  );
}
