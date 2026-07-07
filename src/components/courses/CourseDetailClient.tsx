"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Sora } from "next/font/google";
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  GraduationCap,
  Loader2,
  Play,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { BrandLogoLink } from "@/components/brand/BrandLogo";
import { formatPriceBrl } from "@/lib/courses/display";

const sora = Sora({ subsets: ["latin"], weight: ["600", "700", "800"] });

type Lesson = {
  id: string;
  title: string;
  durationSecs: number | null;
  isPreview: boolean;
  hasVideo: boolean;
  streamUrl: string | null;
};

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
  enrollmentCount: number;
  enrolled: boolean;
  instructor: { name: string; specialty: string | null; licenseNumber: string | null };
  modules: Array<{ id: string; title: string; lessons: Lesson[] }>;
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

function PreviewPlayer({ lesson }: { lesson: Lesson }) {
  if (!lesson.streamUrl) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-d8-dark/5 text-d8-muted">
        Preview indisponível
      </div>
    );
  }
  if (
    lesson.streamUrl.includes("youtube.com") ||
    lesson.streamUrl.includes("youtu.be")
  ) {
    const embed = lesson.streamUrl.includes("embed/")
      ? lesson.streamUrl
      : lesson.streamUrl.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/");
    return (
      <div className="aspect-video overflow-hidden rounded-xl bg-black">
        <iframe src={embed} className="h-full w-full" allowFullScreen title={lesson.title} />
      </div>
    );
  }
  return (
    <video
      key={lesson.id}
      src={lesson.streamUrl}
      controls
      className="aspect-video w-full rounded-xl bg-black"
    />
  );
}

