"use client";

import { useState } from "react";
import { Loader2, UserCheck, UserX } from "lucide-react";

export default function AdminCourseCreatorGrant() {
  const [userId, setUserId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function grant(approved: boolean) {
    if (!userId.trim()) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/admin/users/${userId.trim()}/course-creator`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error || "Erro");
      return;
    }
    setMessage(
      approved
        ? `Acesso liberado para ${data.user?.email ?? userId}`
        : `Acesso revogado para ${data.user?.email ?? userId}`,
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-semibold text-slate-900">Instrutores parceiros</h2>
      <p className="text-sm text-slate-500 mt-1">
        Cole o userId do profissional (visível em /admin/doctors) para liberar criação de cursos.
      </p>
      <div className="flex flex-wrap gap-2 mt-4">
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="userId do profissional"
          className="flex-1 min-w-[200px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => grant(true)}
          className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
          Liberar
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => grant(false)}
          className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50 disabled:opacity-60"
        >
          <UserX size={14} />
          Revogar
        </button>
      </div>
      {message && <p className="text-sm text-emerald-700 mt-2">{message}</p>}
    </div>
  );
}
