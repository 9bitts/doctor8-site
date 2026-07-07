"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Award, CheckCircle2, ChevronLeft, ExternalLink, Loader2 } from "lucide-react";

type Lesson = {
  id: string;
  title: string;
  description: string | null;
  durationSecs: number | null;
  streamUrl: string | null;
  progress: { watchedSecs: number; completed: boolean } | null;
};

type Module = { id: string; title: string; lessons: Lesson[] };

type CertificateInfo = {
  verifyCode: string;
  verifyUrl: string;
  courseTitle: string;
  workloadHours: number | null;
};

export default function CoursePlayerClient({ enrollmentId }: { enrollmentId: string }) {
  const [courseTitle, setCourseTitle] = useState("");
  const [modules, setModules] = useState<Module[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [progressPercent, setProgressPercent] = useState(0);
  const [certificate, setCertificate] = useState<CertificateInfo | null>(null);
  const [certLoading, setCertLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const loadCertificate = useCallback(async () => {
    setCertLoading(true);
    const res = await fetch(`/api/courses/enrollments/${enrollmentId}/certificate`);
    if (res.ok) {
      const data = await res.json();
      if (data.available && data.certificate) {
        setCertificate({
          verifyCode: data.certificate.verifyCode,
          verifyUrl: data.certificate.verifyUrl,
          courseTitle: data.certificate.courseTitle,
          workloadHours: data.certificate.workloadHours,
        });
      }
    }
    setCertLoading(false);
  }, [enrollmentId]);

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
    if (data.enrollment.progressPercent >= 100) {
      loadCertificate();
    }
  }, [enrollmentId, loadCertificate]);

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
    if (data.progressPercent != null) {
      setProgressPercent(data.progressPercent);
      if (data.progressPercent >= 100) loadCertificate();
    }
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
    <div className="space-y-5">
      <Link
        href="/professional/courses/learn"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <ChevronLeft size={16} />
        Meus cursos
      </Link>

      <div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-slate-900">{courseTitle}</h1>
          <span className="shrink-0 text-sm font-semibold text-brand-600">{progressPercent}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-accent-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {progressPercent >= 100 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          {certLoading ? (
            <div className="flex items-center gap-2 text-sm text-emerald-800">
              <Loader2 size={16} className="animate-spin" />
              Gerando certificado...
            </div>
          ) : certificate ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Award className="shrink-0 text-emerald-600" size={22} />
                <div>
                  <p className="font-semibold text-emerald-900">Parabéns! Curso concluído.</p>
                  <p className="text-sm text-emerald-800">
                    Código: <span className="font-mono font-bold">{certificate.verifyCode}</span>
                  </p>
                </div>
              </div>
              <Link
                href={certificate.verifyUrl}
                target="_blank"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Ver certificado
                <ExternalLink size={14} />
              </Link>
            </div>
          ) : (
            <p className="text-sm text-emerald-800">
              Curso concluído! O certificado estará disponível em instantes.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {activeLesson?.streamUrl ? (
            activeLesson.streamUrl.includes("youtube.com") ||
            activeLesson.streamUrl.includes("youtu.be") ? (
              <div className="aspect-video overflow-hidden rounded-xl bg-black">
                <iframe
                  src={activeLesson.streamUrl.replace("watch?v=", "embed/")}
                  className="h-full w-full"
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
                className="aspect-video w-full rounded-xl bg-black"
                onEnded={() => markComplete(activeLesson.id)}
              />
            )
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              Selecione uma aula
            </div>
          )}

          {activeLesson && (
            <div>
              <h2 className="font-semibold text-slate-900">{activeLesson.title}</h2>
              {activeLesson.description && (
                <p className="mt-1 text-sm text-slate-600">{activeLesson.description}</p>
              )}
              {!activeLesson.progress?.completed && (
                <button
                  type="button"
                  onClick={() => markComplete(activeLesson.id)}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:underline"
                >
                  <CheckCircle2 size={16} />
                  Marcar como concluída
                </button>
              )}
            </div>
          )}
        </div>

        <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-white">
          {modules.map((m) => (
            <div key={m.id}>
              <div className="sticky top-0 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                {m.title}
              </div>
              {m.lessons.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setActiveLessonId(l.id)}
                  className={`flex w-full items-center gap-2 border-b border-slate-50 px-3 py-2.5 text-left text-sm ${
                    l.id === activeLessonId ? "bg-brand-50 text-brand-800" : "hover:bg-slate-50"
                  }`}
                >
                  {l.progress?.completed ? (
                    <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
                  ) : (
                    <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-slate-300" />
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
