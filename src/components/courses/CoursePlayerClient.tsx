"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, Loader2 } from "lucide-react";

type Lesson = {
  id: string;
  title: string;
  description: string | null;
  durationSecs: number | null;
  streamUrl: string | null;
  progress: { watchedSecs: number; completed: boolean } | null;
};

type Module = { id: string; title: string; lessons: Lesson[] };

export default function CoursePlayerClient({ enrollmentId }: { enrollmentId: string }) {
  const [courseTitle, setCourseTitle] = useState("");
  const [modules, setModules] = useState<Module[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [progressPercent, setProgressPercent] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/courses/enrollments/${enrollmentId}`);
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    setCourseTitle(data.enrollment.course.title);
    setModules(data.enrollment.modules);
    setProgressPercent(data.enrollment.progressPercent);
    const first = data.enrollment.modules[0]?.lessons[0]?.id ?? null;
    setActiveLessonId(first);
    setLoading(false);
  }, [enrollmentId]);

  useEffect(() => {
    load();
  }, [load]);

  const activeLesson = modules.flatMap((m) => m.lessons).find((l) => l.id === activeLessonId);

  async function markComplete(lessonId: string) {
    const res = await fetch(`/api/courses/enrollments/${enrollmentId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId, completed: true }),
    });
    const data = await res.json();
    if (data.progressPercent != null) setProgressPercent(data.progressPercent);
    setModules((prev) =>
      prev.map((m) => ({
        ...m,
        lessons: m.lessons.map((l) =>
          l.id === lessonId
            ? { ...l, progress: { watchedSecs: l.durationSecs ?? 0, completed: true } }
            : l,
        ),
      })),
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-brand-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href="/professional/courses/learn"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <ChevronLeft size={16} />
        Meus cursos
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">{courseTitle}</h1>
        <span className="text-sm text-slate-500">{progressPercent}%</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {activeLesson?.streamUrl ? (
            activeLesson.streamUrl.includes("youtube.com") ||
            activeLesson.streamUrl.includes("youtu.be") ? (
              <div className="aspect-video rounded-xl overflow-hidden bg-black">
                <iframe
                  src={activeLesson.streamUrl.replace("watch?v=", "embed/")}
                  className="w-full h-full"
                  allowFullScreen
                  title={activeLesson.title}
                />
              </div>
            ) : (
              <video
                ref={videoRef}
                key={activeLesson.id}
                src={activeLesson.streamUrl}
                controls
                className="w-full rounded-xl bg-black aspect-video"
                onEnded={() => markComplete(activeLesson.id)}
              />
            )
          ) : (
            <div className="aspect-video rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
              Selecione uma aula
            </div>
          )}

          {activeLesson && (
            <div>
              <h2 className="font-semibold text-slate-900">{activeLesson.title}</h2>
              {activeLesson.description && (
                <p className="text-slate-600 text-sm mt-1">{activeLesson.description}</p>
              )}
              {!activeLesson.progress?.completed && (
                <button
                  type="button"
                  onClick={() => markComplete(activeLesson.id)}
                  className="mt-3 inline-flex items-center gap-2 text-sm text-brand-600 hover:underline"
                >
                  <CheckCircle2 size={16} />
                  Marcar como concluída
                </button>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden max-h-[70vh] overflow-y-auto">
          {modules.map((m) => (
            <div key={m.id}>
              <div className="px-3 py-2 bg-slate-50 text-sm font-medium text-slate-700 sticky top-0">
                {m.title}
              </div>
              {m.lessons.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setActiveLessonId(l.id)}
                  className={`w-full text-left px-3 py-2.5 text-sm border-b border-slate-50 flex items-center gap-2 ${
                    l.id === activeLessonId ? "bg-brand-50 text-brand-800" : "hover:bg-slate-50"
                  }`}
                >
                  {l.progress?.completed ? (
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                  )}
                  <span className="line-clamp-2">{l.title}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
