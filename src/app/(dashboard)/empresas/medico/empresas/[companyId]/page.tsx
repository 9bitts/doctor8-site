"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileDown,
  Loader2,
  Stethoscope,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { ASO_RESULT_LABELS } from "@/lib/employer-occupational-exams";

type Risk = {
  id: string;
  hazardCode: string;
  hazardLabel: string;
  riskLevel: string;
  severity: number;
  probability: number;
  possibleHarm: string | null;
  existingControls: string | null;
};

type ChecklistItem = { id: string; label: string; done: boolean };

type PendingExam = {
  id: string;
  examType: string;
  dueDate: string | null;
  employee: { firstName: string; lastName: string; email: string };
};

type CompletedExam = {
  id: string;
  examType: string;
  completedAt: string | null;
  asoResult: string | null;
  asoRestrictions: string | null;
  employee: { firstName: string; lastName: string; email: string };
};

type HistoryExam = {
  id: string;
  examType: string;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
  asoResult: string | null;
  asoRestrictions: string | null;
  employee: { firstName: string; lastName: string; email: string };
};

type AsoResult = "APTO" | "APTO_COM_RESTRICAO" | "INAPTO";

type ExamAction =
  | { mode: "complete"; examId: string; asoResult: AsoResult }
  | { mode: "rectify"; exam: CompletedExam };

const EXAM_TYPE_LABELS: Record<string, string> = {
  ADMISSIONAL: "Admissional",
  PERIODICO: "Periódico",
  RETORNO_TRABALHO: "Retorno ao trabalho",
  MUDANCA_FUNCAO: "Mudança de função",
  DEMISSIONAL: "Demissional",
};

