"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Mail, Plus, Stethoscope, Trash2 } from "lucide-react";
import { NR1_PSYCHOSOCIAL_HAZARDS } from "@/lib/nr1-hazards";
import type { PcmsoExamMatrixRow } from "@/lib/employer-pcmso-exam-matrix";

type ChecklistItem = { id: string; label: string; done: boolean };

type InviteLink = {
  email: string;
  fullName: string | null;
  status: string;
  invitedAt: string;
  joinedAt: string | null;
};

type GheGroup = {
  id: string;
  name: string;
  sector: string | null;
  functions: string | null;
  workerCount: number | null;
  hazardCodes: string[] | null;
  notes: string | null;
};

export default function PcmsoPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteLink, setInviteLink] = useState<InviteLink | null>(null);
  const [coordinatorName, setCoordinatorName] = useState("");
  const [coordinatorEmail, setCoordinatorEmail] = useState("");
  const [coordinatorCrm, setCoordinatorCrm] = useState("");
  const [notes, setNotes] = useState("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [examMatrix, setExamMatrix] = useState<PcmsoExamMatrixRow[]>([]);
  const [gheGroups, setGheGroups] = useState<GheGroup[]>([]);
  const [gheName, setGheName] = useState("");
  const [gheSector, setGheSector] = useState("");
  const [gheFunctions, setGheFunctions] = useState("");
  const [gheWorkers, setGheWorkers] = useState("");
  const [completionPercent, setCompletionPercent] = useState(0);
  const [replaceConfirm, setReplaceConfirm] = useState<{ activeEmail: string } | null>(null);

  async function load() {
    setLoading(true);
    const [pcmsoRes, inviteRes, gheRes] = await Promise.all([
      fetch("/api/employer/pcmso"),
      fetch("/api/employer/pcmso/invite"),
      fetch("/api/employer/ghe"),
    ]);
    const data = await pcmsoRes.json();
    const inviteData = await inviteRes.json();
    const gheData = await gheRes.json();
    if (pcmsoRes.ok) {
      setCoordinatorName(data.config?.coordinatorName ?? "");
      setCoordinatorEmail(data.config?.coordinatorEmail ?? "");
      setCoordinatorCrm(data.config?.coordinatorCrm ?? "");
      setNotes(data.config?.notes ?? "");
      setChecklist(data.checklist ?? []);
      setExamMatrix(data.examMatrix ?? []);
      setCompletionPercent(data.completionPercent ?? 0);
    }
    if (inviteRes.ok) {
      setInviteLink(inviteData.link ?? null);
    }
    if (gheRes.ok) {
      setGheGroups(
        (gheData.groups ?? []).map((g: GheGroup & { hazardCodes: unknown }) => ({
          ...g,
          hazardCodes: Array.isArray(g.hazardCodes) ? (g.hazardCodes as string[]) : [],
        })),
      );
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/employer/pcmso", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coordinatorName,
        coordinatorEmail,
        coordinatorCrm,
        notes,
        checklist,
        examMatrix,
      }),
    });
    setSaving(false);
    load();
  }

  async function addGhe(e: React.FormEvent) {
    e.preventDefault();
    if (!gheName.trim()) return;
    await fetch("/api/employer/ghe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: gheName.trim(),
        sector: gheSector.trim() || undefined,
        functions: gheFunctions.trim() || undefined,
        workerCount: gheWorkers ? Number(gheWorkers) : undefined,
        hazardCodes: [],
      }),
    });
    setGheName("");
    setGheSector("");
    setGheFunctions("");
    setGheWorkers("");
    load();
  }

  async function deleteGhe(id: string) {
    await fetch(`/api/employer/ghe?id=${id}`, { method: "DELETE" });
    load();
  }

  function updateMatrixExam(
    rowId: string,
    examIdx: number,
    field: "admissional" | "periodico" | "retorno" | "demissional" | "periodicity",
    value: boolean | string,
  ) {
    setExamMatrix((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const exams = row.exams.map((ex, i) =>
          i === examIdx ? { ...ex, [field]: value } : ex,
        );
        return { ...row, exams };
      }),
    );
  }

  async function handleInvite(replaceActive = false) {
    if (!coordinatorEmail.trim()) {
      setInviteMessage("Informe o e-mail do médico coordenador.");
      return;
    }
    setInviting(true);
    setInviteMessage("");
    if (!replaceActive) setReplaceConfirm(null);
    const res = await fetch("/api/employer/pcmso/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: coordinatorEmail.trim(),
        fullName: coordinatorName.trim() || undefined,
        crm: coordinatorCrm.trim() || undefined,
        replaceActive: replaceActive || undefined,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setReplaceConfirm(null);
      setInviteMessage(data.message || "Convite enviado.");
    } else if (res.status === 409 && data.error === "ACTIVE_COORDINATOR_EXISTS") {
      setReplaceConfirm({ activeEmail: data.activeEmail });
      setInviteMessage(data.message || "Confirme a substituição do coordenador ativo.");
    } else {
      setInviteMessage(
        data.error === "ALREADY_ACTIVE"
          ? "Este médico já possui acesso ativo."
          : (data.message || data.error || "Erro ao enviar convite."),
      );
    }
    setInviting(false);
    load();
  }

  function toggleItem(id: string) {
    setChecklist((prev) => prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-sky-500" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">PCMSO (NR-7)</h1>
        <p className="text-slate-500 text-sm mt-1">
          Passo 3 — Médico do Trabalho. Defina exames por GHE a partir dos riscos do PGR, incluindo o questionário psicossocial.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/empresas/estrutura" className="text-sm text-sky-700 hover:underline">
            Estrutura / GHE →
          </Link>
          <Link href="/empresas/nr1" className="text-sm text-sky-700 hover:underline">
            Inventário de riscos →
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Stethoscope className="text-sky-700" size={24} />
          <div>
            <p className="font-medium text-sky-900">Checklist NR-7: {completionPercent}% concluído</p>
            <p className="text-xs text-sky-700">Nota Técnica SEI nº 4655/2024/MTE</p>
          </div>
        </div>
        <Link href="/empresas/exames" className="text-sm text-sky-700 font-medium hover:underline">
          Exames ocupacionais / ASO →
        </Link>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">Médico coordenador PCMSO</h2>
          <input
            value={coordinatorName}
            onChange={(e) => setCoordinatorName(e.target.value)}
            placeholder="Nome completo"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              type="email"
              value={coordinatorEmail}
              onChange={(e) => setCoordinatorEmail(e.target.value)}
              placeholder="E-mail"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              value={coordinatorCrm}
              onChange={(e) => setCoordinatorCrm(e.target.value)}
              placeholder="CRM"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="rounded-xl border border-teal-100 bg-teal-50/80 p-4 space-y-3">
            <p className="text-sm text-teal-900 font-medium flex items-center gap-2">
              <Mail size={16} />
              Acesso portal médico do trabalho
            </p>
            <p className="text-xs text-teal-800">
              Envie convite para o coordenador PCMSO acessar alertas de risco e checklist (sem EAP/denúncias).
            </p>
            {inviteLink && (
              <p className="text-xs text-slate-600">
                Status: <strong>{inviteLink.status === "ACTIVE" ? "Ativo" : "Convite pendente"}</strong>
                {inviteLink.joinedAt ? ` · desde ${new Date(inviteLink.joinedAt).toLocaleDateString("pt-BR")}` : ""}
              </p>
            )}
            <button
              type="button"
              onClick={() => handleInvite(false)}
              disabled={inviting || !coordinatorEmail.trim()}
              className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium disabled:opacity-50"
            >
              {inviting ? "Enviando…" : "Enviar convite de acesso"}
            </button>
            {replaceConfirm && (
              <button
                type="button"
                onClick={() => handleInvite(true)}
                disabled={inviting}
                className="ml-2 px-4 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-sm font-medium disabled:opacity-50"
              >
                Confirmar substituição de {replaceConfirm.activeEmail}
              </button>
            )}
            {inviteMessage && <p className="text-xs text-teal-900">{inviteMessage}</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
          <h2 className="font-semibold text-slate-900">Checklist integração</h2>
          {checklist.map((item) => (
            <label key={item.id} className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggleItem(item.id)}
                className="mt-1"
              />
              {item.label}
            </label>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-slate-900">Grupos homogêneos de exposição (GHE)</h2>
            <p className="text-xs text-slate-500 mt-1">
              Cadastro completo em <Link href="/empresas/estrutura" className="text-sky-700 hover:underline">Estrutura</Link>. Atalho rápido abaixo.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              value={gheName}
              onChange={(e) => setGheName(e.target.value)}
              placeholder="Nome do GHE"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              value={gheSector}
              onChange={(e) => setGheSector(e.target.value)}
              placeholder="Setor"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              value={gheFunctions}
              onChange={(e) => setGheFunctions(e.target.value)}
              placeholder="Funções"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={0}
              value={gheWorkers}
              onChange={(e) => setGheWorkers(e.target.value)}
              placeholder="Nº trabalhadores"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={addGhe}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm"
          >
            <Plus size={14} /> Adicionar GHE
          </button>
          <ul className="space-y-2">
            {gheGroups.map((g) => (
              <li key={g.id} className="flex justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{g.name}</p>
                  <p className="text-xs text-slate-500">
                    {g.sector || "—"} · {g.functions || "funções n/d"} · {g.workerCount ?? "?"} pessoas
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Catálogo psicossocial disponível: {NR1_PSYCHOSOCIAL_HAZARDS.length} fatores (vincule no inventário NR-1)
                  </p>
                </div>
                <button type="button" onClick={() => deleteGhe(g.id)} className="text-slate-400 hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
            {gheGroups.length === 0 && (
              <p className="text-xs text-slate-400">Nenhum GHE cadastrado.</p>
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">Matriz de exames PCMSO</h2>
              <p className="text-xs text-slate-500 mt-1">
                Protocolo por GHE — admissional / periódico / retorno / demissional. Inclui questionário psicossocial.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch("/api/employer/pcmso/sync-matrix", { method: "POST" });
                  const data = await res.json();
                  if (res.ok) setExamMatrix(data.examMatrix ?? []);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Sugerir a partir dos riscos
              </button>
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch("/api/employer/pcmso/generate-exams", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ examTypes: ["ADMISSIONAL", "PERIODICO"] }),
                  });
                  const data = await res.json();
                  if (res.ok) {
                    alert(`Exames gerados: ${data.created}. Ignorados (já pendentes): ${data.skipped}.`);
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-medium"
              >
                Gerar exames da matriz
              </button>
            </div>
          </div>
          {examMatrix.map((row) => (
            <div key={row.id} className="rounded-xl border border-slate-100 p-3 space-y-2">
              <p className="text-sm font-medium text-slate-800">
                {row.gheName} · {row.functionName}
              </p>
              <div className="space-y-2">
                {row.exams.map((ex, idx) => (
                  <div key={`${row.id}-${ex.name}`} className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs items-center">
                    <span className="col-span-2 sm:col-span-1 text-slate-700">{ex.name}</span>
                    <label className="inline-flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={ex.admissional}
                        onChange={(e) => updateMatrixExam(row.id, idx, "admissional", e.target.checked)}
                      />
                      Adm
                    </label>
                    <label className="inline-flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={ex.periodico}
                        onChange={(e) => updateMatrixExam(row.id, idx, "periodico", e.target.checked)}
                      />
                      Per
                    </label>
                    <label className="inline-flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={Boolean(ex.retorno)}
                        onChange={(e) => updateMatrixExam(row.id, idx, "retorno", e.target.checked)}
                      />
                      Ret
                    </label>
                    <label className="inline-flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={ex.demissional}
                        onChange={(e) => updateMatrixExam(row.id, idx, "demissional", e.target.checked)}
                      />
                      Dem
                    </label>
                    <input
                      value={ex.periodicity}
                      onChange={(e) => updateMatrixExam(row.id, idx, "periodicity", e.target.value)}
                      className="rounded border border-slate-200 px-2 py-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observações internas (SST / médico do trabalho)…"
          rows={3}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-sky-600 text-white font-medium disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salvar PCMSO"}
        </button>
      </form>
    </div>
  );
}
