"use client";

import { useState } from "react";
import Link from "next/link";
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
  priceFormatted: string;
};

const CATEGORY_LABEL: Record<string, string> = {
  BLOOD: "Sangue",
  IMAGING: "Imagem",
};

export default function LaboratoriosBuscarClient() {
  const [labName, setLabName] = useState("");
  const [examQ, setExamQ] = useState("");
  const [cep, setCep] = useState("");
  const [loading, setLoading] = useState(false);
  const [networkPublic, setNetworkPublic] = useState<boolean | null>(null);
  const [results, setResults] = useState<LabHit[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [examLoading, setExamLoading] = useState<string | null>(null);
  const [examCache, setExamCache] = useState<Record<string, LabExam[]>>({});

  async function search(e: React.FormEvent) {
    e.preventDefault();
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

    const res = await fetch(`/api/public/laboratory/network/search?${params}`);
    const data = await res.json();
    setNetworkPublic(Boolean(data.networkPublic));
    setResults(data.results ?? []);
    setMessage(data.message ?? (data.results?.length ? null : "Nenhum laboratório encontrado."));
    setLoading(false);
  }

  async function toggleLab(labId: string) {
    if (expandedId === labId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(labId);
    if (examCache[labId]) return;

    setExamLoading(labId);
    const params = new URLSearchParams();
    if (examQ.trim()) params.set("examQ", examQ.trim());
    const res = await fetch(`/api/public/laboratory/network/${labId}/exams?${params}`);
    const data = await res.json();
    if (res.ok) {
      setExamCache((prev) => ({ ...prev, [labId]: data.exams ?? [] }));
    }
    setExamLoading(null);
  }

  function formatAddress(lab: LabHit): string {
    return [
      lab.addressStreet,
      lab.addressNeighborhood,
      lab.addressCity && lab.addressState ? `${lab.addressCity}/${lab.addressState}` : lab.addressCity,
    ].filter(Boolean).join(" · ") || "Endereço não informado";
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-violet-600 font-semibold">Doctor8 Laboratórios</p>
            <h1 className="text-2xl font-bold text-slate-900">Buscar preços na rede</h1>
          </div>
          <Link href="/laboratorios" className="text-sm text-slate-500 hover:text-violet-700">
            Sou laboratório →
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <form onSubmit={search} className="rounded-2xl bg-white border border-slate-200 p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600">Nome do laboratório</label>
            <input
              value={labName}
              onChange={(e) => setLabName(e.target.value)}
              placeholder="Ex.: Lab Diagnóstico"
              className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Exame (opcional)</label>
            <input
              value={examQ}
              onChange={(e) => setExamQ(e.target.value)}
              placeholder="Ex.: hemograma, tomografia"
              className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">CEP (opcional)</label>
            <div className="relative mt-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                placeholder="00000-000"
                className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 text-white font-semibold text-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
            Buscar
          </button>
        </form>

        {networkPublic === false && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            A rede Doctor8 ainda está em expansão na sua região.
          </div>
        )}

        {message && <p className="text-sm text-slate-500 text-center">{message}</p>}

        <div className="space-y-4">
          {results.map((lab) => {
            const expanded = expandedId === lab.laboratoryId;
            const exams = examCache[lab.laboratoryId] ?? [];
            return (
              <article key={lab.laboratoryId} className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleLab(lab.laboratoryId)}
                  className="w-full text-left p-5 hover:bg-slate-50 transition"
                >
                  <div className="flex justify-between gap-2">
                    <div>
                      <h2 className="font-bold text-slate-900">{lab.nomeFantasia}</h2>
                      <p className="text-xs text-violet-600 mt-0.5">
                        {LABORATORY_TYPE_LABELS[lab.labType] ?? lab.labType}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatAddress(lab)}
                        {lab.distanceKm != null ? ` · ${lab.distanceKm.toFixed(1)} km` : ""}
                      </p>
                    </div>
                    {expanded ? <ChevronUp className="text-violet-600" size={18} /> : <ChevronDown className="text-violet-600" size={18} />}
                  </div>
                </button>
                {expanded && (
                  <div className="border-t border-slate-100 px-5 py-3">
                    {examLoading === lab.laboratoryId ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="animate-spin text-slate-400" size={20} />
                      </div>
                    ) : exams.length > 0 ? (
                      <ul className="text-sm space-y-2">
                        {exams.map((exam) => (
                          <li key={exam.itemId} className="flex justify-between gap-2">
                            <span>{exam.name} <span className="text-slate-400">({CATEGORY_LABEL[exam.category]})</span></span>
                            <span className="font-semibold text-violet-700">{exam.priceFormatted}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-2">Nenhum exame publicado.</p>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <p className="text-xs text-slate-400 text-center pb-8">
          Para comparar preços dos exames do seu pedido médico, faça login como paciente em doctor8.org.
        </p>
      </main>
    </div>
  );
}
