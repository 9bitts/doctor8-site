"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

const TRACKS = [
  "ESCUTA", "CAMPO", "ENTREGAS", "PROFISSIONAL", "INTERPRETE", "RETAGUARDA", "EDUCADOR", "EMBAIXADOR",
] as const;

type Profile = {
  languages: string[];
  skills: string[];
  city: string | null;
  hasVehicle: boolean;
  availabilityNote: string | null;
  availabilityStatus: string;
  pausedUntil: string | null;
  weeklyCapacity: number | null;
  trackEnrollments: { track: string; status: string }[];
  isPaused: boolean;
};

export default function AngelProfileClient() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [languages, setLanguages] = useState("");
  const [skills, setSkills] = useState("");
  const [city, setCity] = useState("");
  const [hasVehicle, setHasVehicle] = useState(false);
  const [availabilityNote, setAvailabilityNote] = useState("");
  const [availabilityStatus, setAvailabilityStatus] = useState("AVAILABLE");
  const [weeklyCapacity, setWeeklyCapacity] = useState("");
  const [requestTrack, setRequestTrack] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/humanitarian/angel/profile");
      const data = await res.json();
      if (res.ok && data.profile) {
        setProfile(data.profile);
        setLanguages((data.profile.languages || []).join(", "));
        setSkills((data.profile.skills || []).join(", "));
        setCity(data.profile.city || "");
        setHasVehicle(data.profile.hasVehicle);
        setAvailabilityNote(data.profile.availabilityNote || "");
        setAvailabilityStatus(data.profile.availabilityStatus);
        setWeeklyCapacity(
          data.profile.weeklyCapacity != null ? String(data.profile.weeklyCapacity) : "",
        );
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        languages: languages.split(",").map((s) => s.trim()).filter(Boolean),
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        city: city.trim() || null,
        hasVehicle,
        availabilityNote: availabilityNote.trim() || null,
        availabilityStatus,
        weeklyCapacity: weeklyCapacity.trim() ? Number(weeklyCapacity) : null,
      };
      if (requestTrack) {
        body.requestTracks = [requestTrack];
        setRequestTrack("");
      }
      const res = await fetch("/api/humanitarian/angel/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) await load();
    } catch {
      /* ignore */
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return <p className="text-center text-slate-500 py-12">{t("angel.profile.loadError")}</p>;
  }

  const enrolled = new Set(profile.trackEnrollments.map((e) => e.track));

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <div>
        <p className="text-xs uppercase tracking-wider text-rose-600 font-semibold">
          {t("angel.profile.eyebrow")}
        </p>
        <h1 className="text-xl font-bold text-slate-900">{t("angel.profile.title")}</h1>
        <p className="text-sm text-slate-500 mt-1">{t("angel.profile.subtitle")}</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <label className="block text-sm">
          <span className="text-slate-700 font-medium">{t("angel.profile.languages")}</span>
          <input
            value={languages}
            onChange={(e) => setLanguages(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="pt, es, en"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-700 font-medium">{t("angel.profile.skills")}</span>
          <input
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-700 font-medium">{t("angel.profile.city")}</span>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hasVehicle} onChange={(e) => setHasVehicle(e.target.checked)} />
          {t("angel.profile.hasVehicle")}
        </label>
        <label className="block text-sm">
          <span className="text-slate-700 font-medium">{t("angel.profile.availability")}</span>
          <select
            value={availabilityStatus}
            onChange={(e) => setAvailabilityStatus(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="AVAILABLE">{t("angel.profile.availability.AVAILABLE")}</option>
            <option value="LIMITED">{t("angel.profile.availability.LIMITED")}</option>
            <option value="PAUSED">{t("angel.profile.availability.PAUSED")}</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-slate-700 font-medium">{t("angel.profile.availabilityNote")}</span>
          <textarea
            value={availabilityNote}
            onChange={(e) => setAvailabilityNote(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-700 font-medium">{t("angel.profile.weeklyCapacity")}</span>
          <input
            type="number"
            min={1}
            max={10}
            value={weeklyCapacity}
            onChange={(e) => setWeeklyCapacity(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>

        <div className="border-t border-slate-100 pt-4">
          <p className="text-sm font-medium text-slate-700 mb-2">{t("angel.profile.requestTrack")}</p>
          <div className="flex gap-2">
            <select
              value={requestTrack}
              onChange={(e) => setRequestTrack(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">{t("angel.profile.selectTrack")}</option>
              {TRACKS.filter((tr) => !enrolled.has(tr)).map((tr) => (
                <option key={tr} value={tr}>{t(`angel.track.${tr}`)}</option>
              ))}
            </select>
          </div>
          <ul className="mt-3 space-y-1 text-xs text-slate-500">
            {profile.trackEnrollments.map((e) => (
              <li key={e.track}>
                {t(`angel.track.${e.track}`)} — {e.status}
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 text-white py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t("angel.profile.save")}
        </button>
      </div>
    </div>
  );
}
