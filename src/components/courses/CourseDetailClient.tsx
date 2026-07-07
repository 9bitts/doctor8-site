"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  Sparkles,
} from "lucide-react";
import { formatPriceBrl } from "@/lib/courses/display";

type CourseDetail = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  shortDescription: string | null;
  professionLabel: string;
  specialty: string | null;
  priceCents: number;
  workloadHours: number | null;
  thumbnailUrl: string | null;
  lessonCount: number;
  totalDurationSecs: number;
  enrolled: boolean;
  instructor: { name: string; specialty: string | null; licenseNumber: string | null };
  modules: Array<{
    id: string;
    title: string;
    lessons: Array<{ id: string; title: string; durationSecs: number | null; isPreview: boolean }>;
  }>;
  connectionBenefit: {
    hasConnection: boolean;
    redeemedThisMonth: boolean;
    canRedeem: boolean;
  } | null;
};

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m} min`;
}

export default function CourseDetailClient({ slug }: { slug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);

  const resolveEnrollment = useCallback(async () => {
    const res = await fetch("/api/courses/enrollments");
    if (!res.ok) return;
    const data = await res.json();
    const en = data.enrollments?.find(
      (x: { course: { slug: string }; id: string }) => x.course.slug === slug,
    );
    if (en) setEnrollmentId(en.id);
  }, [slug]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/courses/${slug}`);
    if (!res.ok) {
      setCourse(null);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setCourse(data.course);
    if (data.course.enrolled) await resolveEnrollment();
    setLoading(false);
  }, [slug, resolveEnrollment]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      load();
    }
  }, [searchParams, load]);

  async function handleEnroll(redeemConnection = false) {
    if (!course) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/courses/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: course.id, redeemConnection }),
    });
    const data = await res.json();
    setBusy(false);

    if (!res.ok) {
      if (res.status === 401) {
        router.push(`/login?callbackUrl=/cursos/${slug}`);
        return;
      }
      setError(data.message || data.error || "Não foi possível concluir.");
      return;
    }

    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
      return;
    }
    if (data.enrollmentId) {
      setEnrollmentId(data.enrollmentId);
      await load();
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-600" size={32} />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-slate-600">Curso não encontrado.</p>
        <Link href="/cursos" className="text-brand-600 hover:underline">
          Voltar ao catálogo
        </Link>
      </div>
    );
  }

  const canAccess = course.enrolled || !!enrollmentId;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/cursos" className="text-sm text-brand-600 hover:underline">
            ← Cursos Doctor8
          </Link>
          <Link href="/" className="font-bold text-brand-600">
            Doctor8
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
              {course.professionLabel}
              {course.specialty ? ` · ${course.specialty}` : ""}
            </span>
            <h1 className="text-3xl font-bold text-slate-900 mt-2">{course.title}</h1>
            {course.shortDescription && (
              <p className="text-lg text-slate-600 mt-2">{course.shortDescription}</p>
            )}
          </div>

          {course.description && (
            <div className="prose prose-slate max-w-none">
              <p className="whitespace-pre-wrap text-slate-700">{course.description}</p>
            </div>
          )}

          <div>
            <h2 className="font-semibold text-slate-900 mb-3">Conteúdo do curso</h2>
            <div className="space-y-3">
              {course.modules.map((m, mi) => (
                <div key={m.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="px-4 py-2 bg-slate-50 font-medium text-sm text-slate-700">
                    Módulo {mi + 1}: {m.title}
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {m.lessons.map((l) => (
                      <li key={l.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-slate-700">
                          <Play size={14} className="text-slate-400" />
                          {l.title}
                          {l.isPreview && (
                            <span className="text-xs text-emerald-600 font-medium">Preview</span>
                          )}
                        </span>
                        {l.durationSecs != null && (
                          <span className="text-slate-400 text-xs">{formatDuration(l.durationSecs)}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sticky top-4">
            <div className="aspect-video rounded-xl bg-gradient-to-br from-brand-50 to-slate-100 flex items-center justify-center mb-4">
              {course.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={course.thumbnailUrl} alt="" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <BookOpen className="text-brand-300" size={40} />
              )}
            </div>

            <p className="text-2xl font-bold text-slate-900">
              {course.priceCents === 0 ? "Grátis" : formatPriceBrl(course.priceCents)}
            </p>

            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <BookOpen size={16} className="text-slate-400" />
                {course.lessonCount} aulas
              </li>
              {course.totalDurationSecs > 0 && (
                <li className="flex items-center gap-2">
                  <Clock size={16} className="text-slate-400" />
                  {formatDuration(course.totalDurationSecs)}
                </li>
              )}
              {course.workloadHours != null && (
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-slate-400" />
                  {course.workloadHours}h certificáveis
                </li>
              )}
            </ul>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="font-medium text-slate-900">{course.instructor.name}</p>
              {course.instructor.licenseNumber && (
                <p className="text-xs text-slate-500">{course.instructor.licenseNumber}</p>
              )}
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            {canAccess ? (
              <Link
                href={
                  enrollmentId
                    ? `/professional/courses/learn/${enrollmentId}`
                    : "/professional/courses/learn"
                }
                className="mt-4 w-full flex items-center justify-center gap-2 bg-brand-600 text-white py-3 rounded-xl font-medium hover:bg-brand-700"
              >
                <Play size={18} />
                Acessar curso
              </Link>
            ) : (
              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleEnroll(false)}
                  className="w-full bg-brand-600 text-white py-3 rounded-xl font-medium hover:bg-brand-700 disabled:opacity-60"
                >
                  {busy ? "Processando..." : course.priceCents === 0 ? "Matricular grátis" : "Comprar curso"}
                </button>

                {course.connectionBenefit?.canRedeem && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleEnroll(true)}
                    className="w-full flex items-center justify-center gap-2 border border-violet-200 bg-violet-50 text-violet-800 py-3 rounded-xl font-medium hover:bg-violet-100 disabled:opacity-60"
                  >
                    <Sparkles size={16} />
                    Incluir no Doctor Connection (1/mês)
                  </button>
                )}

                {course.connectionBenefit?.hasConnection &&
                  course.connectionBenefit.redeemedThisMonth &&
                  course.priceCents > 0 && (
                    <p className="text-xs text-slate-500 text-center">
                      Você já usou seu curso gratuito deste mês no Doctor Connection.
                    </p>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