export default function CourseDetailClient({ slug }: { slug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [previewLessonId, setPreviewLessonId] = useState<string | null>(null);
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());
  const checkoutSuccess = searchParams.get("checkout") === "success";

  const previewLessons = useMemo(
    () =>
      course?.modules.flatMap((m) => m.lessons.filter((l) => l.isPreview && l.streamUrl)) ?? [],
    [course],
  );

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
    const firstPreview = data.course.modules
      .flatMap((m: { lessons: Lesson[] }) => m.lessons)
      .find((l: Lesson) => l.isPreview && l.streamUrl);
    if (firstPreview) setPreviewLessonId(firstPreview.id);
    if (data.course.modules[0]) {
      setOpenModules(new Set([data.course.modules[0].id]));
    }
    setLoading(false);
  }, [slug, resolveEnrollment]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (checkoutSuccess) load();
  }, [checkoutSuccess, load]);

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

  function toggleModule(id: string) {
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className={`${sora.className} flex min-h-screen items-center justify-center bg-d8-off`}>
        <Loader2 className="animate-spin text-brand-600" size={32} />
      </div>
    );
  }

  if (!course) {
    return (
      <div className={`${sora.className} flex min-h-screen flex-col items-center justify-center gap-4 bg-d8-off`}>
        <p className="text-d8-muted">Curso não encontrado.</p>
        <Link href="/cursos" className="font-semibold text-brand-600 hover:underline">
          Voltar ao catálogo
        </Link>
      </div>
    );
  }

  const canAccess = course.enrolled || !!enrollmentId;
  const activePreview = previewLessons.find((l) => l.id === previewLessonId) ?? previewLessons[0];

  return (
    <div className={`${sora.className} min-h-screen bg-d8-off text-d8-text`}>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-d8-dark/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <BrandLogoLink href="/" variant="on-dark" size="md" />
          <Link
            href="/cursos"
            className="text-sm font-medium text-white/70 transition hover:text-white"
          >
            ← Catálogo
          </Link>
        </div>
      </header>

      {checkoutSuccess && canAccess && (
        <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-800">
          <CheckCircle2 className="mr-1.5 inline-block" size={16} />
          Pagamento confirmado! Você já pode acessar o curso.
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden bg-d8-hero px-4 py-10 sm:px-6 sm:py-14">
        <div className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-accent-500/20 blur-3xl" />
        <div className="relative z-10 mx-auto grid max-w-6xl gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent-300">
              {course.professionLabel}
              {course.specialty ? ` · ${course.specialty}` : ""}
            </span>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
              {course.title}
            </h1>
            {course.shortDescription && (
              <p className="mt-3 text-lg leading-relaxed text-white/75">{course.shortDescription}</p>
            )}
            <div className="mt-6 flex flex-wrap gap-4 text-sm text-white/65">
              <span className="flex items-center gap-1.5">
                <BookOpen size={16} className="text-accent-300" />
                {course.lessonCount} aulas
              </span>
              {course.totalDurationSecs > 0 && (
                <span className="flex items-center gap-1.5">
                  <Clock size={16} className="text-accent-300" />
                  {formatDuration(course.totalDurationSecs)}
                </span>
              )}
              {course.workloadHours != null && (
                <span className="flex items-center gap-1.5">
                  <Award size={16} className="text-accent-300" />
                  {course.workloadHours}h certificáveis
                </span>
              )}
              {course.enrollmentCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <Users size={16} className="text-accent-300" />
                  {course.enrollmentCount} matriculado{course.enrollmentCount === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            {activePreview ? (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-accent-300">
                  Aula preview gratuita
                </p>
                <PreviewPlayer lesson={activePreview} />
              </div>
            ) : course.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.thumbnailUrl}
                alt=""
                className="aspect-video w-full rounded-2xl object-cover shadow-2xl"
              />
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-2xl bg-white/10">
                <GraduationCap className="text-white/40" size={48} />
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {course.description && (
            <section>
              <h2 className="text-xl font-bold text-d8-dark">Sobre o curso</h2>
              <p className="mt-3 whitespace-pre-wrap leading-relaxed text-d8-muted">
                {course.description}
              </p>
            </section>
          )}

          <section>
            <h2 className="text-xl font-bold text-d8-dark">Instrutor</h2>
            <div className="mt-4 flex items-start gap-4 rounded-2xl border border-d8-border bg-white p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <GraduationCap size={22} />
              </div>
              <div>
                <p className="font-semibold text-d8-dark">{course.instructor.name}</p>
                {course.instructor.specialty && (
                  <p className="text-sm text-d8-muted">{course.instructor.specialty}</p>
                )}
                {course.instructor.licenseNumber && (
                  <p className="mt-1 text-xs text-d8-muted">{course.instructor.licenseNumber}</p>
                )}
                <p className="mt-2 flex items-center gap-1 text-xs font-medium text-brand-600">
                  <Shield size={12} />
                  Instrutor verificado na Doctor8
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-d8-dark">Conteúdo do curso</h2>
            <div className="mt-4 space-y-2">
              {course.modules.map((m, mi) => {
                const open = openModules.has(m.id);
                return (
                  <div
                    key={m.id}
                    className="overflow-hidden rounded-xl border border-d8-border bg-white"
                  >
                    <button
                      type="button"
                      onClick={() => toggleModule(m.id)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-d8-dark hover:bg-d8-off/50"
                    >
                      <span>
                        Módulo {mi + 1}: {m.title}
                      </span>
                      <span className="flex items-center gap-2 text-sm font-normal text-d8-muted">
                        {m.lessons.length} aulas
                        <ChevronDown
                          size={18}
                          className={`transition ${open ? "rotate-180" : ""}`}
                        />
                      </span>
                    </button>
                    {open && (
                      <ul className="divide-y divide-d8-border border-t border-d8-border">
                        {m.lessons.map((l) => (
                          <li
                            key={l.id}
                            className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                          >
                            <span className="flex min-w-0 items-center gap-2 text-d8-text">
                              <Play size={14} className="shrink-0 text-d8-muted" />
                              <span className="truncate">{l.title}</span>
                              {l.isPreview && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewLessonId(l.id)}
                                  className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                                >
                                  Preview
                                </button>
                              )}
                            </span>
                            {l.durationSecs != null && (
                              <span className="shrink-0 text-xs text-d8-muted">
                                {formatDuration(l.durationSecs)}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Purchase card */}
        <div>
          <div className="sticky top-24 space-y-4 rounded-2xl border border-d8-border bg-white p-6 shadow-lg">
            {!activePreview && course.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.thumbnailUrl}
                alt=""
                className="aspect-video w-full rounded-xl object-cover"
              />
            )}

            <p className="text-3xl font-extrabold text-d8-dark">
              {course.priceCents === 0 ? "Grátis" : formatPriceBrl(course.priceCents)}
            </p>

            <ul className="space-y-2 text-sm text-d8-muted">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-brand-500" />
                Acesso vitalício ao conteúdo
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-brand-500" />
                Certificado verificável ao concluir
              </li>
              {course.workloadHours != null && (
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-brand-500" />
                  {course.workloadHours}h para EMC/CATE
                </li>
              )}
            </ul>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {canAccess ? (
              <Link
                href={
                  enrollmentId
                    ? `/professional/courses/learn/${enrollmentId}`
                    : "/professional/courses/learn"
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 py-3.5 font-bold text-white transition hover:bg-accent-600"
              >
                <Play size={18} />
                Acessar curso
              </Link>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleEnroll(false)}
                  className="w-full rounded-xl bg-accent-500 py-3.5 font-bold text-white transition hover:bg-accent-600 disabled:opacity-60"
                >
                  {busy
                    ? "Processando..."
                    : course.priceCents === 0
                      ? "Matricular grátis"
                      : "Comprar curso"}
                </button>

                {course.connectionBenefit?.canRedeem && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleEnroll(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 py-3.5 font-semibold text-violet-800 transition hover:bg-violet-100 disabled:opacity-60"
                  >
                    <Sparkles size={16} />
                    Incluir no Doctor Connection (1/mês)
                  </button>
                )}

                {course.connectionBenefit?.hasConnection &&
                  course.connectionBenefit.redeemedThisMonth &&
                  course.priceCents > 0 && (
                    <p className="text-center text-xs text-d8-muted">
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
