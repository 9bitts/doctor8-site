"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, RefreshCw, Tag, Trash2 } from "lucide-react";

type AdminCoupon = {
  id: string;
  code: string;
  description: string | null;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  courseId: string | null;
  course: { id: string; title: string } | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
};

type PublishedCourse = { id: string; title: string; status: string };

function generateRandomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function formatDiscount(c: AdminCoupon): string {
  if (c.discountType === "PERCENT") return `${c.discountValue}%`;
  return (c.discountValue / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AdminCouponsClient() {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [courses, setCourses] = useState<PublishedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [discountValue, setDiscountValue] = useState("100");
  const [courseId, setCourseId] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [couponsRes, coursesRes] = await Promise.all([
      fetch("/api/admin/coupons"),
      fetch("/api/admin/courses"),
    ]);
    const couponsData = await couponsRes.json();
    const coursesData = await coursesRes.json();
    setCoupons(couponsData.coupons ?? []);
    setCourses((coursesData.courses ?? []).filter((c: PublishedCourse) => c.status === "PUBLISHED"));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    const value =
      discountType === "PERCENT"
        ? Number(discountValue)
        : Math.round(Number(discountValue.replace(",", ".")) * 100);

    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code.trim(),
        description: description.trim() || undefined,
        discountType,
        discountValue: value,
        courseId: courseId || null,
        maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      }),
    });
    const data = await res.json();
    setBusy(false);

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Erro ao criar cupom.");
      return;
    }

    setMessage(`Cupom ${data.coupon.code} criado.`);
    setCode("");
    setDescription("");
    setDiscountValue("100");
    setCourseId("");
    setMaxRedemptions("");
    setExpiresAt("");
    load();
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/admin/coupons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Excluir este cupom permanentemente?")) return;
    await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Tag size={20} />
          Cupons de curso
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Crie códigos de desconto ou liberação gratuita (100%) para cursos.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="rounded-xl border border-slate-200 bg-white p-5 space-y-4"
      >
        <h3 className="font-semibold text-slate-900">Novo cupom</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Código</label>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="DEMO100"
                required
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase"
              />
              <button
                type="button"
                onClick={() => setCode(generateRandomCode())}
                className="text-xs px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 whitespace-nowrap"
              >
                Gerar aleatório
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Descrição (opcional)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as "PERCENT" | "FIXED")}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="PERCENT">Percentual (%)</option>
              <option value="FIXED">Valor fixo (R$)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {discountType === "PERCENT" ? "Desconto (%)" : "Desconto (R$)"}
            </label>
            <input
              type="number"
              min={1}
              max={discountType === "PERCENT" ? 100 : undefined}
              step={discountType === "PERCENT" ? 1 : 0.01}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Curso (opcional)</label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Qualquer curso publicado</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Limite de usos (opcional)</label>
            <input
              type="number"
              min={1}
              value={maxRedemptions}
              onChange={(e) => setMaxRedemptions(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Validade (opcional)</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-emerald-700">{message}</p>}
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Criar cupom
        </button>
      </form>

      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Cupons existentes</h3>
        <button type="button" onClick={load} className="text-sm text-slate-500 hover:text-slate-700">
          <RefreshCw size={14} className="inline mr-1" />
          Atualizar
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : coupons.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum cupom cadastrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Desconto</th>
                <th className="px-4 py-3">Curso</th>
                <th className="px-4 py-3">Usos</th>
                <th className="px-4 py-3">Validade</th>
                <th className="px-4 py-3">Ativo</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {coupons.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-mono font-semibold">{c.code}</td>
                  <td className="px-4 py-3">{formatDiscount(c)}</td>
                  <td className="px-4 py-3">{c.course?.title ?? "Todos"}</td>
                  <td className="px-4 py-3">
                    {c.redemptionCount}
                    {c.maxRedemptions != null ? ` / ${c.maxRedemptions}` : " / ∞"}
                  </td>
                  <td className="px-4 py-3">
                    {c.expiresAt
                      ? new Date(c.expiresAt).toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        c.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {c.active ? "Sim" : "Não"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => toggleActive(c.id, !c.active)}
                        className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                      >
                        {c.active ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(c.id)}
                        className="text-xs px-2 py-1 rounded border border-red-200 text-red-700 hover:bg-red-50"
                      >
                        <Trash2 size={12} className="inline" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
