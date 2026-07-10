"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Loader2,
  MapPin,
  Search,
} from "lucide-react";
import { LABORATORY_TYPE_LABELS } from "@/lib/laboratory-portal";

type LabHit = {
  laboratoryId: string;
  nomeFantasia: string;
  labType: string;
  addressStreet: string | null;
  addressNeighborhood: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  distanceKm: number | null;
  examCount: number;
  matchedExamCount: number;
};

type LabExam = {
  itemId: string;
  name: string;
  category: string;
  code: string | null;
  priceCents: number;
  priceFormatted: string;
};

const CATEGORY_LABEL: Record<string, string> = {
  BLOOD: "Sangue",
  IMAGING: "Imagem",
};

type Props = {
  /** Exam names from doctor request — used to rank labs and highlight prices */
  highlightExamNames?: string[];
  compact?: boolean;
};

export default function PatientLaboratorySearchPanel({
  highlightExamNames = [],
  compact = false,
}: Props) {
  const [labName, setLabName] = useState("");
  const [examQ, setExamQ] = useState("");
  const [cep, setCep] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LabHit[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [examLoading, setExamLoading] = useState<string | null>(null);
  const [examCache, setExamCache] = useState<Record<string, LabExam[]>>({});

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setMessage(null);
    setExpandedId(null);

    const params = new URLSearchParams();
    if (labName.trim()) params.set("labName", labName.trim());
    if (examQ.trim()) params.set("examQ", examQ.trim());
    const cepDigits = cep.replace(/\D/g, "");
    if (cepDigits.length === 8 && !/^0+$/.test(cepDigits)) {
      params.set("cep", cepDigits);
    }
    if (highlightExamNames.length > 0) {
      params.set("examNames", highlightExamNames.join("|"));
    }

    try {
      const res = await fetch(`/api/patient/laboratory/network/search?${params}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setMessage(data.message ?? (data.results?.length ? null : "Nenhum laboratório encontrado."));
    } finally {
      setLoading(false);
    }
  }

  async function toggleLab(labId: string) {
    if (expandedId === labId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(labId);

    if (examCache[labId]) return;

    setExamLoading(labId);
    try {
      const params = new URLSearchParams();
      if (examQ.trim()) params.set("examQ", examQ.trim());
      if (highlightExamNames.length > 0) {
        params.set("examNames", highlightExamNames.join("|"));
      }
      const res = await fetch(`/api/patient/laboratory/network/${labId}/exams?${params}`);
      const data = await res.json();
      if (res.ok) {
        setExamCache((prev) => ({ ...prev, [labId]: data.exams ?? [] }));
      }
    } finally {
      setExamLoading(null);
    }
  }

  function formatAddress(lab: LabHit): string {
    const parts = [
      lab.addressStreet,
      lab.addressNeighborhood,
      lab.addressCity && lab.addressState ? `${lab.addressCity}/${lab.addressState}` : lab.addressCity,
      lab.addressZip,
    ].filter(Boolean);
    return parts.join(" · ") || "Endereço não informado";
  }

  return (
    <section className={`rounded-2xl border border-violet-200 bg-violet-50/40 ${compact ? "p-4" : "p-6"} space-y-4`}>
      <div>
        <h2 className={`font-bold text-slate-900 flex items-center gap-2 ${compact ? "text-base" : "text-lg"}`}>
          <FlaskConical size={compact ? 18 : 20} className="text-violet-600" />
          Buscar laboratórios na rede Doctor8
        </h2>
        {!compact && (
          <p className="text-sm text-slate-600 mt-1">
            Pesquise por nome do laboratório ou CEP. Clique no resultado para ver a tabela de preços.
          </p>
        )}
        {highlightExamNames.length > 0 && (
          <p className="text-xs text-violet-700 mt-2">
            Priorizando laboratórios com exames do seu pedido médico ({highlightExamNames.length} item
            {highlightExamNames.length > 1 ? "s" : ""}).
          </p>
        )}
      </div>

      <form onSubmit={search} className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-600">Nome do laboratório</label>
          <input
            value={labName}
            onChange={(e) => setLabName(e.target.value)}
            placeholder="Ex.: Lab São Lucas"
            className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Nome do exame (opcional)</label>
          <input
            value={examQ}
            onChange={(e) => setExamQ(e.target.value)}
            placeholder="Ex.: hemograma, raio-x"
            className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-slate-600">CEP (proximidade)</label>
          <div className="relative mt-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={cep}
              onChange={(e) => setCep(e.target.value)}
              placeholder="00000-000"
              className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white"
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 text-white font-semibold text-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
            Buscar laboratórios
          </button>
        </div>
      </form>

      {message && (
        <p className="text-sm text-slate-500 text-center">{message}</p>
      )}

      <div className="space-y-3">
        {results.map((lab) => {
          const expanded = expandedId === lab.laboratoryId;
          const exams = examCache[lab.laboratoryId] ?? [];
          const isLoadingExams = examLoading === lab.laboratoryId;

          return (
            <article
              key={lab.laboratoryId}
              className="rounded-xl bg-white border border-slate-200 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleLab(lab.laboratoryId)}
                className="w-full text-left p-4 hover:bg-slate-50 transition flex items-start justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900">{lab.nomeFantasia}</p>
                  <p className="text-xs text-violet-600 mt-0.5">
                    {LABORATORY_TYPE_LABELS[lab.labType] ?? lab.labType}
                    {" · "}{lab.examCount} exame{lab.examCount !== 1 ? "s" : ""} publicados
                    {lab.matchedExamCount > 0 && (
                      <span className="text-emerald-600">
                        {" · "}{lab.matchedExamCount} do seu pedido
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{formatAddress(lab)}</p>
                  {lab.distanceKm != null && (
                    <p className="text-xs text-slate-400 mt-0.5">{lab.distanceKm.toFixed(1)} km de distância</p>
                  )}
                </div>
                <span className="text-violet-600 shrink-0 mt-1">
                  {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </span>
              </button>

              {expanded && (
                <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50">
                  {isLoadingExams ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="animate-spin text-slate-400" size={22} />
                    </div>
                  ) : exams.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4 text-center">
                      {lab.examCount === 0
                        ? "Este laboratório ainda não publicou exames na rede Doctor8."
                        : "Nenhum exame publicado com estes filtros."}
                    </p>
                  ) : (
                    <ul className="space-y-2 max-h-72 overflow-y-auto">
                      {exams.map((exam) => (
                        <li
                          key={exam.itemId}
                          className="flex items-start justify-between gap-3 text-sm py-1.5 border-b border-slate-100 last:border-0"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800">{exam.name}</p>
                            <p className="text-xs text-slate-500">
                              {CATEGORY_LABEL[exam.category] ?? exam.category}
                              {exam.code ? ` · Cód. ${exam.code}` : ""}
                            </p>
                          </div>
                          <p className="font-bold text-violet-700 shrink-0">{exam.priceFormatted}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