export default function MedicoEmpresaDetailPage() {
  const params = useParams();
  const companyId = params.companyId as string;
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [notes, setNotes] = useState("");
  const [examAction, setExamAction] = useState<ExamAction | null>(null);
  const [asoRestrictions, setAsoRestrictions] = useState("");
  const [examNotes, setExamNotes] = useState("");
  const [rectifyAsoResult, setRectifyAsoResult] = useState<AsoResult>("APTO");
  const [historyStatus, setHistoryStatus] = useState("");
  const [historyExams, setHistoryExams] = useState<HistoryExam[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [data, setData] = useState<{
    company: { nomeFantasia: string; cnpj: string; nr1ComplianceScore: number | null };
    pcmso: {
      coordinatorName: string | null;
      completionPercent: number;
      checklist: ChecklistItem[];
      notes: string | null;
    } | null;
    highRisks: Risk[];
    openActionItems: number;
    pendingExams: PendingExam[];
    completedExams: CompletedExam[];
  } | null>(null);

  async function load() {
    if (!companyId) return;
    setLoading(true);
    const res = await fetch(`/api/occupational-physician/companies/${companyId}`);
    const json = await res.json();
    if (json.company) {
      setData(json);
      setChecklist(json.pcmso?.checklist ?? []);
      setNotes(json.pcmso?.notes ?? "");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [companyId]);

  async function loadHistory(status = historyStatus) {
    if (!companyId) return;
    setHistoryLoading(true);
    const params = new URLSearchParams({ employerCompanyId: companyId, take: "50" });
    if (status) params.set("status", status);
    const res = await fetch(`/api/occupational-physician/exams?${params}`);
    const json = await res.json();
    if (res.ok) setHistoryExams(json.exams ?? []);
    setHistoryLoading(false);
  }

  useEffect(() => {
    loadHistory();
  }, [companyId, historyStatus]);

  async function savePcmso(signOff = false) {
    setSaving(true);
    const res = await fetch("/api/occupational-physician/pcmso", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employerCompanyId: companyId,
        checklist,
        notes,
        signOff,
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success(signOff ? "Revisão assinada." : "Checklist salvo.");
      await load();
    } else {
      toast.error("Erro ao salvar PCMSO.");
    }
  }

  function openCompleteExam(examId: string, asoResult: AsoResult) {
    setExamAction({ mode: "complete", examId, asoResult });
    setAsoRestrictions("");
    setExamNotes("");
  }

  function openRectify(exam: CompletedExam) {
    setExamAction({ mode: "rectify", exam });
    setExamNotes("");
    setAsoRestrictions(exam.asoRestrictions ?? "");
    setRectifyAsoResult((exam.asoResult as AsoResult) ?? "APTO");
  }

  function closeExamModal() {
    setExamAction(null);
    setAsoRestrictions("");
    setExamNotes("");
  }

  async function submitExamAction() {
    if (!examAction) return;

    if (examAction.mode === "complete") {
      const { examId, asoResult } = examAction;
      if (asoResult === "APTO_COM_RESTRICAO" && !asoRestrictions.trim()) {
        toast.error("Informe as restrições para apto com restrição.");
        return;
      }
      setSaving(true);
      const res = await fetch("/api/occupational-physician/exams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employerCompanyId: companyId,
          examId,
          status: "COMPLETED",
          asoResult,
          asoRestrictions: asoResult === "APTO_COM_RESTRICAO" ? asoRestrictions.trim() : undefined,
          notes: examNotes.trim() || undefined,
        }),
      });
      setSaving(false);
      if (res.ok) {
        toast.success("ASO registrado.");
        closeExamModal();
        await load();
        await loadHistory();
      } else {
        const json = await res.json().catch(() => ({}));
        toast.error(typeof json.error === "string" ? json.error : "Erro ao registrar ASO.");
      }
      return;
    }

    const { exam } = examAction;
    if (!examNotes.trim()) {
      toast.error("Justificativa obrigatória para retificação.");
      return;
    }
    if (rectifyAsoResult === "APTO_COM_RESTRICAO" && !asoRestrictions.trim()) {
      toast.error("Informe as restrições para apto com restrição.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/occupational-physician/exams", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employerCompanyId: companyId,
        examId: exam.id,
        rectify: true,
        notes: examNotes.trim(),
        asoResult: rectifyAsoResult,
        asoRestrictions:
          rectifyAsoResult === "APTO_COM_RESTRICAO" ? asoRestrictions.trim() : undefined,
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("ASO retificado.");
      closeExamModal();
      await load();
      await loadHistory();
    } else {
      const json = await res.json().catch(() => ({}));
      toast.error(typeof json.error === "string" ? json.error : "Erro ao retificar ASO.");
    }
  }

  function toggleItem(id: string) {
    setChecklist((prev) => prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-teal-500" size={32} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-slate-500">
        Empresa não encontrada ou sem permissão.
      </div>
    );
  }

  const doneCount = checklist.filter((i) => i.done).length;
  const completionPercent = checklist.length ? Math.round((doneCount / checklist.length) * 100) : 0;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <Link href="/empresas/medico/painel" className="inline-flex items-center gap-2 text-teal-700 text-sm hover:underline">
        <ArrowLeft size={16} /> Voltar ao painel
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">{data.company.nomeFantasia}</h1>
        <p className="text-slate-500 text-sm">CNPJ {data.company.cnpj}</p>
      </div>

      <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 flex items-center gap-3">
        <Stethoscope className="text-teal-700" size={24} />
        <div>
          <p className="font-medium text-teal-900">
            PCMSO: {completionPercent}% · {data.openActionItems} ação(ões) em aberto
          </p>
          <p className="text-xs text-teal-800">
            Coordenador: {data.pcmso?.coordinatorName ?? "—"}
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="text-amber-600" size={18} />
          Riscos psicossociais alto/crítico
        </h2>
        {data.highRisks.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum risco alto ou crítico registrado.</p>
        ) : (
          <ul className="space-y-3">
            {data.highRisks.map((r) => (
              <li key={r.id} className="border border-slate-100 rounded-xl p-4 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium text-slate-900">{r.hazardLabel}</span>
                  <span className="text-xs uppercase text-amber-700 font-semibold">{r.riskLevel}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{r.hazardCode} · S{r.severity} × P{r.probability}</p>
                {r.possibleHarm && (
                  <p className="text-slate-600 mt-2"><span className="text-slate-400">Dano possível:</span> {r.possibleHarm}</p>
                )}
                {r.existingControls && (
                  <p className="text-slate-600 mt-1"><span className="text-slate-400">Controles:</span> {r.existingControls}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          <Stethoscope className="text-sky-600" size={18} />
          Exames pendentes
        </h2>
        {!data.pendingExams?.length ? (
          <p className="text-sm text-slate-500">Nenhum exame agendado ou em andamento.</p>
        ) : (
          <ul className="space-y-3">
            {data.pendingExams.map((exam) => (
              <li key={exam.id} className="border border-slate-100 rounded-xl p-4 text-sm">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {exam.employee.firstName} {exam.employee.lastName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {EXAM_TYPE_LABELS[exam.examType] ?? exam.examType}
                      {exam.dueDate && ` · vence ${new Date(exam.dueDate).toLocaleDateString("pt-BR")}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(["APTO", "APTO_COM_RESTRICAO", "INAPTO"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        disabled={saving}
                        onClick={() => openCompleteExam(exam.id, r)}
                        className="text-xs px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {r === "APTO" ? "Apto" : r === "APTO_COM_RESTRICAO" ? "Apto c/ restrição" : "Inapto"}
                      </button>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          <CheckCircle2 className="text-emerald-600" size={18} />
          Exames concluídos / ASOs
        </h2>
        {!data.completedExams?.length ? (
          <p className="text-sm text-slate-500">Nenhum ASO emitido ainda.</p>
        ) : (
          <ul className="space-y-3">
            {data.completedExams.map((exam) => (
              <li key={exam.id} className="border border-slate-100 rounded-xl p-4 text-sm">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {exam.employee.firstName} {exam.employee.lastName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {EXAM_TYPE_LABELS[exam.examType] ?? exam.examType}
                      {exam.completedAt && ` · ${new Date(exam.completedAt).toLocaleDateString("pt-BR")}`}
                    </p>
                    {exam.asoResult && (
                      <p className="text-xs font-medium text-emerald-700 mt-1">
                        {ASO_RESULT_LABELS[exam.asoResult as keyof typeof ASO_RESULT_LABELS] ?? exam.asoResult}
                        {exam.asoRestrictions && ` — ${exam.asoRestrictions}`}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <a
                      href={`/api/employer/exams/${exam.id}/aso-pdf`}
                      className="text-xs text-sky-600 hover:underline inline-flex items-center gap-1"
                    >
                      <FileDown size={12} /> ASO
                    </a>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => openRectify(exam)}
                      className="text-xs px-2 py-1 rounded-lg border border-amber-200 text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                    >
                      Retificar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="font-semibold text-slate-900">Histórico de exames / ASOs</h2>
          <select
            value={historyStatus}
            onChange={(e) => setHistoryStatus(e.target.value)}
            className="text-sm rounded-lg border border-slate-200 px-3 py-1.5"
          >
            <option value="">Todos os status</option>
            <option value="SCHEDULED">Agendado</option>
            <option value="IN_PROGRESS">Em andamento</option>
            <option value="COMPLETED">Concluído</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
        </div>
        {historyLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="animate-spin text-teal-500" size={24} />
          </div>
        ) : !historyExams.length ? (
          <p className="text-sm text-slate-500">Nenhum exame encontrado.</p>
        ) : (
          <ul className="space-y-2 max-h-96 overflow-y-auto">
            {historyExams.map((exam) => (
              <li key={exam.id} className="border border-slate-100 rounded-lg px-3 py-2 text-sm flex justify-between gap-2">
                <div>
                  <span className="font-medium text-slate-900">
                    {exam.employee.firstName} {exam.employee.lastName}
                  </span>
                  <span className="text-xs text-slate-500 ml-2">
                    {EXAM_TYPE_LABELS[exam.examType] ?? exam.examType} · {exam.status}
                  </span>
                  {exam.asoResult && (
                    <span className="text-xs text-emerald-700 ml-2">
                      {ASO_RESULT_LABELS[exam.asoResult as keyof typeof ASO_RESULT_LABELS]}
                    </span>
                  )}
                </div>
                {exam.status === "COMPLETED" && exam.asoResult && (
                  <a
                    href={`/api/employer/exams/${exam.id}/aso-pdf`}
                    className="text-xs text-sky-600 hover:underline shrink-0"
                  >
                    PDF
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Checklist integração PGR ↔ PCMSO</h2>
        <p className="text-xs text-slate-500">Atualize itens e registre revisão médica (como SOC / Metra).</p>
        {checklist.map((item) => (
          <label key={item.id} className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => toggleItem(item.id)}
              className="mt-1 rounded border-slate-300"
            />
            {item.label}
          </label>
        ))}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas clínicas / observações do coordenador PCMSO"
          rows={3}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => savePcmso(false)}
            className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Salvando…" : "Salvar checklist"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => savePcmso(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-teal-600 text-teal-700 text-sm font-medium disabled:opacity-50"
          >
            <CheckCircle2 size={16} />
            Assinar revisão
          </button>
        </div>
      </section>

      {examAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">
                {examAction.mode === "complete" ? "Registrar ASO" : "Retificar ASO"}
              </h3>
              <button type="button" onClick={closeExamModal} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            {examAction.mode === "rectify" && (
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Novo resultado</label>
                <select
                  value={rectifyAsoResult}
                  onChange={(e) => setRectifyAsoResult(e.target.value as AsoResult)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="APTO">Apto</option>
                  <option value="APTO_COM_RESTRICAO">Apto com restrição</option>
                  <option value="INAPTO">Inapto</option>
                </select>
              </div>
            )}

            {(examAction.mode === "complete"
              ? examAction.asoResult === "APTO_COM_RESTRICAO"
              : rectifyAsoResult === "APTO_COM_RESTRICAO") && (
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Restrições *</label>
                <textarea
                  value={asoRestrictions}
                  onChange={(e) => setAsoRestrictions(e.target.value)}
                  rows={3}
                  placeholder="Descreva as restrições ocupacionais"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs text-slate-500">
                {examAction.mode === "rectify" ? "Justificativa da retificação *" : "Observações (opcional)"}
              </label>
              <textarea
                value={examNotes}
                onChange={(e) => setExamNotes(e.target.value)}
                rows={3}
                placeholder={
                  examAction.mode === "rectify"
                    ? "Motivo legal/clínico da retificação"
                    : "Notas adicionais sobre o exame"
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={closeExamModal}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={submitExamAction}
                className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium disabled:opacity-50"
              >
                {saving ? "Salvando…" : examAction.mode === "rectify" ? "Confirmar retificação" : "Confirmar ASO"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
