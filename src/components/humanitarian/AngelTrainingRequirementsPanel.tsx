"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Loader2, Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

type Requirement = {
  id: string;
  track: string;
  courseId: string;
  required: boolean;
};

type CourseOption = {
  id: string;
  title: string;
  slug: string;
};

const TRACKS = [
  "ESCUTA",
  "CAMPO",
  "ENTREGAS",
  "PROFISSIONAL",
  "INTERPRETE",
  "RETAGUARDA",
  "EDUCADOR",
  "EMBAIXADOR",
] as const;

export default function AngelTrainingRequirementsPanel() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [track, setTrack] = useState<string>("ESCUTA");
  const [courseId, setCourseId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/humanitarian/angel-training");
      const data = await res.json();
      if (res.ok) {
        setRequirements(data.requirements || []);
        setCourses(data.courses || []);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addRequirement() {
    if (!courseId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/humanitarian/angel-training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track, courseId, required: true }),
      });
      if (res.ok) await load();
    } catch {
      /* ignore */
    }
    setSaving(false);
  }

  async function removeRequirement(row: Requirement) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/humanitarian/angel-training", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track: row.track, courseId: row.courseId }),
      });
      if (res.ok) await load();
    } catch {
      /* ignore */
    }
    setSaving(false);
  }

  const courseTitle = (id: string) => courses.find((c) => c.id === id)?.title || id;

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-rose-500" />
        <h2 className="text-base font-semibold text-slate-900">
          {t("angel.admin.trainingTitle")}
        </h2>
      </div>
      <p className="text-sm text-slate-500">{t("angel.admin.trainingDesc")}</p>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-6 h-6 text-rose-500 animate-spin" />
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={track}
              onChange={(e) => setTrack(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {TRACKS.map((tr) => (
                <option key={tr} value={tr}>
                  {t(`angel.track.${tr}`)}
                </option>
              ))}
            </select>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">{t("angel.admin.trainingSelectCourse")}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addRequirement}
              disabled={saving || !courseId}
              className="inline-flex items-center justify-center gap-1 rounded-lg bg-rose-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {t("angel.admin.trainingAdd")}
            </button>
          </div>

          {requirements.length === 0 ? (
            <p className="text-sm text-slate-400">{t("angel.admin.trainingEmpty")}</p>
          ) : (
            <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl">
              {requirements.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span>
                    <span className="font-medium text-slate-800">{t(`angel.track.${row.track}`)}</span>
                    <span className="text-slate-400 mx-2">→</span>
                    <span className="text-slate-600">{courseTitle(row.courseId)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRequirement(row)}
                    disabled={saving}
                    className="text-red-500 hover:text-red-700"
                    aria-label={t("angel.admin.trainingRemove")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
