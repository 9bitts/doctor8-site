"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sora } from "next/font/google";
import {
  Award,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Loader2,
  PlayCircle,
  Search,
  Shield,
  Sparkles,
  Stethoscope,
  Users,
  Video,
} from "lucide-react";
import { BrandLogoLink } from "@/components/brand/BrandLogo";
import CourseCard, { type CourseCardData } from "@/components/courses/CourseCard";

const sora = Sora({ subsets: ["latin"], weight: ["600", "700", "800"] });

const PROFESSIONS = [
  { value: "", label: "Todas" },
  { value: "MEDICINE", label: "Medicina" },
  { value: "NURSING", label: "Enfermagem" },
  { value: "PHARMACY", label: "Farmácia" },
  { value: "PSYCHOLOGY", label: "Psicologia" },
  { value: "NUTRITION", label: "Nutrição" },
  { value: "DENTISTRY", label: "Odontologia" },
  { value: "INTEGRATIVE", label: "Integrativa" },
  { value: "GENERAL", label: "Saúde" },
] as const;

const TRUST_ITEMS = [
  { icon: Shield, label: "Instrutores verificados na plataforma" },
  { icon: Award, label: "Carga horária registrada para EMC" },
  { icon: Video, label: "Aulas online no seu ritmo" },
  { icon: Sparkles, label: "1 curso/mês no Doctor Connection" },
];

const STEPS = [
  {
    title: "Encontre o curso certo",
    desc: "Busque por especialidade, área ou palavra-chave. Filtre por medicina, enfermagem, farmácia e mais.",
  },
  {
    title: "Aprenda na prática",
    desc: "Vídeos objetivos criados por especialistas que vivem o plantão e o consultório todos os dias.",
  },
  {
    title: "Aplique no mesmo dia",
    desc: "Conteúdo conectado à rotina clínica — use o que aprendeu na Doctor8 enquanto atende.",
  },
];

const BENTO = [
  {
    icon: Stethoscope,
    title: "Feito para quem atende",
    desc: "Sem teoria genérica. Cursos pensados para decisão clínica, gestão e atualização profissional.",
    className: "md:col-span-2",
  },
  {
    icon: GraduationCap,
    title: "Parceiros especialistas",
    desc: "Conteúdo produzido por médicos e profissionais aprovados pela Doctor8.",
    className: "",
  },
  {
    icon: PlayCircle,
    title: "Microlearning",
    desc: "Aulas curtas para encaixar entre consultas e plantões.",
    className: "",
  },
  {
    icon: Users,
    title: "Multi-profissional",
    desc: "Medicina, enfermagem, farmácia, psicologia, odontologia e mais em um só lugar.",
    className: "md:col-span-2",
  },
];

