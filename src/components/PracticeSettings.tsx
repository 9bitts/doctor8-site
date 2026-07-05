"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { MapPin, Plus, Trash2, Loader2, Check } from "lucide-react";
import type { PracticeLocationDto } from "@/lib/practice";

const emptyLocation = (): Omit<PracticeLocationDto, "id"> => ({
  name: "",
  address: "",
  city: "",
  state: null,
  country: null,
  zip: null,
  latitude: null,
  longitude: null,
  isPrimary: false,
  sortOrder: 0,
});

export default function PracticeSettings({ apiPath }: { apiPath: string }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [locations, setLocations] = useState<Omit<PracticeLocationDto, "id">[]>([]);

  useEffect(() => {
    fetch(apiPath)
      .then((r) => r.json())
      .then((d) => {
        setLocations(d.locations?.length ? d.locations : [emptyLocation()]);
      })
      .finally(() => setLoading(false));
  }, [apiPath]);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch(apiPath, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locations }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      /* ignore */
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center gap-2 text-slate-400 text-sm">
        <Loader2 size={16} className="animate-spin" /> {t("pub.loading")}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <MapPin size={18} className="text-brand-500" />
          {t("pubPhase3.locationsTitle")}
        </h2>
        <p className="text-sm text-slate-500 mt-1">{t("pubPhase3.locationsSubtitle")}</p>
      </div>

      {saved && (
        <p className="text-sm text-brand-600 flex items-center gap-1">
          <Check size={14} /> {t("pubPhase3.saved")}
        </p>
      )}

      <div className="space-y-4">
        {locations.map((loc, i) => (
          <div key={i} className="border border-slate-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                {t("pubPhase3.locationN").replace("{n}", String(i + 1))}
              </span>
              {locations.length > 1 && (
                <button
                  type="button"
                  onClick={() => setLocations(locations.filter((_, j) => j !== i))}
                  className="text-rose-500 p-1"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <input
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
              placeholder={t("pubPhase3.locName")}
              value={loc.name}
              onChange={(e) => {
                const next = [...locations];
                next[i] = { ...next[i], name: e.target.value };
                setLocations(next);
              }}
            />
            <input
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
              placeholder={t("pubPhase3.locAddress")}
              value={loc.address}
              onChange={(e) => {
                const next = [...locations];
                next[i] = { ...next[i], address: e.target.value };
                setLocations(next);
              }}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
                placeholder={t("set.city")}
                value={loc.city}
                onChange={(e) => {
                  const next = [...locations];
                  next[i] = { ...next[i], city: e.target.value };
                  setLocations(next);
                }}
              />
              <input
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
                placeholder={t("set.state")}
                value={loc.state || ""}
                onChange={(e) => {
                  const next = [...locations];
                  next[i] = { ...next[i], state: e.target.value || null };
                  setLocations(next);
                }}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={loc.isPrimary}
                onChange={(e) => {
                  const next = locations.map((l, j) => ({
                    ...l,
                    isPrimary: j === i ? e.target.checked : false,
                  }));
                  setLocations(next);
                }}
                className="accent-brand-500"
              />
              {t("pubPhase3.locPrimary")}
            </label>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setLocations([...locations, emptyLocation()])}
          className="text-sm text-brand-600 font-medium flex items-center gap-1"
        >
          <Plus size={14} /> {t("pubPhase3.addLocation")}
        </button>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"
      >
        {saving && <Loader2 size={14} className="animate-spin" />}
        {t("pubPhase3.save")}
      </button>
    </div>
  );
}
