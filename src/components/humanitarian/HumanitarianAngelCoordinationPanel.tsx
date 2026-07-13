"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3, Loader2, Megaphone, AlertTriangle, UserX, MessageSquarePlus,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";

const TRACKS = [
  "ESCUTA", "CAMPO", "ENTREGAS", "PROFISSIONAL", "INTERPRETE", "RETAGUARDA", "EDUCADOR", "EMBAIXADOR",
] as const;

type Analytics = {
  campaignName: string;
  activeByTrack: Record<string, number>;
  activeAngelCount: number;
  missionStats: {
    openMissions: number;
    fillRate: number | null;
    attended: number;
    noShow: number;
    noShowRate: number | null;
  };
  avgFirstContactHours: number | null;
  inactiveAngels: {
    userId: string;
    profileId: string;
    name: string;
    lastLoginAt: string | null;
    burnoutRisk?: boolean;
  }[];
  burnoutAngels: {
    userId: string;
    profileId: string;
    name: string;
    stressfulCount: number;
  }[];
};

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  track: string | null;
  publishedAt: string | null;
  createdAt: string;
};

type SupervisionData = {
  supervisionNotes: { id: string; note: string; createdAt: string }[];
  wellbeingCheckins: { id: string; score: number; note: string | null; createdAt: string }[];
  burnout: { atRisk: boolean; stressfulCount: number; windowSize: number };
};

function tp(
  t: (key: string) => string,
  key: string,
  params?: Record<string, string | number>,
): string {
  let text = t(key);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
    }
  }
  return text;
}

