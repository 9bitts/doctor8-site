"use client";

import { useEffect, useState } from "react";
import { BookOpen, Loader2 } from "lucide-react";

type TrailStat = { contentId: string; title: string; views: number };

export default function ConteudoPage() {
  const [loading, setLoading] = useState(true);
  const [totalViews, setTotalViews] = useState(0);
  const [catalogSize, setCatalogSize] = useState(0);
  const [topTrails, setTopTrails] = useState<TrailStat[]>([]);

  useEffect(() => {
    fetch("/api/employer/content-trails")
      .then((r) => r.json())
      .then((data) => {
        setTotalViews(data.totalViewsLast30Days ?? 0);
        setCatalogSize(data.catalogSize ?? 0);
        setTopTrails(data.topTrails ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-sky-500" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="text-sky-600" size={24} />
          Conteúdo de bem-estar
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Trilhas psicoeducativas disponíveis aos colaboradores — engajamento agregado e anônimo.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500 uppercase">Visualizações (30 dias)</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{totalViews}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500 uppercase">Trilhas no catálogo</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{catalogSize}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
        <h2 className="font-semibold text-slate-900">Mais acessados</h2>
        {topTrails.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma visualização registrada ainda. Colaboradores veem trilhas no portal EAP.</p>
        ) : (
          <ul className="space-y-2">
            {topTrails.map((t) => (
              <li key={t.contentId} className="flex justify-between text-sm border-b border-slate-50 pb-2">
                <span className="text-slate-800">{t.title}</span>
                <span className="text-slate-400">{t.views} views</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
