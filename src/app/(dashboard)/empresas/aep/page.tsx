"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, CheckCircle2, AlertTriangle, Camera, MapPin, PenLine, FileDown, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  defaultFieldVisit,
  fieldVisitProgress,
  parseFieldVisit,
  type FieldVisitData,
  type FieldVisitPhoto,
} from "@/lib/nr1-field-visit";

type AepRecord = {
  id: string;
  title: string;
  version: number;
  status: string;
  methodology: string | null;
  methodologyRationale: string | null;
  workerParticipation: string | null;
  notes: string | null;
  workstationDescription: string | null;
  recommendAet: boolean;
  ergonomicScreeningJson: unknown;
  fieldVisitJson: unknown;
  photoKeys: unknown;
  aetStatus: string;
  aetFindings: string | null;
  aetRecommendations: string | null;
  evaluatorName: string | null;
  evaluatorSignedAt: string | null;
  aetCompletedAt: string | null;
  approvedByName: string | null;
  surveyCampaignId: string | null;
  _count: { riskEntries: number };
};

type SurveyCampaign = {
  id: string;
  title: string;
  instrument: string;
  status: string;
};

type PhotoWithUrl = FieldVisitPhoto & { url: string | null };

export default function AepPage() {
  const [records, setRecords] = useState<AepRecord[]>([]);
  const [campaigns, setCampaigns] = useState<SurveyCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("AEP — Postos e organização do trabalho");
  const [methodologyRationale, setMethodologyRationale] = useState("");
  const [workerParticipation, setWorkerParticipation] = useState("");
  const [workstationDescription, setWorkstationDescription] = useState("");
  const [surveyCampaignId, setSurveyCampaignId] = useState("");
  const [repetitions, setRepetitions] = useState("");
  const [loadKg, setLoadKg] = useState("");
  const [armsAbove, setArmsAbove] = useState(false);
  const [trunkFlexion, setTrunkFlexion] = useState(false);
  const [wristForce, setWristForce] = useState(false);
  const [vibration, setVibration] = useState(false);
  const [standing, setStanding] = useState(false);
  const [computer, setComputer] = useState(true);
  const [error, setError] = useState("");
  const [approvedByName, setApprovedByName] = useState("");
  const [visitId, setVisitId] = useState<string | null>(null);
  const [visit, setVisit] = useState<FieldVisitData | null>(null);
  const [photos, setPhotos] = useState<PhotoWithUrl[]>([]);
  const [uploading, setUploading] = useState(false);
  const [savingVisit, setSavingVisit] = useState(false);
  const [findings, setFindings] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [evaluatorName, setEvaluatorName] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/employer/nr1/aep");
    const data = await res.json();
    setRecords(data.records ?? []);
    setCampaigns(data.campaigns ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function ergoPayload() {
    return {
      workstationDescription: workstationDescription || undefined,
      repetitionsPerShift: repetitions ? Number(repetitions) : null,
      loadKg: loadKg ? Number(loadKg) : null,
      armsAboveShoulders: armsAbove,
      trunkFlexionFrequent: trunkFlexion,
      wristForceDeviation: wristForce,
      vibrationTools: vibration,
      prolongedStanding: standing,
      computerWorkstation: computer,
    };
  }

  async function createDraft(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    await fetch("/api/employer/nr1/aep", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        methodology: "AEP/AET-lite em campo (NR-17) + fatores psicossociais",
        methodologyRationale,
        workerParticipation,
        workstationDescription,
        ergonomicScreening: ergoPayload(),
        surveyCampaignId: surveyCampaignId || undefined,
        status: "IN_PROGRESS",
      }),
    });
    load();
  }

  async function openFieldVisit(record: AepRecord) {
    setError("");
    setVisitId(record.id);
    setFindings(record.aetFindings ?? "");
    setRecommendations(record.aetRecommendations ?? "");
    setEvaluatorName(record.evaluatorName ?? "");

    if (record.aetStatus !== "COMPLETED" && (record.aetStatus === "NONE" || !record.fieldVisitJson)) {
      await fetch("/api/employer/nr1/aep", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: record.id, startFieldVisit: true }),
      });
    }

    const refreshed = await fetch("/api/employer/nr1/aep");
    const data = await refreshed.json();
    const r = (data.records as AepRecord[] | undefined)?.find((x) => x.id === record.id);
    setVisit(parseFieldVisit(r?.fieldVisitJson ?? defaultFieldVisit()));
    setRecords(data.records ?? []);

    const photoRes = await fetch(`/api/employer/nr1/aep/${record.id}/photos`);
    const photoData = await photoRes.json();
    setPhotos(photoData.photos ?? []);
  }

  async function saveVisitDraft() {
    if (!visitId || !visit) return;
    setSavingVisit(true);
    setError("");
    const res = await fetch("/api/employer/nr1/aep", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: visitId,
        fieldVisit: {
          taskObserved: visit.taskObserved,
          workerInterview: visit.workerInterview,
          organizationNotes: visit.organizationNotes,
          checklist: visit.checklist,
        },
        aetFindings: findings || undefined,
        aetRecommendations: recommendations || undefined,
      }),
    });
    setSavingVisit(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Erro ao salvar visita.");
      return;
    }
    load();
  }

  async function completeFieldAet() {
    if (!visitId || !visit) return;
    setSavingVisit(true);
    setError("");
    const res = await fetch("/api/employer/nr1/aep", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: visitId,
        fieldVisit: {
          taskObserved: visit.taskObserved,
          workerInterview: visit.workerInterview,
          organizationNotes: visit.organizationNotes,
          checklist: visit.checklist,
        },
        completeFieldAet: {
          evaluatorName: evaluatorName.trim(),
          aetFindings: findings.trim(),
          aetRecommendations: recommendations.trim(),
        },
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSavingVisit(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Não foi possível assinar o relatório.");
      return;
    }
    setVisitId(null);
    setVisit(null);
    load();
  }

  async function uploadPhoto(file: File) {
    if (!visitId) return;
    setUploading(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/employer/nr1/aep/${visitId}/photos`, {
      method: "POST",
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Falha no upload da foto.");
      return;
    }
    if (data.photo) setPhotos((prev) => [...prev, data.photo]);
    setVisit((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        checklist: prev.checklist.map((c) =>
          c.id === "photos" ? { ...c, done: true } : c,
        ),
      };
    });
  }

  async function deletePhoto(key: string) {
    if (!visitId) return;
    const locked = records.find((r) => r.id === visitId)?.aetStatus === "COMPLETED";
    if (locked) return;
    setError("");
    const res = await fetch(
      `/api/employer/nr1/aep/${visitId}/photos?key=${encodeURIComponent(key)}`,
      { method: "DELETE" },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Não foi possível remover a foto.");
      return;
    }
    setPhotos((prev) => prev.filter((p) => p.key !== key));
  }

  function downloadFieldPdf() {
    if (!visitId) return;
    window.open(`/api/employer/nr1/aep/${visitId}/field-pdf`, "_blank");
  }

  async function linkSurvey(id: string, campaignId: string) {
    setError("");
    await fetch("/api/employer/nr1/aep", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, surveyCampaignId: campaignId || null }),
    });
    load();
  }

  async function markCompleted(id: string) {
    setError("");
    const res = await fetch("/api/employer/nr1/aep", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "COMPLETED" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Não foi possível concluir.");
      return;
    }
    load();
  }

  async function markApproved(id: string) {
    if (!approvedByName.trim()) {
      setError("Informe o nome do responsável pela aprovação.");
      return;
    }
    const res = await fetch("/api/employer/nr1/aep", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "APPROVED", approvedByName: approvedByName.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Erro ao aprovar.");
      return;
    }
    load();
  }

  const progress = visit ? fieldVisitProgress(visit) : null;
  const activeRecord = visitId ? records.find((r) => r.id === visitId) : null;
  const visitLocked = activeRecord?.aetStatus === "COMPLETED";

  if (visitId && visit) {
    return (
      <div className="p-4 sm:p-6 max-w-xl mx-auto space-y-5 pb-24">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => { setVisitId(null); setVisit(null); load(); }}
            className="text-sm text-sky-600 hover:underline"
          >
            ← Voltar
          </button>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
            <MapPin size={12} /> {visitLocked ? "Visita assinada" : "Visita em campo"}
          </span>
        </div>

        <div>
          <h1 className="text-xl font-bold text-slate-900">Visita ergonômica no posto</h1>
          <p className="text-sm text-slate-500 mt-1">
            Use no celular durante a observação. Checklist + fotos + relatório assinado.
            Documento de apoio à AEP/AET (NR-17) — não substitui laudo de ergonomista quando a complexidade exigir.
          </p>
          {progress && (
            <p className="text-xs text-slate-600 mt-2">
              Checklist: {progress.done}/{progress.total} ({progress.percent}%)
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <h2 className="font-semibold text-sm">Observação no posto</h2>
          <textarea
            value={visit.taskObserved ?? ""}
            onChange={(e) => setVisit({ ...visit, taskObserved: e.target.value })}
            disabled={visitLocked}
            placeholder="Tarefa observada (o que o trabalhador fazia, ritmos, ferramentas…)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[88px] disabled:bg-slate-50"
          />
          <textarea
            value={visit.workerInterview ?? ""}
            onChange={(e) => setVisit({ ...visit, workerInterview: e.target.value })}
            disabled={visitLocked}
            placeholder="Escuta do trabalhador (queixas, dificuldades, sugestões)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[72px] disabled:bg-slate-50"
          />
          <textarea
            value={visit.organizationNotes ?? ""}
            onChange={(e) => setVisit({ ...visit, organizationNotes: e.target.value })}
            disabled={visitLocked}
            placeholder="Organização do trabalho (metas, pausas, pressão, comunicação)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[64px] disabled:bg-slate-50"
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
          <h2 className="font-semibold text-sm">Checklist de campo</h2>
          {visit.checklist.map((item) => (
            <label key={item.id} className="flex items-start gap-3 text-sm text-slate-700 py-2 border-b border-slate-50 last:border-0">
              <input
                type="checkbox"
                checked={item.done}
                disabled={visitLocked}
                onChange={(e) =>
                  setVisit({
                    ...visit,
                    checklist: visit.checklist.map((c) =>
                      c.id === item.id ? { ...c, done: e.target.checked } : c,
                    ),
                  })
                }
                className="mt-1 h-5 w-5"
              />
              <span>{item.label}</span>
            </label>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Camera size={16} /> Fotos do posto
          </h2>
          {!visitLocked && (
          <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-sky-200 bg-sky-50 px-4 py-6 text-sm font-medium text-sky-800 cursor-pointer">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/*"
              capture="environment"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadPhoto(f);
                e.target.value = "";
              }}
            />
            {uploading ? <Loader2 className="animate-spin" size={18} /> : <Camera size={18} />}
            {uploading ? "Enviando…" : "Tirar / escolher foto"}
          </label>
          )}
          <p className="text-[11px] text-slate-500">
            Preferir JPEG/PNG. Fotos HEIC do iPhone são salvas, mas podem não pré-visualizar em alguns navegadores.
          </p>
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p) => (
                <div key={p.key} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                  {p.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.url} alt={p.caption || "Foto do posto"} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 p-1 text-center">
                      Foto salva (pré-visualização indisponível)
                    </div>
                  )}
                  {!visitLocked && (
                    <button
                      type="button"
                      onClick={() => deletePhoto(p.key)}
                      className="absolute top-1 right-1 rounded-full bg-black/60 text-white p-1"
                      aria-label="Remover foto"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <PenLine size={16} /> Relatório da visita (apoio AEP/AET)
          </h2>
          <textarea
            value={findings}
            onChange={(e) => setFindings(e.target.value)}
            disabled={visitLocked}
            placeholder="Achados técnicos (mín. 20 caracteres)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[88px] disabled:bg-slate-50"
          />
          <textarea
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
            disabled={visitLocked}
            placeholder="Recomendações / plano de adequação (mín. 20 caracteres)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[88px] disabled:bg-slate-50"
          />
          <input
            value={evaluatorName}
            onChange={(e) => setEvaluatorName(e.target.value)}
            disabled={visitLocked}
            placeholder="Nome do avaliador (assinatura)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
          />
          {visitLocked && activeRecord?.evaluatorSignedAt && (
            <p className="text-xs text-emerald-800">
              Assinado por {activeRecord.evaluatorName} em{" "}
              {new Date(activeRecord.evaluatorSignedAt).toLocaleString("pt-BR")}
            </p>
          )}
        </section>

        <div className="fixed bottom-0 inset-x-0 p-4 bg-white/95 border-t border-slate-200 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={downloadFieldPdf}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-300 text-slate-800 text-sm font-medium"
          >
            <FileDown size={16} /> PDF da visita
          </button>
          {!visitLocked && (
            <>
              <button
                type="button"
                disabled={savingVisit}
                onClick={saveVisitDraft}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-300 text-slate-800 text-sm font-medium disabled:opacity-50"
              >
                {savingVisit ? "Salvando…" : "Salvar rascunho"}
              </button>
              <button
                type="button"
                disabled={savingVisit}
                onClick={completeFieldAet}
                className="flex-1 px-4 py-3 rounded-xl bg-emerald-700 text-white text-sm font-medium disabled:opacity-50"
              >
                Assinar relatório da visita
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ergonomia — AEP / AET em campo</h1>
        <p className="text-slate-500 text-sm mt-1">
          Triagem preliminar + visita no posto pelo celular (checklist, fotos e relatório assinado).
          Vincule riscos no{" "}
          <Link href="/empresas/nr1" className="text-sky-600 hover:underline">Inventário NR-1</Link>.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <form onSubmit={createDraft} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="font-semibold">Nova AEP</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <textarea
          value={methodologyRationale}
          onChange={(e) => setMethodologyRationale(e.target.value)}
          placeholder="Racional da metodologia"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[72px]"
        />
        <textarea
          value={workerParticipation}
          onChange={(e) => setWorkerParticipation(e.target.value)}
          placeholder="Participação dos trabalhadores / CIPA"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[72px]"
        />
        <textarea
          value={workstationDescription}
          onChange={(e) => setWorkstationDescription(e.target.value)}
          placeholder="Descrição do(s) posto(s)"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[64px]"
        />

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
          <p className="text-sm font-medium text-slate-800">Triagem semiquantitativa (opcional na criação)</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs text-slate-600 block">
              Repetições / jornada
              <input
                type="number"
                min={0}
                value={repetitions}
                onChange={(e) => setRepetitions(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
              />
            </label>
            <label className="text-xs text-slate-600 block">
              Peso (kg)
              <input
                type="number"
                min={0}
                step="0.1"
                value={loadKg}
                onChange={(e) => setLoadKg(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
              />
            </label>
          </div>
          <div className="grid sm:grid-cols-2 gap-2 text-xs text-slate-700">
            {[
              [armsAbove, setArmsAbove, "Braços acima dos ombros"],
              [trunkFlexion, setTrunkFlexion, "Flexão de tronco"],
              [wristForce, setWristForce, "Punho com força"],
              [vibration, setVibration, "Vibração"],
              [standing, setStanding, "Em pé prolongado"],
              [computer, setComputer, "Posto informatizado"],
            ].map(([checked, setter, label], idx) => (
              <label key={idx} className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked as boolean}
                  onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)}
                />
                {label as string}
              </label>
            ))}
          </div>
        </div>

        <label className="block text-sm text-slate-600">
          Pesquisa vinculada
          <select
            value={surveyCampaignId}
            onChange={(e) => setSurveyCampaignId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Nenhuma</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} — {c.instrument}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium">
          <Plus size={16} /> Iniciar AEP
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <label className="text-xs text-slate-500">Aprovador AEP (nome)</label>
        <input
          value={approvedByName}
          onChange={(e) => setApprovedByName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      {loading ? (
        <Loader2 className="animate-spin text-slate-400" />
      ) : (
        <ul className="space-y-3">
          {records.map((r) => (
            <li key={r.id} className="rounded-xl border border-slate-200 p-4 bg-white space-y-3">
              <div className="flex justify-between gap-4 items-start">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900 flex items-center gap-2 flex-wrap">
                    {r.title} · v{r.version}
                    {(r.status === "COMPLETED" || r.status === "APPROVED") && (
                      <CheckCircle2 size={16} className="text-emerald-600" />
                    )}
                    {r.aetStatus === "COMPLETED" && (
                      <span className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Visita assinada
                      </span>
                    )}
                    {r.aetStatus === "IN_FIELD" && (
                      <span className="text-xs text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
                        Visita em andamento
                      </span>
                    )}
                    {r.recommendAet && r.aetStatus !== "COMPLETED" && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        <AlertTriangle size={12} /> Recomenda visita aprofundada
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    AEP: {r.status} · {r._count.riskEntries} riscos · Visita: {r.aetStatus}
                  </p>
                  {r.evaluatorName && (
                    <p className="text-xs text-slate-600 mt-1">
                      Avaliador: {r.evaluatorName}
                      {r.aetCompletedAt
                        ? ` · ${new Date(r.aetCompletedAt).toLocaleString("pt-BR")}`
                        : ""}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 shrink-0 items-end">
                  <button
                    type="button"
                    onClick={() => openFieldVisit(r)}
                    className="text-sm px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-medium"
                  >
                    {r.aetStatus === "COMPLETED" ? "Ver visita assinada" : "Abrir visita em campo"}
                  </button>
                  {(r.aetStatus === "IN_FIELD" || r.aetStatus === "COMPLETED") && (
                    <a
                      href={`/api/employer/nr1/aep/${r.id}/field-pdf`}
                      className="text-sm text-slate-600 hover:underline inline-flex items-center gap-1"
                    >
                      <FileDown size={14} /> PDF
                    </a>
                  )}
                  {r.status !== "COMPLETED" && r.status !== "APPROVED" && (
                    <button type="button" onClick={() => markCompleted(r.id)} className="text-sm text-sky-600 hover:underline">
                      Concluir AEP
                    </button>
                  )}
                  {r.status === "COMPLETED" && (
                    <button type="button" onClick={() => markApproved(r.id)} className="text-sm text-emerald-600 hover:underline">
                      Aprovar AEP
                    </button>
                  )}
                </div>
              </div>
              <label className="block text-xs text-slate-500">
                Pesquisa vinculada
                <select
                  value={r.surveyCampaignId ?? ""}
                  onChange={(e) => linkSurvey(r.id, e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                >
                  <option value="">Nenhuma</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </label>
            </li>
          ))}
          {records.length === 0 && (
            <p className="text-slate-400 text-sm">Nenhuma AEP registrada.</p>
          )}
        </ul>
      )}
    </div>
  );
}
