"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plug, CheckCircle2, FlaskConical } from "lucide-react";

type Integration = {
  id: string;
  label: string;
  description: string;
  mode: "live" | "demo" | "disabled";
  configured: boolean;
  envKeys: string[];
  demoAvailable: boolean;
  docsPath?: string;
};

export function EmployerIntegrationsSection() {
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    fetch("/api/employer/integrations")
      .then((r) => r.json())
      .then((data) => {
        setIntegrations(data.integrations ?? []);
        setSummary(data.summary?.message ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader2 className="animate-spin text-slate-400" size={20} />;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
      <h2 className="font-semibold text-slate-800 flex items-center gap-2">
        <Plug size={18} className="text-violet-600" />
        Integrações (prontas para contratação)
      </h2>
      <p className="text-sm text-slate-500">{summary}</p>
      <ul className="space-y-3">
        {integrations.map((item) => (
          <li key={item.id} className="rounded-xl border border-slate-100 p-4 text-sm">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div>
                <p className="font-medium text-slate-900 flex items-center gap-2">
                  {item.mode === "live" ? (
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  ) : (
                    <FlaskConical size={16} className="text-amber-600" />
                  )}
                  {item.label}
                </p>
                <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                {item.envKeys.length > 0 && (
                  <p className="text-xs text-slate-400 mt-2 font-mono">
                    {item.envKeys.join(" · ")}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    item.mode === "live"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-800"
                  }`}
                >
                  {item.mode === "live" ? "Produção" : "Demonstração"}
                </span>
                {item.docsPath && (
                  <Link href={item.docsPath} className="text-xs text-sky-600 hover:underline">
                    Abrir módulo →
                  </Link>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
