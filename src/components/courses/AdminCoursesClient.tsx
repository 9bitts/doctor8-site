"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

type AdminCourse = {
  id: string;
  title: string;
  status: string;
  priceCents: number;
  instructor: { name: string };
  enrollmentCount: number;
  moduleCount: number;
  rejectedReason: string | null;
};

const STATUS: Record<string, string> = {
  DRAFT: "Rascunho",
  PENDING_REVIEW: "Em revisão",
  PUBLISHED: "Publicado",
  REJECTED: "Rejeitado",
  ARCHIVED: "Arquivado",
};

export default function AdminCoursesClient() {
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/courses");
    const data = await res.json();
    setCourses(data.courses ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id: string, status: "PUBLISHED" | "REJECTED" | "ARCHIVED", reason?: string) {
    await fetch(`/api/admin/courses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, rejectedReason: reason }),
    });
    load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  const pending = courses.filter((c) => c.status === "PENDING_REVIEW");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Cursos — moderação</h1>
        <p className="text-slate-500 text-sm mt-1">
          Aprove cursos de instrutores parceiros para publicar em /cursos
        </p>
      </div>

      {pending.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-medium text-amber-900">{pending.length} aguardando revisão</p>
        </div>
      )}

      <div className="space-y-3">
        {courses.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">{c.title}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100">
                  {STATUS[c.status] ?? c.status}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {c.instructor.name} · {c.moduleCount} módulos · {c.enrollmentCount} alunos ·{" "}
                {(c.priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
              {c.rejectedReason && (
                <p className="text-xs text-red-600 mt-1">Motivo: {c.rejectedReason}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {c.status === "PENDING_REVIEW" && (
                <>
                  <button
                    type="button"
                    onClick={() => setStatus(c.id, "PUBLISHED")}
                    className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 size={14} />
                    Publicar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const reason = prompt("Motivo da rejeição (opcional):");
                      setStatus(c.id, "REJECTED", reason ?? undefined);
                    }}
                    className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                  >
                    <XCircle size={14} />
                    Rejeitar
                  </button>
                </>
              )}
              {c.status === "PUBLISHED" && (
                <button
                  type="button"
                  onClick={() => setStatus(c.id, "ARCHIVED")}
                  className="text-sm px-3 py-1.5 rounded-lg border border-slate-200"
                >
                  Arquivar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