export default function HumanitarianAngelCoordinationPanel() {
  const { lang, t } = useI18n();
  const locale = localeOf(lang);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [supervisionProfileId, setSupervisionProfileId] = useState<string | null>(null);
  const [supervision, setSupervision] = useState<SupervisionData | null>(null);
  const [supervisionLoading, setSupervisionLoading] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const [form, setForm] = useState({
    title: "",
    body: "",
    track: "" as string,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsRes, annRes] = await Promise.all([
        fetch("/api/admin/humanitarian/angels/analytics"),
        fetch("/api/admin/humanitarian/announcements"),
      ]);
      const analyticsData = await analyticsRes.json();
      const annData = await annRes.json();
      if (analyticsRes.ok) setAnalytics(analyticsData.analytics);
      if (annRes.ok) setAnnouncements(annData.announcements || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function openSupervision(profileId: string) {
    setSupervisionProfileId(profileId);
    setSupervisionLoading(true);
    setNoteText("");
    try {
      const res = await fetch(
        `/api/admin/humanitarian/angels/supervision?profileId=${encodeURIComponent(profileId)}`,
      );
      const data = await res.json();
      if (res.ok) setSupervision(data);
    } catch {
      /* ignore */
    }
    setSupervisionLoading(false);
  }

  async function saveSupervisionNote() {
    if (!supervisionProfileId || !noteText.trim()) return;
    setSavingNote(true);
    try {
      await fetch("/api/admin/humanitarian/angels/supervision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: supervisionProfileId, note: noteText }),
      });
      await openSupervision(supervisionProfileId);
      setNoteText("");
    } catch {
      /* ignore */
    }
    setSavingNote(false);
  }

  async function publishAnnouncement() {
    if (!form.title.trim() || !form.body.trim()) return;
    setPublishing(true);
    try {
      await fetch("/api/admin/humanitarian/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          body: form.body,
          track: form.track || null,
        }),
      });
      setForm({ title: "", body: "", track: "" });
      await load();
    } catch {
      /* ignore */
    }
    setPublishing(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
      </div>
    );
  }

  return (
    <div className="mt-8 border-t border-slate-200 pt-8 space-y-8">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-indigo-500" />
        <h2 className="text-lg font-bold text-slate-900">{t("admin.coordination.title")}</h2>
      </div>

      {analytics && (
        <>
          <p className="text-sm text-slate-600">{analytics.campaignName}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <p className="text-xs text-slate-500">{t("admin.coordination.activeAngels")}</p>
              <p className="text-2xl font-bold text-slate-900">{analytics.activeAngelCount}</p>
            </div>
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <p className="text-xs text-slate-500">{t("admin.coordination.missionFillRate")}</p>
              <p className="text-2xl font-bold text-slate-900">
                {analytics.missionStats.fillRate != null ? `${analytics.missionStats.fillRate}%` : "—"}
              </p>
            </div>
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <p className="text-xs text-slate-500">{t("admin.coordination.missionNoShow")}</p>
              <p className="text-2xl font-bold text-slate-900">
                {analytics.missionStats.noShowRate != null
                  ? `${analytics.missionStats.noShowRate}%`
                  : "—"}
              </p>
            </div>
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <p className="text-xs text-slate-500">{t("admin.coordination.avgFirstContact")}</p>
              <p className="text-2xl font-bold text-slate-900">
                {analytics.avgFirstContactHours != null
                  ? tp(t, "admin.coordination.hoursValue", { h: analytics.avgFirstContactHours })
                  : "—"}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-800 mb-2">
              {t("admin.coordination.activeByTrack")}
            </p>
            <div className="flex flex-wrap gap-2">
              {TRACKS.map((track) => (
                <span
                  key={track}
                  className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-100"
                >
                  {track}: {analytics.activeByTrack[track] ?? 0}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold text-slate-900">{t("admin.coordination.burnoutTitle")}</h3>
            </div>
            {analytics.burnoutAngels.length === 0 ? (
              <p className="text-sm text-slate-500">{t("admin.coordination.burnoutEmpty")}</p>
            ) : (
              <div className="space-y-2">
                {analytics.burnoutAngels.map((a) => (
                  <div
                    key={a.userId}
                    className="flex flex-wrap items-center justify-between gap-2 border border-amber-200 rounded-xl p-3 bg-amber-50/60 text-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{a.name}</p>
                      <p className="text-xs text-amber-800">
                        {tp(t, "admin.coordination.stressfulFollowUps", { n: a.stressfulCount })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openSupervision(a.profileId)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700"
                    >
                      {t("admin.coordination.supervisionOpen")}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <UserX className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-slate-900">{t("admin.coordination.inactiveTitle")}</h3>
            </div>
            {analytics.inactiveAngels.length === 0 ? (
              <p className="text-sm text-slate-500">{t("admin.coordination.inactiveEmpty")}</p>
            ) : (
              <div className="space-y-2">
                {analytics.inactiveAngels.map((a) => (
                  <div
                    key={a.userId}
                    className="flex flex-wrap items-center justify-between gap-2 border border-slate-200 rounded-xl p-3 bg-white text-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {a.name}
                        {a.burnoutRisk && (
                          <span className="ml-2 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                            {t("admin.coordination.burnoutBadge")}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        {a.lastLoginAt
                          ? new Date(a.lastLoginAt).toLocaleDateString(locale)
                          : t("admin.coordination.noLogin")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openSupervision(a.profileId)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700"
                    >
                      {t("admin.coordination.supervisionOpen")}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Megaphone className="w-5 h-5 text-rose-500" />
          <h3 className="font-semibold text-slate-900">{t("admin.coordination.announcementsTitle")}</h3>
        </div>
        <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder={t("admin.coordination.announcementTitle")}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            placeholder={t("admin.coordination.announcementBody")}
            rows={4}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={form.track}
            onChange={(e) => setForm((f) => ({ ...f, track: e.target.value }))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">{t("admin.coordination.announcementAllTracks")}</option>
            {TRACKS.map((tr) => (
              <option key={tr} value={tr}>
                {tr}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={publishing}
            onClick={publishAnnouncement}
            className="text-sm font-semibold px-4 py-2 rounded-lg bg-rose-600 text-white disabled:opacity-50"
          >
            {publishing ? (
              <Loader2 className="w-4 h-4 animate-spin inline" />
            ) : (
              t("admin.coordination.announcementPublish")
            )}
          </button>
        </div>
        {announcements.length > 0 && (
          <div className="mt-4 space-y-2">
            {announcements.slice(0, 5).map((a) => (
              <div key={a.id} className="border border-slate-100 rounded-lg p-3 text-sm bg-slate-50">
                <p className="font-medium text-slate-900">{a.title}</p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{a.body}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {new Date(a.createdAt).toLocaleString(locale)}
                  {a.track ? ` · ${a.track}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {supervisionProfileId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <MessageSquarePlus className="w-5 h-5" />
                {t("admin.coordination.supervisionTitle")}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setSupervisionProfileId(null);
                  setSupervision(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                {t("admin.coordination.close")}
              </button>
            </div>
            {supervisionLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" />
            ) : supervision ? (
              <>
                {supervision.burnout.atRisk && (
                  <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    {tp(t, "admin.coordination.burnoutDetail", {
                      n: supervision.burnout.stressfulCount,
                      w: supervision.burnout.windowSize,
                    })}
                  </p>
                )}
                {supervision.wellbeingCheckins.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-1">
                      {t("admin.coordination.wellbeingHistory")}
                    </p>
                    {supervision.wellbeingCheckins.slice(0, 3).map((c) => (
                      <p key={c.id} className="text-xs text-slate-600">
                        {new Date(c.createdAt).toLocaleDateString(locale)} — {c.score}/5
                        {c.note ? `: ${c.note}` : ""}
                      </p>
                    ))}
                  </div>
                )}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-600">
                    {t("admin.coordination.supervisionNotes")}
                  </p>
                  {supervision.supervisionNotes.length === 0 ? (
                    <p className="text-xs text-slate-500">{t("admin.coordination.supervisionEmpty")}</p>
                  ) : (
                    supervision.supervisionNotes.map((n) => (
                      <div key={n.id} className="text-xs bg-slate-50 rounded-lg p-2 border border-slate-100">
                        <p className="text-slate-700">{n.note}</p>
                        <p className="text-slate-400 mt-1">
                          {new Date(n.createdAt).toLocaleString(locale)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder={t("admin.coordination.supervisionPlaceholder")}
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={savingNote || !noteText.trim()}
                  onClick={saveSupervisionNote}
                  className="w-full text-sm font-semibold py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50"
                >
                  {savingNote ? (
                    <Loader2 className="w-4 h-4 animate-spin inline" />
                  ) : (
                    t("admin.coordination.supervisionSave")
                  )}
                </button>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
