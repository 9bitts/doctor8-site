"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, UserCog, AlertTriangle, ListOrdered, UserMinus } from "lucide-react";

interface PatientAdminActionsProps {
  patientId: string;
  activeQueueEntryId: string | null;
  queuePosition: number | null;
  liveConsultKind: "humanitarian" | "appointment" | null;
  liveConsultId: string | null;
  professionalName: string | null;
  providerTab: string | null;
  onActionDone: () => void;
}

export default function PatientAdminActions({
  patientId,
  activeQueueEntryId,
  queuePosition,
  liveConsultKind,
  liveConsultId,
  professionalName,
  providerTab,
  onActionDone,
}: PatientAdminActionsProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [removeReason, setRemoveReason] = useState("");
  const [showRemove, setShowRemove] = useState(false);
  const [repositionPos, setRepositionPos] = useState(
    queuePosition != null ? String(queuePosition) : "1",
  );
  const [problemNote, setProblemNote] = useState("");
  const [showProblem, setShowProblem] = useState(false);

  async function removeFromQueue() {
    if (!activeQueueEntryId || removeReason.trim().length < 3) return;
    setBusy("remove");
    setError("");
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/queue/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: activeQueueEntryId, reason: removeReason.trim() }),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? "Falha ao remover");
        return;
      }
      setShowRemove(false);
      setRemoveReason("");
      onActionDone();
    } catch {
      setError("Erro de rede");
    } finally {
      setBusy(null);
    }
  }

  async function reposition() {
    if (!activeQueueEntryId) return;
    const position = parseInt(repositionPos, 10);
    if (!Number.isFinite(position) || position < 1) return;
    setBusy("reposition");
    setError("");
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/queue/reposition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: activeQueueEntryId, position }),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? "Falha ao reposicionar");
        return;
      }
      onActionDone();
    } catch {
      setError("Erro de rede");
    } finally {
      setBusy(null);
    }
  }

  async function markProblem() {
    if (!liveConsultId || !liveConsultKind || problemNote.trim().length < 3) return;
    setBusy("problem");
    setError("");
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/mark-problem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: liveConsultKind,
          consultId: liveConsultId,
          note: problemNote.trim(),
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? "Falha ao marcar problema");
        return;
      }
      setShowProblem(false);
      setProblemNote("");
      onActionDone();
    } catch {
      setError("Erro de rede");
    } finally {
      setBusy(null);
    }
  }

  const proLink =
    professionalName && providerTab
      ? `/admin/doctors?tab=${providerTab}&q=${encodeURIComponent(professionalName)}`
      : null;

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-4">
      <h3 className="text-sm font-semibold text-slate-800">Acoes do administrador</h3>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {activeQueueEntryId && (
          <>
            <button
              type="button"
              onClick={() => setShowRemove(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50"
            >
              <UserMinus size={14} /> Remover da fila
            </button>
            <button
              type="button"
              onClick={reposition}
              disabled={busy === "reposition"}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {busy === "reposition" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ListOrdered size={14} />
              )}
              Reposicionar
            </button>
          </>
        )}

        {liveConsultId && liveConsultKind && (
          <button
            type="button"
            onClick={() => setShowProblem(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50"
          >
            <AlertTriangle size={14} /> Marcar problema
          </button>
        )}

        {proLink && (
          <Link
            href={proLink}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-brand-200 text-brand-700 hover:bg-brand-50"
          >
            <UserCog size={14} /> Ver profissional
          </Link>
        )}
      </div>

      {activeQueueEntryId && (
        <label className="block text-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase">
            Nova posicao na fila
          </span>
          <input
            type="number"
            min={1}
            value={repositionPos}
            onChange={(e) => setRepositionPos(e.target.value)}
            className="mt-1 w-full max-w-[120px] border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
        </label>
      )}

      {showRemove && (
        <div className="border border-rose-100 rounded-lg p-3 space-y-2 bg-rose-50">
          <p className="text-sm font-medium text-slate-800">Confirmar remocao da fila</p>
          <textarea
            value={removeReason}
            onChange={(e) => setRemoveReason(e.target.value)}
            placeholder="Motivo da remocao (obrigatorio)..."
            rows={3}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={removeFromQueue}
              disabled={busy === "remove" || removeReason.trim().length < 3}
              className="text-xs font-semibold px-3 py-2 rounded-lg bg-rose-600 text-white disabled:opacity-50"
            >
              {busy === "remove" ? "Removendo..." : "Confirmar remocao"}
            </button>
            <button
              type="button"
              onClick={() => setShowRemove(false)}
              className="text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {showProblem && (
        <div className="border border-rose-100 rounded-lg p-3 space-y-2 bg-rose-50">
          <p className="text-sm font-medium text-slate-800">Marcar consulta como problema</p>
          <textarea
            value={problemNote}
            onChange={(e) => setProblemNote(e.target.value)}
            placeholder="Descreva o problema..."
            rows={3}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={markProblem}
              disabled={busy === "problem" || problemNote.trim().length < 3}
              className="text-xs font-semibold px-3 py-2 rounded-lg bg-rose-600 text-white disabled:opacity-50"
            >
              {busy === "problem" ? "Salvando..." : "Confirmar"}
            </button>
            <button
              type="button"
              onClick={() => setShowProblem(false)}
              className="text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
