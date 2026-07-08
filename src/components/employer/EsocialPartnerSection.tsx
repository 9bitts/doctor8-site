"use client";

import { useEffect, useState } from "react";
import { Send, Loader2, FileCode, Download } from "lucide-react";

type Transmission = {
  id: string;
  eventType: string;
  status: string;
  partnerRef: string | null;
  sentAt: string | null;
  createdAt: string;
};

export function EsocialPartnerSection({ examId }: { examId?: string }) {
  const [loading, setLoading] = useState(true);
  const [transmitting, setTransmitting] = useState<string | null>(null);
  const [transmissions, setTransmissions] = useState<Transmission[]>([]);
  const [demoMode, setDemoMode] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/employer/esocial/transmissions");
    const data = await res.json();
    if (res.ok) {
      setTransmissions(data.transmissions ?? []);
      setDemoMode(Boolean(data.demoMode));
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function queueS2220() {
    if (!examId) return;
    setMessage("");
    const res = await fetch("/api/employer/esocial/transmissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "queue_s2220", examId }),
    });
    if (res.ok) {
      setMessage("Evento S-2220 enfileirado (XML pronto para parceiro).");
      load();
    } else {
      setMessage("Não foi possível gerar S-2220 — verifique CPF/matrícula e ASO concluído.");
    }
  }

  async function transmit(id: string) {
    setTransmitting(id);
    const res = await fetch("/api/employer/esocial/transmissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "transmit", transmissionId: id }),
    });
    const data = await res.json();
    setTransmitting(null);
    if (data.status === "SENT_TO_PARTNER" || data.status === "ACCEPTED") {
      setMessage(
        data.demo
          ? `Simulação aceita — ref. ${data.partnerRef} (modo demo)`
          : `Enviado ao parceiro — ref. ${data.partnerRef}`,
      );
    } else {
      setMessage(data.error || "Não foi possível transmitir.");
    }
    load();
  }

  if (loading) return <Loader2 className="animate-spin text-slate-400" size={18} />;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
      <h2 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
        <FileCode size={18} className="text-sky-600" />
        eSocial via parceiro (S-2220 / S-2240)
      </h2>
      <p className="text-xs text-slate-500">
        Gera XML validável S-2220/S-2240. {demoMode
          ? "Modo demonstração: “Enviar” simula aceite local até contratar parceiro eSocial."
          : "Parceiro configurado — transmissão real ao middleware."}
      </p>
      {examId && (
        <button
          type="button"
          onClick={queueS2220}
          className="text-xs px-3 py-1.5 rounded-lg border border-sky-600 text-sky-700 font-medium"
        >
          Enfileirar S-2220 deste exame
        </button>
      )}
      <ul className="space-y-2 max-h-48 overflow-y-auto">
        {transmissions.map((t) => (
          <li key={t.id} className="text-xs border border-slate-100 rounded-lg px-3 py-2 flex justify-between gap-2">
            <span>
              {t.eventType} · <strong>{t.status}</strong>
              {t.partnerRef && ` · ${t.partnerRef}`}
            </span>
            {t.status === "QUEUED" && (
              <button
                type="button"
                disabled={transmitting === t.id}
                onClick={() => transmit(t.id)}
                className="text-sky-600 hover:underline inline-flex items-center gap-1"
              >
                <Send size={12} />
                {transmitting === t.id ? "…" : demoMode ? "Simular envio" : "Enviar"}
              </button>
            )}
            <a
              href={`/api/employer/esocial/transmissions/${t.id}/xml`}
              className="text-slate-500 hover:underline inline-flex items-center gap-1"
            >
              <Download size={12} /> XML
            </a>
          </li>
        ))}
        {transmissions.length === 0 && (
          <li className="text-xs text-slate-400">Nenhuma transmissão na fila.</li>
        )}
      </ul>
      {message && <p className="text-xs text-emerald-700">{message}</p>}
    </section>
  );
}
