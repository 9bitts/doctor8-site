"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, BookOpen, CheckCircle2, CreditCard, Loader2, Plus, Send } from "lucide-react";

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  priceCents: number;
  updatedAt: string;
  _count: { enrollments: number; modules: number };
};

type ConnectStatus = "none" | "onboarding_incomplete" | "pending" | "active" | null;

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  PENDING_REVIEW: "Em revisão",
  PUBLISHED: "Publicado",
  REJECTED: "Rejeitado",
  ARCHIVED: "Arquivado",
};

export default function CourseCreatorListClient() {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatorOk, setCreatorOk] = useState(true);
  const [connectStatus, setConnectStatus] = useState<ConnectStatus>(null);
  const [connectEnabled, setConnectEnabled] = useState(false);

  const loadConnectStatus = useCallback(async () => {
    const res = await fetch("/api/professional/stripe-connect/status");
    if (res.status === 503) {
      setConnectEnabled(false);
      return;
    }
    if (!res.ok) return;
    setConnectEnabled(true);
    const data = await res.json();
    setConnectStatus(data.status as ConnectStatus);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/courses/creator");
    if (res.status === 403) {
      setCreatorOk(false);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setCourses(data.courses ?? []);
    setLoading(false);
    void loadConnectStatus();
  }, [loadConnectStatus]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitForReview(id: string) {
    await fetch(`/api/courses/creator/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PENDING_REVIEW" }),
    });
    load();
  }

  if (!creatorOk) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 px-4">
        <BookOpen className="mx-auto text-slate-300 mb-4" size={48} />
        <h1 className="text-xl font-bold text-slate-900">Acesso de instrutor</h1>
        <p className="text-slate-600 mt-2">
          Para publicar cursos na Doctor8, peça ao administrador para liberar seu acesso de
          instrutor parceiro.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meus cursos</h1>
          <p className="text-slate-500 text-sm mt-1">
            Crie e envie cursos para revisão da Doctor8. Você recebe a comissão das vendas.
          </p>
        </div>
        <Link
          href="/professional/courses/new"
          className="inline-flex items-center justify-center gap-2 bg-brand-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-brand-700"
        >
          <Plus size={18} />
          Novo curso
        </Link>
      </div>

      {connectEnabled && connectStatus && connectStatus !== "active" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-medium text-amber-900">Cadastro de recebimentos pendente</p>
            <p className="text-sm text-amber-800 mt-1">
              Para vender cursos pagos, conclua o cadastro Stripe Connect.
            </p>
            <Link
              href="/professional/financeiro"
              className="inline-flex items-center gap-1 text-sm font-semibold text-amber-900 mt-2 hover:underline"
            >
              <CreditCard size={14} />
              Configurar recebimentos
            </Link>
          </div>
        </div>
      )}

      {connectEnabled && connectStatus === "active" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-2 text-sm text-emerald-800">
          <CheckCircle2 size={16} />
          Recebimentos ativos — vendas de cursos serão repassadas automaticamente.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-brand-600" size={28} />
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-500">
          Nenhum curso ainda. Crie o primeiro!
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-slate-900">{c.title}</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {STATUS_LABEL[c.status] ?? c.status}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {c._count.modules} módulos · {c._count.enrollments} alunos ·{" "}
                  {(c.priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {c.status === "DRAFT" && (
                  <button
                    type="button"
                    onClick={() => submitForReview(c.id)}
                    className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
                  >
                    <Send size={14} />
                    Enviar para revisão
                  </button>
                )}
                <Link
                  href={`/professional/courses/${c.id}/edit`}
                  className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                >
                  Editar
                </Link>
                <Link
                  href={`/cursos/${c.slug}`}
                  className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                >
                  Ver vitrine
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-800">Como funciona</p>
        <ol className="list-decimal list-inside mt-2 space-y-1">
          <li>Crie o curso com módulos e vídeos (upload direto ou link YouTube)</li>
          <li>Envie para revisão — a Doctor8 publica após aprovação</li>
          <li>Você recebe 85% de cada venda (comissão da plataforma: 15%)</li>
        </ol>
      </div>
    </div>
  );
}
