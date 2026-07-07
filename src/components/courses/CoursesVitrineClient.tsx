"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Clock, Loader2, Search, Users } from "lucide-react";
import { formatPriceBrl } from "@/lib/courses/display";

type CourseCard = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  professionLabel: string;
  specialty: string | null;
  priceCents: number;
  workloadHours: number | null;
  thumbnailUrl: string | null;
  enrollmentCount: number;
  instructor: { name: string; specialty: string | null };
};

const PROFESSIONS = [
  { value: "", label: "Todas as áreas" },
  { value: "MEDICINE", label: "Medicina" },
  { value: "NURSING", label: "Enfermagem" },
  { value: "PHARMACY", label: "Farmácia" },
  { value: "PSYCHOLOGY", label: "Psicologia" },
  { value: "NUTRITION", label: "Nutrição" },
  { value: "DENTISTRY", label: "Odontologia" },
  { value: "INTEGRATIVE", label: "Integrativa" },
  { value: "GENERAL", label: "Saúde" },
];

export default function CoursesVitrineClient() {
  const [courses, setCourses] = useState<CourseCard[]>([]);
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
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="font-bold text-brand-600 text-lg">
            Doctor8
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/cursos" className="font-medium text-brand-600">
              Cursos
            </Link>
            <Link href="/login" className="text-slate-600 hover:text-slate-900">
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
            Cursos para profissionais de saúde
          </h1>
          <p className="text-slate-600 mt-3 text-lg">
            Aprenda na prática. Conteúdo criado por especialistas parceiros da Doctor8.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="search"
              placeholder="Buscar curso ou especialidade..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <select
            value={profession}
            onChange={(e) => setProfession(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white"
          >
            {PROFESSIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-brand-600" size={32} />
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <BookOpen className="mx-auto mb-3 opacity-40" size={48} />
            <p>Nenhum curso publicado ainda. Em breve novidades!</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((c) => (
              <Link
                key={c.id}
                href={`/cursos/${c.slug}`}
                className="group rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="aspect-video bg-gradient-to-br from-brand-50 to-slate-100 flex items-center justify-center">
                  {c.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <BookOpen className="text-brand-300" size={48} />
                  )}
                </div>
                <div className="p-4">
                  <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                    {c.professionLabel}
                  </span>
                  <h2 className="font-semibold text-slate-900 mt-2 group-hover:text-brand-600 line-clamp-2">
                    {c.title}
                  </h2>
                  {c.shortDescription && (
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{c.shortDescription}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-2">{c.instructor.name}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <span className="font-bold text-slate-900">
                      {c.priceCents === 0 ? "Grátis" : formatPriceBrl(c.priceCents)}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      {c.workloadHours != null && (
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {c.workloadHours}h
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        {c.enrollmentCount}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
