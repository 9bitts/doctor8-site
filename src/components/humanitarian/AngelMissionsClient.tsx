"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar, Loader2, MapPin, Car, Languages, Heart, CheckCircle2, Clock, XCircle,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";

type OpenMission = {
  id: string;
  track: string;
  type: string;
  title: string;
  description: string;
  isRemote: boolean;
  location: string | null;
  startsAt: string | null;
  endsAt: string | null;
  capacity: number;
  requiresVehicle: boolean;
  requiredLanguages: string[];
  estimatedMinutes: number | null;
  status: string;
  confirmedCount: number;
  matchScore: number;
  mySignup: { id: string; status: string } | null;
};

type MySignup = {
  id: string;
  status: string;
  note: string | null;
  minutesCredited: number | null;
  createdAt: string;
  mission: {
    id: string;
    title: string;
    track: string;
    type: string;
    status: string;
    startsAt: string | null;
    endsAt: string | null;
    location: string | null;
    isRemote: boolean;
    estimatedMinutes: number | null;
  };
};

function formatWhen(iso: string | null, locale: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(locale, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function AngelMissionsClient() {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);
  const [tab, setTab] = useState<"open" | "mine">("open");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<OpenMission[]>([]);
  const [mine, setMine] = useState<MySignup[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [openRes, mineRes] = await Promise.all([
        fetch("/api/humanitarian/angel/missions"),
        fetch("/api/humanitarian/angel/missions/mine"),
      ]);
      const openData = await openRes.json();
      const mineData = await mineRes.json();
      if (openRes.ok) setOpen(openData.missions || []);
      if (mineRes.ok) setMine(mineData.signups || []);
      if (!openRes.ok && !mineRes.ok) setError(t("angel.missions.loadError"));
    } catch {
      setError(t("angel.missions.loadError"));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function signup(missionId: string) {
    setActingId(missionId);
    setError(null);
    try {
      const res = await fetch(`/api/humanitarian/angel/missions/${missionId}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(t(`angel.missions.error.${data.errorCode}`) || data.errorCode);
        return;
      }
      await load();
    } catch {
      setError(t("angel.missions.signupError"));
    }
    setActingId(null);
  }

  async function cancelSignup(missionId: string) {
    setActingId(missionId);
    setError(null);
    try {
      const res = await fetch(`/api/humanitarian/angel/missions/${missionId}/signup`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError(t("angel.missions.cancelError"));
        return;
      }
      await load();
    } catch {
      setError(t("angel.missions.cancelError"));
    }
    setActingId(null);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
          <Calendar className="w-6 h-6 text-rose-500" />
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider text-rose-600 font-semibold">
            {t("angel.missions.eyebrow")}
          </p>
          <h1 className="text-xl font-bold text-slate-900">{t("angel.missions.title")}</h1>
          <p className="text-slate-500 text-sm">{t("angel.missions.subtitle")}</p>
        </div>
        <Link
          href="/admin/angel"
          className="text-xs font-medium text-rose-600 hover:text-rose-800"
        >
          {t("angel.missions.backFollowUp")}
        </Link>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("open")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            tab === "open"
              ? "bg-rose-600 text-white"
              : "bg-white border border-slate-200 text-slate-600"
          }`}
        >
          {t("angel.missions.tabOpen")}
        </button>
        <button
          type="button"
          onClick={() => setTab("mine")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            tab === "mine"
              ? "bg-rose-600 text-white"
              : "bg-white border border-slate-200 text-slate-600"
          }`}
        >
          {t("angel.missions.tabMine")}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
        </div>
      ) : tab === "open" ? (
        open.length === 0 ? (
          <p className="text-center text-slate-400 py-12 bg-white border border-slate-200 rounded-2xl text-sm">
            {t("angel.missions.emptyOpen")}
          </p>
        ) : (
          <div className="space-y-4">
            {open.map((m) => (
              <article
                key={m.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide">
                      {t(`angel.track.${m.track}`)} · {t(`angel.missions.type.${m.type}`)}
                    </p>
                    <h2 className="text-lg font-semibold text-slate-900">{m.title}</h2>
                  </div>
                  {m.matchScore >= 10 && (
                    <span className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-full shrink-0">
                      {t("angel.missions.matchBadge")}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{m.description}</p>
                <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                  {m.startsAt && (
                    <span className="inline-flex items-center gap-1">
                      <Clock size={14} />
                      {formatWhen(m.startsAt, locale)}
                    </span>
                  )}
                  {m.location && !m.isRemote && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={14} />
                      {m.location}
                    </span>
                  )}
                  {m.isRemote && <span>{t("angel.missions.remote")}</span>}
                  {m.requiresVehicle && (
                    <span className="inline-flex items-center gap-1">
                      <Car size={14} />
                      {t("angel.missions.vehicleRequired")}
                    </span>
                  )}
                  {m.requiredLanguages.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Languages size={14} />
                      {m.requiredLanguages.join(", ")}
                    </span>
                  )}
                  <span>
                    {m.confirmedCount}/{m.capacity} {t("angel.missions.confirmed")}
                  </span>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  {m.mySignup && ["PENDING", "CONFIRMED"].includes(m.mySignup.status) ? (
                    <button
                      type="button"
                      disabled={actingId === m.id}
                      onClick={() => cancelSignup(m.id)}
                      className="text-sm font-medium text-slate-600 hover:text-red-600 disabled:opacity-50"
                    >
                      {t("angel.missions.cancelSignup")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={actingId === m.id || m.status === "FULL"}
                      onClick={() => signup(m.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
                    >
                      {actingId === m.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Heart size={14} />
                      )}
                      {m.status === "FULL" ? t("angel.missions.waitlist") : t("angel.missions.signup")}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )
      ) : mine.length === 0 ? (
        <p className="text-center text-slate-400 py-12 bg-white border border-slate-200 rounded-2xl text-sm">
          {t("angel.missions.emptyMine")}
        </p>
      ) : (
        <div className="space-y-3">
          {mine.map((s) => (
            <div
              key={s.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4"
            >
              <div className="shrink-0">
                {s.status === "CONFIRMED" || s.status === "ATTENDED" || s.status === "COMPLETED" ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                ) : s.status === "PENDING" ? (
                  <Clock className="w-8 h-8 text-amber-500" />
                ) : (
                  <XCircle className="w-8 h-8 text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate">{s.mission.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t(`angel.missions.signupStatus.${s.status}`)}
                  {s.mission.startsAt ? ` · ${formatWhen(s.mission.startsAt, locale)}` : ""}
                </p>
                {s.minutesCredited != null && (
                  <p className="text-xs text-emerald-700 mt-1">
                    {t("angel.missions.minutesCredited").replace("{{minutes}}", String(s.minutesCredited))}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
