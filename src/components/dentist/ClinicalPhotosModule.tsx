"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Upload } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { DentistChart } from "./DentistChartWorkspace";

type Photo = {
  id: string;
  storageKey: string;
  category: string;
  caption: string | null;
  takenAt: string;
  imageUrl?: string | null;
};

export default function ClinicalPhotosModule({ chart }: { chart: DentistChart }) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [category, setCategory] = useState("INTRAORAL");
  const [caption, setCaption] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState("");

  function load() {
    fetch(`/api/dentist/charts/${chart.id}/photos`)
      .then((r) => r.json())
      .then((data) => setPhotos(data.photos || []))
      .catch(() => {});
  }

  useEffect(() => { load(); }, [chart.id]);

  const beforeAfterPairs = useMemo(() => {
    const before = photos.filter((p) => p.category === "BEFORE");
    const after = photos.filter((p) => p.category === "AFTER");
    const pairs: { before: Photo; after: Photo }[] = [];
    const usedAfter = new Set<string>();
    for (const b of before) {
      const match = after.find((a) => !usedAfter.has(a.id));
      if (match) {
        usedAfter.add(match.id);
        pairs.push({ before: b, after: match });
      }
    }
    return pairs;
  }, [photos]);

  async function uploadAndSave(file: File) {
    setUploadError("");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", `records/${chart.id}`);
      const up = await fetch("/api/uploads", { method: "POST", body: fd });
      const upData = await up.json();
      if (!up.ok || !upData.key) {
        setUploadError(upData.error || t("dental.photo.uploadFailed"));
        return;
      }

      const res = await fetch(`/api/dentist/charts/${chart.id}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storageKey: upData.key, category, caption }),
      });
      if (res.ok) {
        setCaption("");
        if (fileRef.current) fileRef.current.value = "";
        load();
      } else {
        setUploadError(t("dental.photo.uploadFailed"));
      }
    } finally {
      setSaving(false);
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await uploadAndSave(file);
  }

  function renderPhotoCard(photo: Photo) {
    return (
      <div key={photo.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {photo.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.imageUrl}
            alt={photo.caption || photo.category}
            className="w-full h-40 object-cover bg-slate-100"
          />
        ) : (
          <div className="h-40 bg-slate-100 flex items-center justify-center text-xs text-slate-400 px-3 text-center">
            {photo.storageKey}
          </div>
        )}
        <div className="p-3">
          <p className="text-xs font-medium text-sky-700">
            {t(`dental.photo.category.${photo.category.toLowerCase()}`)}
          </p>
          {photo.caption && <p className="text-xs text-slate-500 mt-1">{photo.caption}</p>}
          <p className="text-xs text-slate-400 mt-2">
            {new Date(photo.takenAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {beforeAfterPairs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">{t("dental.photo.beforeAfter")}</h3>
          <div className="grid gap-4 lg:grid-cols-2">
            {beforeAfterPairs.map(({ before, after }) => (
              <div key={`${before.id}-${after.id}`} className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 p-2 bg-slate-50">
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1 px-1">
                    {t("dental.photo.category.before")}
                  </p>
                  {before.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={before.imageUrl} alt="" className="w-full h-32 object-cover rounded-lg" />
                  ) : (
                    <div className="h-32 bg-white rounded-lg border border-slate-200" />
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1 px-1">
                    {t("dental.photo.category.after")}
                  </p>
                  {after.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={after.imageUrl} alt="" className="w-full h-32 object-cover rounded-lg" />
                  ) : (
                    <div className="h-32 bg-white rounded-lg border border-slate-200" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map(renderPhotoCard)}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
        <h3 className="font-semibold text-slate-900">{t("dental.photo.add")}</h3>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          onChange={onFileChange}
          className="hidden"
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
          onClick={() => fileRef.current?.click()}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {t("dental.photo.upload")}
        </button>
        {uploadError && <p className="text-xs text-rose-600">{uploadError}</p>}
      </div>
    </div>
  );
}
