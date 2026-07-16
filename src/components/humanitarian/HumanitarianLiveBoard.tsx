"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  ExternalLink,
  Loader2,
  ListOrdered,
  Radio,
  Stethoscope,
  UserMinus,
  Users,
  Video,
  XCircle,
} from "lucide-react";
import type { HumanitarianLiveOpsDto } from "@/lib/humanitarian/admin-live";

function priorityClass(p: string) {
  if (p === "CRISIS") return "bg-rose-100 text-rose-800";
  if (p === "URGENT") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

function statusDot(status: string) {
  if (status === "ONLINE") return "bg-emerald-500";
  if (status === "BUSY") return "bg-blue-500";
  return "bg-slate-300";
}

async function postAction(body: Record<string, unknown>) {
  const res = await fetch("/api/admin/humanitarian/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Falha na ação");
  return data;
}

export default function HumanitarianLiveBoard({
  ops,
  onRefresh,
  wallboard,
}: {
  ops: HumanitarianLiveOpsDto;
  onRefresh: () => void;
  wallboard?: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [removeReason, setRemoveReason] = useState("");
  const [repositionId, setRepositionId] = useState<string | null>(null);
  const [repositionPos, setRepositionPos] = useState("1");

  const run = useCallback(
    async (key: string, body: Record<string, unknown>) => {
      setBusy(key);
      setError("");
      try {
        await postAction(body);
        onRefresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro");
      } finally {
        setBusy(null);
      }
    },
    [onRefresh],
  );

  const text = wallboard ? "text-base" : "text-sm";
  const titleSize = wallboard ? "text-lg" : "text-sm";

  return (
    <div className="space-y-4">
      {ops.alerts.length > 0 && (
        <div className="space-y-2">
          {ops.alerts.slice(0, wallboard ? 8 : 6).map((a) => (
            <div
              key={a.id}
              className={`flex items-start gap-2 rounded-xl border px-3 py-2 ${text} ${
                a.severity === "critical"
                  ? "border-rose-200 bg-rose-50 text-rose-900"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium">{a.message}</p>
              </div>
              {a.patientProfileId && (
                <Link
                  href={`/admin/patients/${a.patientProfileId}`}
                  className="text-xs font-semibold underline shrink-0"
                >
                  Abrir
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className={`grid gap-4 ${wallboard ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1 xl:grid-cols-3"}`}>
        {/* Queue */}
        <section className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[280px]">
          <header className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-amber-50/50">
            <Radio size={16} className="text-amber-600" />
            <h3 className={`font-semibold text-slate-900 ${titleSize}`}>
              Fila ({ops.queue.length})
            </h3>
            {ops.totals.called > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {ops.totals.called} chamado{ops.totals.called > 1 ? "s" : ""}
              </span>
            )}
          </header>
          <ul className="divide-y divide-slate-50 flex-1 overflow-y-auto max-h-[480px]">
            {ops.queue.length === 0 ? (
              <li className="px-4 py-8 text-center text-slate-400 text-sm">Ninguém na fila</li>
            ) : (
              ops.queue.map((row) => (
                <li key={row.entryId} className="px-4 py-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`font-semibold text-slate-900 truncate ${text}`}>
                        {row.patientName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {row.poolLabel} · pos. {row.position}
                        {row.status === "CALLED" ? " · CHAMADO" : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${priorityClass(row.priority)}`}>
                        {row.priority}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock size={12} /> {row.waitMinutes} min
                      </span>
                    </div>
                  </div>
                  {!wallboard && (
                    <div className="flex flex-wrap gap-1.5">
                      {row.patientProfileId && (
                        <Link
                          href={`/admin/patients/${row.patientProfileId}`}
                          className="text-[11px] font-medium px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-50"
                        >
                          Detalhe
                        </Link>
                      )}
                      {row.status === "WAITING" && (
                        <button
                          type="button"
                          className="text-[11px] font-medium px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-50 inline-flex items-center gap-1"
                          onClick={() => {
                            setRepositionId(row.entryId);
                            setRepositionPos(String(row.position));
                          }}
                        >
                          <ListOrdered size={11} /> Posição
                        </button>
                      )}
                      <button
                        type="button"
                        className="text-[11px] font-medium px-2 py-1 rounded-md border border-rose-200 text-rose-700 hover:bg-rose-50 inline-flex items-center gap-1"
                        onClick={() => setRemoveId(row.entryId)}
                      >
                        <UserMinus size={11} /> Remover
                      </button>
                    </div>
                  )}
                </li>
              ))
            )}
          </ul>
        </section>

        {/* Consults */}
        <section className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[280px]">
          <header className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-blue-50/50">
            <Stethoscope size={16} className="text-blue-600" />
            <h3 className={`font-semibold text-slate-900 ${titleSize}`}>
              Em consulta ({ops.consults.length})
            </h3>
          </header>
          <ul className="divide-y divide-slate-50 flex-1 overflow-y-auto max-h-[480px]">
            {ops.consults.length === 0 ? (
              <li className="px-4 py-8 text-center text-slate-400 text-sm">Nenhuma consulta ativa</li>
            ) : (
              ops.consults.map((c) => (
                <li
                  key={c.entryId}
                  className={`px-4 py-3 space-y-2 ${c.stale ? "bg-rose-50/60" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`font-semibold text-slate-900 truncate ${text}`}>
                        {c.patientName}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        ↔ {c.volunteerName ?? "—"} · {c.poolLabel}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-slate-500 flex items-center gap-1 justify-end">
                        <Clock size={12} /> {c.durationMinutes} min
                      </p>
                      {c.stale && (
                        <span className="text-[10px] font-bold text-rose-700">PRESA</span>
                      )}
                    </div>
                  </div>
                  {!wallboard && (
                    <div className="flex flex-wrap gap-1.5">
                      {c.patientProfileId && (
                        <Link
                          href={`/admin/patients/${c.patientProfileId}`}
                          className="text-[11px] font-medium px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-50"
                        >
                          Detalhe
                        </Link>
                      )}
                      {c.meetingUrl && (
                        <a
                          href={c.meetingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-medium px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-50 inline-flex items-center gap-1"
                        >
                          <Video size={11} /> Sala
                        </a>
                      )}
                      <Link
                        href={`/video/humanitarian/${c.entryId}`}
                        className="text-[11px] font-medium px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-50 inline-flex items-center gap-1"
                      >
                        <ExternalLink size={11} /> Video
                      </Link>
                      <button
                        type="button"
                        disabled={busy === `problem-${c.entryId}`}
                        className="text-[11px] font-medium px-2 py-1 rounded-md border border-amber-200 text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                        onClick={() => {
                          const note = window.prompt("Nota do problema (mín. 3 caracteres):");
                          if (!note || note.trim().length < 3) return;
                          run(`problem-${c.entryId}`, {
                            action: "mark_problem",
                            entryId: c.entryId,
                            note: note.trim(),
                          });
                        }}
                      >
                        Problema
                      </button>
                      {c.stale && (
                        <button
                          type="button"
                          disabled={busy === `close-${c.entryId}`}
                          className="text-[11px] font-medium px-2 py-1 rounded-md border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50 inline-flex items-center gap-1"
                          onClick={() =>
                            run(`close-${c.entryId}`, {
                              action: "close_stale",
                              entryId: c.entryId,
                              reason: "Consulta stale fechada pelo admin",
                            })
                          }
                        >
                          {busy === `close-${c.entryId}` ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <XCircle size={11} />
                          )}
                          Fechar
                        </button>
                      )}
                    </div>
                  )}
                </li>
              ))
            )}
          </ul>
        </section>

        {/* Volunteers */}
        <section className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[280px]">
          <header className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-rose-50/50">
            <Users size={16} className="text-rose-600" />
            <h3 className={`font-semibold text-slate-900 ${titleSize}`}>
              Voluntários ({ops.totals.free} livres · {ops.totals.busy} ocupados)
            </h3>
          </header>
          <ul className="divide-y divide-slate-50 flex-1 overflow-y-auto max-h-[480px]">
            {ops.volunteers.length === 0 ? (
              <li className="px-4 py-8 text-center text-slate-400 text-sm">
                Nenhum voluntário recente
              </li>
            ) : (
              ops.volunteers.map((v) => (
                <li key={v.volunteerId} className="px-4 py-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex items-start gap-2">
                      <span
                        className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${statusDot(v.status)}`}
                      />
                      <div>
                        <p className={`font-semibold text-slate-900 truncate ${text}`}>{v.name}</p>
                        <p className="text-xs text-slate-500">
                          {v.poolLabel} · {v.status}
                          {v.currentPatientName ? ` · com ${v.currentPatientName}` : ""}
                        </p>
                      </div>
                    </div>
                    {v.lastSeenAt && (
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(v.lastSeenAt).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                  {!wallboard && (v.status === "BUSY" || v.status === "ONLINE") && (
                    <button
                      type="button"
                      disabled={busy === `rel-${v.volunteerId}`}
                      className="text-[11px] font-medium px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                      onClick={() => {
                        if (
                          !window.confirm(
                            `Liberar ${v.name}? Paciente em consulta volta para a fila.`,
                          )
                        ) {
                          return;
                        }
                        run(`rel-${v.volunteerId}`, {
                          action: "release_volunteer",
                          volunteerId: v.volunteerId,
                        });
                      }}
                    >
                      {busy === `rel-${v.volunteerId}` ? (
                        <Loader2 size={11} className="animate-spin inline" />
                      ) : null}{" "}
                      Liberar
                    </button>
                  )}
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      {/* Remove modal */}
      {removeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md space-y-3 shadow-xl">
            <h4 className="font-semibold text-slate-900">Remover da fila</h4>
            <textarea
              value={removeReason}
              onChange={(e) => setRemoveReason(e.target.value)}
              placeholder="Motivo (mín. 3 caracteres)"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm min-h-[80px]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-2 text-sm rounded-lg border"
                onClick={() => {
                  setRemoveId(null);
                  setRemoveReason("");
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={removeReason.trim().length < 3 || busy === "remove"}
                className="px-3 py-2 text-sm rounded-lg bg-rose-600 text-white disabled:opacity-50"
                onClick={async () => {
                  await run("remove", {
                    action: "remove",
                    entryId: removeId,
                    reason: removeReason.trim(),
                  });
                  setRemoveId(null);
                  setRemoveReason("");
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reposition modal */}
      {repositionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-3 shadow-xl">
            <h4 className="font-semibold text-slate-900">Nova posição na fila</h4>
            <input
              type="number"
              min={1}
              value={repositionPos}
              onChange={(e) => setRepositionPos(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-2 text-sm rounded-lg border"
                onClick={() => setRepositionId(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy === "reposition"}
                className="px-3 py-2 text-sm rounded-lg bg-slate-900 text-white disabled:opacity-50"
                onClick={async () => {
                  const position = parseInt(repositionPos, 10);
                  if (!Number.isFinite(position) || position < 1) return;
                  await run("reposition", {
                    action: "reposition",
                    entryId: repositionId,
                    position,
                  });
                  setRepositionId(null);
                }}
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Keep wallboard clocks fresh without refetch. */
export function useLiveClock(intervalMs = 30000) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}
