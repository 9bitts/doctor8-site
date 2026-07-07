"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Loader2, Play } from "lucide-react";

type EnrollmentRow = {
  id: string;
  progressPercent: number;
  completedAt: string | null;
  course: { slug: string; title: string; professionLabel: string };
};

export default function CourseLearnListClient() {
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/courses/enrollments");
    const data = await res.json();
    setEnrollments(data.enrollments ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-brand-600" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Meus cursos</h1>
        <p className="text-slate-500 text-sm mt-1">Cursos que você comprou ou resgatou.</p>
      </div>

      {enrollments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <BookOpen className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-600">Você ainda não está matriculado em nenhum curso.</p>
          <Link href="/cursos" className="inline-block mt-4 text-brand-600 hover:underline">
            Explorar catálogo
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {enrollments.map((e) => (
            <Link
              key={e.id}
              href={`/professional/courses/learn/${e.id}`}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:shadow-sm"
            >
              <div>
                <p className="text-xs text-brand-600">{e.course.professionLabel}</p>
                <h2 className="font-semibold text-slate-900">{e.course.title}</h2>
                <div className="mt-2 h-1.5 w-48 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full"
                    style={{ width: `${e.progressPercent}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">{e.progressPercent}% concluído</p>
              </div>
              <Play className="text-brand-600 shrink-0" size={24} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
