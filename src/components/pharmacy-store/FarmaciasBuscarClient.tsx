"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MapPin, Pill, Search } from "lucide-react";

type SearchResult = {
  storeId: string;
  nomeFantasia: string;
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  distanceKm: number | null;
  acceptsPickup: boolean;
  acceptsDelivery: boolean;
  coveragePercent: number;
  subtotalFormatted: string;
  items: { name: string; presentation: string; priceFormatted: string }[];
};

export default function FarmaciasBuscarClient() {
  const [q, setQ] = useState("");
  const [cep, setCep] = useState("");
  const [loading, setLoading] = useState(false);
  const [networkPublic, setNetworkPublic] = useState<boolean | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const params = new URLSearchParams({ q: q.trim() });
    if (cep.trim()) params.set("cep", cep.replace(/\D/g, ""));
    const res = await fetch(`/api/public/pharmacy/network/search?${params}`);
    const data = await res.json();
    setNetworkPublic(Boolean(data.networkPublic));
    setResults(data.results ?? []);
    setMessage(data.message ?? (data.results?.length ? null : "Nenhuma farmácia com este medicamento na região."));
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-emerald-600 font-semibold">Doctor8 Farmácias</p>
            <h1 className="text-2xl font-bold text-slate-900">Buscar preços na rede</h1>
          </div>
          <Link href="/farmacias" className="text-sm text-slate-500 hover:text-emerald-700">
            Sou farmácia →
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <form onSubmit={search} className="rounded-2xl bg-white border border-slate-200 p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600">Medicamento</label>
            <div className="relative mt-1">
              <Pill className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ex.: dipirona, losartana 50mg"
                required
                minLength={2}
                className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm"
              />
            </div>
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
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
            Buscar
          </button>
        </form>

        {networkPublic === false && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            A rede Doctor8 ainda está em expansão na sua região. Os resultados abaixo são informativos para farmácias parceiras.
          </div>
        )}

        {message && (
          <p className="text-sm text-slate-500 text-center">{message}</p>
        )}

        <div className="space-y-4">
          {results.map((r) => (
            <article key={r.storeId} className="rounded-2xl bg-white border border-slate-200 p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-bold text-slate-900">{r.nomeFantasia}</h2>
                  <p className="text-xs text-slate-500">
                    {[r.neighborhood, r.city, r.state].filter(Boolean).join(" · ")}
                    {r.distanceKm != null ? ` · ${r.distanceKm.toFixed(1)} km` : ""}
                  </p>
                </div>
                <p className="text-lg font-bold text-emerald-600">{r.subtotalFormatted}</p>
              </div>
              <ul className="text-sm text-slate-600 space-y-1">
                {r.items.map((item, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span>{item.name} {item.presentation ? `· ${item.presentation}` : ""}</span>
                    <span className="font-medium">{item.priceFormatted}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-400">
                {r.acceptsPickup ? "Retirada" : ""}
                {r.acceptsPickup && r.acceptsDelivery ? " · " : ""}
                {r.acceptsDelivery ? "Entrega" : ""}
                {" · "}Cobertura {r.coveragePercent}%
              </p>
            </article>
          ))}
        </div>

        <p className="text-xs text-slate-400 text-center pb-8">
          Para comprar com receita digital, faça login como paciente em doctor8.org.
        </p>
      </main>
    </div>
  );
}
