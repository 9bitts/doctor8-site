"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, FileDown, Stethoscope, AlertTriangle, Building2 } from "lucide-react";
import { EsocialPartnerSection } from "@/components/employer/EsocialPartnerSection";

type Exam = {
  id: string;
  examType: string;
  examTypeLabel: string;
  status: string;
  dueDate: string | null;
  asoResult: string | null;
  overdue: boolean;
  clinicName: string | null;
  partnerBookingRef: string | null;
  hasReport: boolean;
  employee: { firstName: string; lastName: string; email: string };
};

type WorkforceMember = { id: string; firstName: string; lastName: string; email: string };
type Clinic = { id: string; name: string; city: string; state: string };

const EXAM_TYPES = [
  { value: "ADMISSIONAL", label: "Admissional" },
  { value: "PERIODICO", label: "Periódico" },
  { value: "RETORNO_TRABALHO", label: "Retorno ao trabalho" },
  { value: "MUDANCA_FUNCAO", label: "Mudança de função" },
  { value: "DEMISSIONAL", label: "Demissional" },
];

const ASO_RESULTS = [
  { value: "APTO", label: "Apto" },
  { value: "APTO_COM_RESTRICAO", label: "Apto c/ restrição" },
  { value: "INAPTO", label: "Inapto" },
];

export default function ExamesPage() {
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Exam[]>([]);
  const [stats, setStats] = useState({ overdue: 0, pending: 0, completed: 0 });
  const [workforce, setWorkforce] = useState<WorkforceMember[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [memberId, setMemberId] = useState("");
  const [examType, setExamType] = useState("PERIODICO");
  const [clinicPartnerId, setClinicPartnerId] = useState("");
  const [exporting, setExporting] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string | undefined>();

  async function load() {
    setLoading(true);
    const [exRes, wfRes, clRes] = await Promise.all([
      fetch("/api/employer/exams"),
      fetch("/api/employer/workforce"),
      fetch("/api/employer/clinics"),
    ]);
    const exData = await exRes.json();
    const wfData = await wfRes.json();
    const clData = await clRes.json();
    if (exRes.ok) {
      setExams(exData.exams ?? []);
      setStats(exData.stats ?? { overdue: 0, pending: 0, completed: 0 });
    }
    if (wfRes.ok) {
      setWorkforce((wfData.members ?? []).filter((m: { status: string }) => m.status === "ACTIVE"));
    }
    if (clRes.ok) setClinics(clData.clinics ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createExam(e: React.FormEvent) {
    e.preventDefault();
    if (!memberId) return;
    await fetch("/api/employer/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workforceMemberId: memberId,
        examType,
        clinicPartnerId: clinicPartnerId || undefined,
      }),
    });
    setMemberId("");
    setClinicPartnerId("");
    load();
  }

  async function completeExam(id: string, asoResult: string) {
    await fetch(`/api/employer/exams/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "COMPLETED",
        asoResult,
        completedAt: new Date().toISOString(),
        physicianName: "Médico do trabalho",
      }),
    });
    setSelectedExamId(id);
    load();
  }

  async function uploadReport(examId: string, file: File) {
    const form = new FormData();
    form.append("file", file);
    await fetch(`/api/employer/exams/${examId}/report`, { method: "POST", body: form });
    load();
  }

  async function exportEsocial() {
    setExporting(true);
    const res = await fetch("/api/employer/esocial/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const data = await res.json();
    setExporting(false);
    if (data.events) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `esocial-s2220-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-sky-500" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Stethoscope className="text-sky-600" size={24} />
          Exames ocupacionais / ASO
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Rede de clínicas parceiras, ASO com ICP-Brasil e eSocial via parceiro (SOC / Metra).
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Pendentes</p>
          <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs text-amber-700">Vencidos</p>
          <p className="text-2xl font-bold text-amber-900">{stats.overdue}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs text-emerald-700">Concluídos</p>
          <p className="text-2xl font-bold text-emerald-900">{stats.completed}</p>
        </div>
      </div>

      <form onSubmit={createExam} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
        <p className="text-sm font-medium text-slate-800 flex items-center gap-2">
          <Building2 size={16} className="text-sky-600" /> Agendar exame
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            required
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Colaborador…</option>
            {workforce.map((w) => (
              <option key={w.id} value={w.id}>{w.firstName} {w.lastName}</option>
            ))}
          </select>
          <select value={examType} onChange={(e) => setExamType(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {EXAM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <select
          value={clinicPartnerId}
          onChange={(e) => setClinicPartnerId(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">Clínica parceira (opcional)…</option>
          {clinics.map((c) => (
            <option key={c.id} value={c.id}>{c.name} — {c.city}/{c.state}</option>
          ))}
        </select>
        <button type="submit" className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium">
          <Plus size={16} /> Agendar
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={exportEsocial}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-sky-600 text-sky-700 text-sm font-medium disabled:opacity-50"
        >
          <FileDown size={16} />
          {exporting ? "Gerando…" : "Export JSON (legado)"}
        </button>
      </div>

      <EsocialPartnerSection examId={selectedExamId} />

      <ul className="space-y-3">
        {exams.map((exam) => (
          <li key={exam.id} className={`rounded-xl border p-4 bg-white ${exam.overdue ? "border-amber-300" : "border-slate-200"}`}>
            <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">
                  {exam.employee.firstName} {exam.employee.lastName}
                </p>
                <p className="text-xs text-slate-500">
                  {exam.examTypeLabel} · {exam.status}
                  {exam.dueDate && ` · vence ${new Date(exam.dueDate).toLocaleDateString("pt-BR")}`}
                </p>
                {exam.clinicName && (
                  <p className="text-xs text-sky-700 mt-1">
                    {exam.clinicName}
                    {exam.partnerBookingRef && ` · ref. ${exam.partnerBookingRef}`}
                  </p>
                )}
                {exam.overdue && (
                  <p className="text-xs text-amber-700 flex items-center gap-1 mt-1">
                    <AlertTriangle size={12} /> Exame vencido
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {exam.status === "COMPLETED" && (
                  <>
                    <a href={`/api/employer/exams/${exam.id}/aso-pdf`} className="text-xs text-sky-600 hover:underline inline-flex items-center gap-1">
                      <FileDown size={12} /> ASO PDF
                    </a>
                    <label className="text-xs text-slate-600 cursor-pointer hover:underline">
                      {exam.hasReport ? "Laudo anexado" : "Anexar laudo"}
                      <input type="file" accept="application/pdf" className="hidden" onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadReport(exam.id, f);
                      }} />
                    </label>
                  </>
                )}
                {exam.status !== "COMPLETED" && ASO_RESULTS.map((r) => (
                  <button key={r.value} type="button" onClick={() => completeExam(exam.id, r.value)} className="text-xs px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50">
                    {r.label}
                  </button>
                ))}
                {exam.asoResult && <span className="text-xs font-medium text-emerald-700">{exam.asoResult}</span>}
              </div>
            </div>
          </li>
        ))}
        {exams.length === 0 && (
          <p className="text-sm text-slate-500">Nenhum exame agendado.</p>
        )}
      </ul>
    </div>
  );
}