function scrollToCatalog() {
  document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function CoursesLandingClient() {
  const [courses, setCourses] = useState<CourseCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [profession, setProfession] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (profession) params.set("profession", profession);
    if (q.trim()) params.set("q", q.trim());
    const res = await fetch(`/api/courses?${params}`);
    const data = await res.json();
    setCourses(data.courses ?? []);
    setLoading(false);
  }, [profession, q]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const stats = useMemo(() => {
    const totalStudents = courses.reduce((n, c) => n + c.enrollmentCount, 0);
    return { count: courses.length, students: totalStudents };
  }, [courses]);

  const hasFeatured = courses.length >= 4;
  const featured = hasFeatured ? courses.slice(0, 3) : [];
  const catalogCourses = hasFeatured ? courses.slice(3) : courses;

  function handleHeroSearch(e: React.FormEvent) {
    e.preventDefault();
    scrollToCatalog();
    load();
  }

  return (
    <div className={`${sora.className} min-h-screen bg-d8-off text-d8-text`}>
      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-d8-dark/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <BrandLogoLink href="/" variant="on-dark" size="md" />
          <nav className="hidden items-center gap-6 text-sm font-medium text-white/70 sm:flex">
            <button type="button" onClick={scrollToCatalog} className="transition hover:text-white">
              Catálogo
            </button>
            <a href="#como-funciona" className="transition hover:text-white">
              Como funciona
            </a>
            <a href="#doctor-connection" className="transition hover:text-white">
              Doctor Connection
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/85 transition hover:border-white/40 sm:inline-block"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-600"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero: busca no início ── */}
      <section className="relative overflow-hidden bg-d8-hero px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10">
        <div className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-accent-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative z-10 mx-auto max-w-3xl">
          {/* Search first */}
          <form
            onSubmit={handleHeroSearch}
            className="rounded-2xl border border-white/20 bg-white/95 p-2 shadow-2xl shadow-black/20 backdrop-blur-sm"
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-d8-off/60 px-4">
                <Search className="shrink-0 text-d8-muted" size={20} aria-hidden />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar curso, especialidade ou tema..."
                  className="min-w-0 flex-1 border-0 bg-transparent py-3.5 text-base text-d8-dark placeholder:text-d8-muted focus:outline-none focus:ring-0 [&::-webkit-search-cancel-button]:hidden"
                />
              </div>
              <button
                type="submit"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-accent-600"
              >
                <Search size={18} aria-hidden />
                Buscar
              </button>
            </div>
            <div className="mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {PROFESSIONS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => {
                    setProfession(p.value);
                    setTimeout(scrollToCatalog, 100);
                  }}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
                    profession === p.value
                      ? "bg-brand-500 text-white"
                      : "bg-d8-off text-d8-muted hover:bg-brand-50 hover:text-brand-700"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </form>

          <div className="mt-12 text-center text-white sm:mt-14">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-accent-300 sm:mb-6">
              Doctor8 Educação
            </p>
            <h1 className="text-3xl font-extrabold leading-snug tracking-tight sm:text-4xl lg:text-5xl">
              Cursos para profissionais
              <span className="mt-2 block text-white/90 sm:mt-3">
                que vivem a saúde na prática
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:mt-7 sm:text-lg">
              Atualize-se com especialistas parceiros. Aprenda no seu ritmo e aplique no plantão,
              no consultório e na telemedicina.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4 sm:mt-12">
              <button
                type="button"
                onClick={scrollToCatalog}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-brand-700 shadow-lg transition hover:bg-white/95"
              >
                <BookOpen size={18} />
                Ver catálogo
              </button>
              <Link
                href="/professional/doctor-connection"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                <Sparkles size={18} />
                Doctor Connection
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <div className="border-y border-d8-border bg-white px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-8 gap-y-3">
          {TRUST_ITEMS.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="flex items-center gap-2 text-sm font-medium text-d8-muted"
            >
              <Icon size={16} className="shrink-0 text-brand-500" />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Stats ── */}
      {!loading && courses.length > 0 && (
        <section className="px-4 py-12 sm:px-6">
          <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-3">
            {[
              { value: String(stats.count), label: "Cursos disponíveis" },
              { value: stats.students > 0 ? `${stats.students}+` : "—", label: "Matrículas na plataforma" },
              { value: "8+", label: "Áreas da saúde" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-d8-border bg-white px-6 py-5 text-center shadow-sm"
              >
                <p className="text-3xl font-extrabold text-brand-600">{s.value}</p>
                <p className="mt-1 text-sm text-d8-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Featured bento ── */}
      {!loading && featured.length > 0 && (
        <section className="px-4 pb-4 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-accent-500">
                  Destaques
                </span>
                <h2 className="mt-1 text-2xl font-extrabold text-d8-dark sm:text-3xl">
                  Cursos em evidência
                </h2>
              </div>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              {featured[0] && <CourseCard course={featured[0]} featured />}
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
                {featured.slice(1).map((c) => (
                  <CourseCard key={c.id} course={c} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Bento value props ── */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-accent-500">
              Por que Doctor8 Cursos
            </span>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-d8-dark sm:text-4xl">
              Educação que respeita seu tempo
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-d8-muted">
              Inspirado nas melhores vitrines de cursos profissionais: clareza, prova social,
              transformação prática e design pensado para quem trabalha em saúde.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {BENTO.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className={`rounded-2xl border border-d8-border bg-white p-6 shadow-sm transition hover:border-brand-200 hover:shadow-md ${item.className}`}
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600">
                    <Icon size={22} />
                  </div>
                  <h3 className="text-lg font-bold text-d8-dark">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-d8-muted">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Catálogo completo ── */}
      <section id="catalogo" className="scroll-mt-24 bg-white px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-brand-500">
                Catálogo
              </span>
              <h2 className="mt-1 text-2xl font-extrabold text-d8-dark sm:text-3xl">
                Todos os cursos
              </h2>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-d8-muted" size={16} />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Refinar busca..."
                  className="w-full rounded-xl border border-d8-border py-2.5 pl-9 pr-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <select
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                className="rounded-xl border border-d8-border bg-white px-3 py-2.5 text-sm text-d8-dark"
              >
                {PROFESSIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="animate-spin text-brand-500" size={36} />
            </div>
          ) : courses.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-d8-border bg-d8-off px-6 py-20 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10">
                <BookOpen className="text-brand-500" size={32} />
              </div>
              <h3 className="text-xl font-bold text-d8-dark">Novos cursos em breve</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-d8-muted">
                Estamos reunindo especialistas parceiros para a primeira leva de conteúdo.
                Enquanto isso, conheça a plataforma Doctor8.
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
              >
                Conhecer a Doctor8
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {catalogCourses.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Como funciona ── */}
      <section id="como-funciona" className="scroll-mt-24 bg-d8-off px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-accent-500">
              Simples e direto
            </span>
            <h2 className="mt-2 text-3xl font-extrabold text-d8-dark">Como funciona</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="relative rounded-2xl border border-d8-border bg-white p-6 shadow-sm"
              >
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full text-lg font-extrabold text-white ${
                    i % 2 === 0 ? "bg-brand-500" : "bg-accent-500"
                  }`}
                >
                  {i + 1}
                </div>
                <h3 className="text-lg font-bold text-d8-dark">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-d8-muted">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Doctor Connection ── */}
      <section
        id="doctor-connection"
        className="scroll-mt-24 bg-d8-club px-4 py-16 sm:px-6"
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl text-white">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-300">
              <Sparkles size={14} />
              Benefício exclusivo
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Assinantes Doctor Connection ganham 1 curso por mês
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/70">
              Sua assinatura profissional inclui um curso parceiro todo mês — sem custo extra.
              Ideal para manter-se atualizado com microlearning entre plantões e consultas.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Resgate mensal direto na página do curso",
                "Acesso vitalício ao conteúdo matriculado",
                "Integrado à sua conta profissional Doctor8",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-white/85">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-accent-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-sm">
            <p className="text-sm font-medium text-white/60">Para profissionais</p>
            <p className="mt-1 text-2xl font-extrabold text-white">Doctor Connection</p>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              Telemedicina, prontuário, receitas digitais e agora educação continuada — tudo em
              uma plataforma.
            </p>
            <Link
              href="/professional/doctor-connection"
              className="mt-6 flex w-full items-center justify-center rounded-xl bg-accent-500 py-3.5 text-sm font-bold text-white transition hover:bg-accent-600"
            >
              Conhecer o plano
            </Link>
            <p className="mt-3 text-center text-[11px] text-white/45">
              Club Doctor é para pacientes · Doctor Connection é para profissionais
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA instrutores ── */}
      <section className="px-4 py-16 sm:px-6">
        <div
          className="mx-auto max-w-6xl overflow-hidden rounded-3xl px-6 py-12 text-center sm:px-12"
          style={{
            background: "linear-gradient(135deg, #155a73 0%, #114a5e 50%, #0a2d3a 100%)",
          }}
        >
          <GraduationCap className="mx-auto text-white" size={40} strokeWidth={1.5} />
          <h2 className="mt-4 text-2xl font-extrabold text-white sm:text-3xl">
            É especialista e quer publicar seu curso?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/90 sm:text-base">
            A Doctor8 conecta você a milhares de profissionais de saúde. Você produz o conteúdo;
            nós cuidamos da vitrine, pagamentos e distribuição.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-brand-700 shadow-lg transition hover:bg-white/95"
          >
            Falar com a Doctor8
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-d8-border bg-white px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <BrandLogoLink href="/" variant="on-light" size="md" />
          <p className="text-center text-xs text-d8-muted sm:text-left">
            © {new Date().getFullYear()} Doctor8 · Cursos por especialistas parceiros
          </p>
          <div className="flex gap-4 text-sm font-medium text-d8-muted">
            <Link href="/" className="hover:text-brand-600">
              Início
            </Link>
            <Link href="/privacy" className="hover:text-brand-600">
              Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
