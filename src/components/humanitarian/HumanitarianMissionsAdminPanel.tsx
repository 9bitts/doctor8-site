"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Calendar, Loader2, Plus, Play, Users, CheckCircle2, XCircle, UserCheck,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

type SignupRow = {
  id: string;
  status: string;
  note: string | null;
  minutesCredited: number | null;
  angelName: string;
  userId: string;
  createdAt: string;
};

type MissionRow = {
  id: string;
  track: string;
  type: string;
  title: string;
  description: string;
  status: string;
  startsAt: string | null;
  capacity: number;
  confirmedCount: number;
  signups: SignupRow[];
};

const TRACKS = [
  "ESCUTA", "CAMPO", "ENTREGAS", "PROFISSIONAL", "INTERPRETE", "RETAGUARDA", "EDUCADOR", "EMBAIXADOR",
] as const;

export default function HumanitarianMissionsAdminPanel() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [missions, setMissions] = useState<MissionRow[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    track: "CAMPO" as string,
    type: "TURNO" as "TURNO" | "TAREFA",
    title: "",
    description: "",
    startsAt: "",
    endsAt: "",
    capacity: "5",
    isRemote: false,
    location: "",
    requiresVehicle: false,
    estimatedMinutes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/humanitarian/missions");
      const data = await res.json();
      if (res.ok) setMissions(data.missions || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createMission() {
    if (!form.title.trim() || !form.description.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/humanitarian/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          track: form.track,
          type: form.type,
          title: form.title,
          description: form.description,
          capacity: Number(form.capacity) || 1,
          isRemote: form.isRemote,
          location: form.location || undefined,
          requiresVehicle: form.requiresVehicle,
          startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
          estimatedMinutes: form.estimatedMinutes ? Number(form.estimatedMinutes) : undefined,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({
          track: "CAMPO",
          type: "TURNO",
          title: "",
          description: "",
          startsAt: "",
          endsAt: "",
          capacity: "5",
          isRemote: false,
          location: "",
          requiresVehicle: false,
          estimatedMinutes: "",
        });
        await load();
      }
    } catch {
      /* ignore */
    }
    setSaving(false);
  }

  async function patchMission(id: string, action: string) {
    setSaving(true);
    try {
      await fetch(`/api/admin/humanitarian/missions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await load();
    } catch {
      /* ignore */
    }
    setSaving(false);
  }

  async function patchSignup(signupId: string, status: string) {
    setSaving(true);
    try {
      await fetch("/api/admin/humanitarian/missions/signups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signupId, status }),
      });
      await load();
    } catch {
      /* ignore */
    }
    setSaving(false);
  }

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-rose-500" />
          <h2 className="text-base font-semibold text-slate-900">
            {t("angel.admin.missionsTitle")}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1 rounded-lg bg-rose-600 text-white px-3 py-1.5 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          {t("angel.admin.missionsNew")}
        </button>
      </div>

      {showForm && (
        <div className="border border-slate-100 rounded-xl p-4 space-y-3 bg-slate-50/50">
          <div className="grid sm:grid-cols-2 gap-3">
            <select
              value={form.track}
              onChange={(e) => setForm((f) => ({ ...f, track: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {TRACKS.map((tr) => (
                <option key={tr} value={tr}>{t(`angel.track.${tr}`)}</option>
              ))}
            </select>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "TURNO" | "TAREFA" }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="TURNO">{t("angel.missions.type.TURNO")}</option>
              <option value="TAREFA">{t("angel.missions.type.TAREFA")}</option>
            </select>
          </div>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder={t("angel.admin.missionsTitlePlaceholder")}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder={t("angel.admin.missionsDescPlaceholder")}
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="grid sm:grid-cols-3 gap-3">
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={1}
              value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
              placeholder={t("angel.admin.missionsCapacity")}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={createMission}
            className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {t("angel.admin.missionsSaveDraft")}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-rose-500 animate-spin" />
        </div>
      ) : missions.length === 0 ? (
        <p className="text-sm text-slate-400">{t("angel.admin.missionsEmpty")}</p>
      ) : (
        <ul className="space-y-3">
          {missions.map((m) => (
            <li key={m.id} className="border border-slate-100 rounded-xl overflow-hidden">
              <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-rose-600 font-semibold uppercase">
                    {t(`angel.track.${m.track}`)} · {m.status}
                  </p>
                  <p className="font-semibold text-slate-900">{m.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {m.confirmedCount}/{m.capacity} {t("angel.missions.confirmed")}
                    {m.signups.length > 0 && ` · ${m.signups.length} ${t("angel.admin.missionsSignups")}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {m.status === "DRAFT" && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => patchMission(m.id, "publish")}
                      className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg"
                    >
                      <Play size={12} />
                      {t("angel.admin.missionsPublish")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-lg"
                  >
                    <Users size={12} />
                    {t("angel.admin.missionsViewSignups")}
                  </button>
                </div>
              </div>
              {expanded === m.id && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-2">
                  {m.signups.length === 0 ? (
                    <p className="text-xs text-slate-400">{t("angel.admin.missionsNoSignups")}</p>
                  ) : (
                    m.signups.map((s) => (
                      <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="font-medium text-slate-800">{s.angelName}</span>
                        <span className="text-xs text-slate-500">{s.status}</span>
                        <div className="flex gap-1">
                          {s.status === "PENDING" && (
                            <>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => patchSignup(s.id, "CONFIRMED")}
                                className="p-1 text-emerald-600"
                                title={t("angel.admin.missionsConfirm")}
                              >
                                <CheckCircle2 size={16} />
                              </button>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => patchSignup(s.id, "DECLINED")}
                                className="p-1 text-red-500"
                                title={t("angel.admin.missionsDecline")}
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                          {s.status === "CONFIRMED" && (
                            <>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => patchSignup(s.id, "ATTENDED")}
                                className="p-1 text-emerald-600"
                                title={t("angel.admin.missionsAttended")}
                              >
                                <UserCheck size={16} />
                              </button>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => patchSignup(s.id, "NO_SHOW")}
                                className="p-1 text-amber-600"
                                title={t("angel.admin.missionsNoShow")}
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
