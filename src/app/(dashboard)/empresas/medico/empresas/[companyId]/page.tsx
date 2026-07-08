"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, Stethoscope, FileDown } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [notes, setNotes] = useState("");
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

  useEffect(() => { load(); }, [companyId]);

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
    if (res.ok) await load();
    else alert("Erro ao salvar PCMSO.");
  }

  async function completeExam(examId: string, asoResult: string) {
    setSaving(true);
    const res = await fetch("/api/occupational-physician/exams", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employerCompanyId: companyId,
        examId,
        status: "COMPLETED",
        asoResult,
      }),
    });
    setSaving(false);
    if (res.ok) await load();
    else alert("Erro ao registrar ASO.");
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
          Exames pendentes / ASO
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
                        onClick={() => completeExam(exam.id, r)}
                        className="text-xs px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {r === "APTO" ? "Apto" : r === "APTO_COM_RESTRICAO" ? "Apto c/ restrição" : "Inapto"}
                      </button>
                    ))}
                    <a
                      href={`/api/employer/exams/${exam.id}/aso-pdf`}
                      className="text-xs text-sky-600 hover:underline inline-flex items-center gap-1 self-center"
                    >
                      <FileDown size={12} /> ASO
                    </a>
                  </div>
                </div>
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
    </div>
  );
}
