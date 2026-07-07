"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Shield, Loader2 } from "lucide-react";

export default function PublicDenunciaPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [categories, setCategories] = useState<{ id: string; label: string }[]>([]);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [protocol, setProtocol] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/public/employer/whistleblower?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setCompanyName(data.companyName);
          setCategories(data.categories ?? []);
          if (data.categories?.[0]) setCategory(data.categories[0].id);
        }
        setLoading(false);
      });
  }, [slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/public/employer/whistleblower", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, category, description }),
    });
    const data = await res.json();
    if (res.ok) setProtocol(data.protocolCode);
    else setError(data.error || "Erro ao registrar");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-sky-600" />
      </div>
    );
  }

  if (protocol) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900">
        <div className="max-w-md w-full rounded-2xl bg-white p-8 text-center">
          <Shield className="mx-auto text-sky-600 mb-4" size={36} />
          <h1 className="text-xl font-bold text-slate-900">Denúncia registrada</h1>
          <p className="text-sm text-slate-600 mt-2">Guarde o protocolo:</p>
          <p className="text-lg font-mono font-bold text-sky-700 mt-3">{protocol}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl">
        <div className="flex items-center gap-2 text-sky-700 mb-2">
          <Shield size={20} />
          <span className="font-semibold">Canal de denúncia</span>
        </div>
        <p className="text-sm text-slate-500 mb-6">{companyName} — registro anônimo</p>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <textarea
            required
            minLength={10}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva os fatos com o máximo de detalhe possível (sem identificar-se, se preferir)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[140px]"
          />
          <button type="submit" className="w-full py-3 rounded-xl bg-sky-600 text-white font-semibold">
            Enviar denúncia
          </button>
        </form>
        <p className="text-xs text-slate-400 mt-4 leading-relaxed">
          Este canal complementa o PGR/NR-1. Retaliação contra denunciantes é proibida por lei.
        </p>
      </div>
    </div>
  );
}
