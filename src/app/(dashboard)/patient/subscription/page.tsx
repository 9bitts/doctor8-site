"use client";

// Club Doctor - subscribe, stamp card, cancel.

import { useState, useEffect } from "react";
import { Check, Loader2, ShieldCheck, Sparkles, X, Stamp } from "lucide-react";

interface SubInfo {
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

interface StampInfo {
  balance: number;
  stampsToFreeMonth: number;
  readyForFreeMonth: boolean;
  kindsInWindowLabels: string[];
  kindsNeededForBonus: number;
  stampsForFreeMonth: number;
}

const ACTIVE = ["active", "trialing"];

export default function SubscriptionPage() {
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [stamps, setStamps] = useState<StampInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [subRes, stampRes] = await Promise.all([
        fetch("/api/payments/subscription"),
        fetch("/api/patient/club-stamps"),
      ]);
      const subData = await subRes.json();
      const stampData = stampRes.ok ? await stampRes.json() : null;
      setSub(subData.subscription || null);
      setStamps(stampData);
    } catch {
      setSub(null);
      setStamps(null);
    } finally {
      setLoading(false);
    }
  }

  async function subscribe() {
    setWorking(true);
    setMsg("");
    try {
      const res = await fetch("/api/payments/subscription", { method: "POST" });
      const d = await res.json();
      if (d.checkoutUrl) {
        window.location.href = d.checkoutUrl;
      } else {
        setMsg(d.error || "Nao foi possivel iniciar o checkout.");
        setWorking(false);
      }
    } catch {
      setMsg("Erro de conexao. Tente novamente.");
      setWorking(false);
    }
  }

  async function cancel() {
    if (!confirm("Cancelar o Club Doctor? Voce mantem os beneficios ate o fim do periodo atual.")) return;
    setWorking(true);
    setMsg("");
    try {
      const res = await fetch("/api/payments/subscription", { method: "DELETE" });
      const d = await res.json();
      if (res.ok) {
        setMsg("Seu Club Doctor sera cancelado ao fim do periodo atual.");
        await load();
      } else {
        setMsg(d.error || "Nao foi possivel cancelar.");
      }
    } catch {
      setMsg("Erro de conexao.");
    } finally {
      setWorking(false);
    }
  }

  const isActive = sub && ACTIVE.includes(sub.status);
  const stampCount = stamps?.balance ?? 0;
  const target = stamps?.stampsForFreeMonth ?? 10;

  const benefits = [
    "Cartao fidelidade: carimbos viram mensalidade gratis",
    "Acesso a plataforma Doctor8 e todos os servicos",
    "Clube de compras coletivas",
    "Descontos em medicamentos e exames (parceiros)",
    "Conteudos educativos e suporte tecnico",
    "Consultas cobradas pelo valor do profissional, sem desconto automatico",
  ];

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-16 flex justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={28} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Club Doctor</h1>
        <p className="text-slate-500 mt-1">
          Mensalidade + cartao fidelidade. Acumule carimbos e ganhe meses gratis no Club.
        </p>
      </div>

      {msg && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-xl px-4 py-3">
          {msg}
        </div>
      )}

      {/* Stamp card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Stamp size={18} className="text-emerald-600" /> Seus carimbos
          </h2>
          <span className="text-2xl font-bold text-emerald-600">
            {stampCount} <span className="text-sm font-normal text-slate-400">/ {target}</span>
          </span>
        </div>

        <div className="flex gap-1.5 flex-wrap mb-4">
          {Array.from({ length: target }).map((_, i) => (
            <div
              key={i}
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                i < stampCount
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : "border-slate-200 text-slate-300"
              }`}
            >
              {i < stampCount ? <Check size={14} /> : i + 1}
            </div>
          ))}
        </div>

        {stamps?.readyForFreeMonth ? (
          <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
            Voce tem {stampCount} carimbos! A proxima mensalidade do Club sera gratuita automaticamente.
          </p>
        ) : (
          <p className="text-sm text-slate-500">
            Faltam <strong>{stamps?.stampsToFreeMonth ?? target}</strong> carimbos para a proxima mensalidade gratis.
          </p>
        )}

        <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-1">
          <p><strong>+1</strong> cada consulta paga e concluida (qualquer profissional)</p>
          <p><strong>+1</strong> cada mensalidade Club paga</p>
          <p>
            <strong>+1 bonus</strong> ao consultar 3 tipos diferentes de profissional em 12 meses
            {stamps && stamps.kindsNeededForBonus > 0 && (
              <> (faltam {stamps.kindsNeededForBonus})</>
            )}
          </p>
          {stamps && stamps.kindsInWindowLabels.length > 0 && (
            <p className="text-slate-400">
              Tipos ja consultados: {stamps.kindsInWindowLabels.join(", ")}
            </p>
          )}
          <p className="text-slate-400">Carimbos nao expiram. Credito so na mensalidade, nunca em consultas.</p>
        </div>
      </div>

      {isActive ? (
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-8 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={20} />
            <span className="text-sm font-semibold uppercase tracking-wide">
              {sub!.cancelAtPeriodEnd ? "Ativo - cancelando" : "Membro ativo"}
            </span>
          </div>
          <p className="text-3xl font-bold mb-2">Club Doctor</p>
          <p className="text-emerald-50 text-sm">
            {sub!.cancelAtPeriodEnd
              ? `Beneficios ate ${
                  sub!.currentPeriodEnd
                    ? new Date(sub!.currentPeriodEnd).toLocaleDateString("pt-BR")
                    : "o fim do periodo"
                }.`
              : sub!.currentPeriodEnd
              ? `Renova em ${new Date(sub!.currentPeriodEnd).toLocaleDateString("pt-BR")}`
              : "Assinatura ativa"}
          </p>

          {!sub!.cancelAtPeriodEnd && (
            <button
              onClick={cancel}
              disabled={working}
              className="mt-6 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition flex items-center gap-2"
            >
              {working ? <Loader2 className="animate-spin" size={15} /> : <X size={15} />}
              Cancelar assinatura
            </button>
          )}
        </div>
      ) : (
        <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-1 text-emerald-400">
            <Sparkles size={18} />
            <span className="text-sm font-semibold uppercase tracking-wide">Assinatura</span>
          </div>
          <div className="flex items-end gap-1 mb-1">
            <span className="text-4xl font-bold">$10</span>
            <span className="text-slate-400 mb-1">/mes</span>
          </div>
          <p className="text-slate-400 text-sm mb-6">Cancele quando quiser. Cobranca mensal em USD.</p>

          <button
            onClick={subscribe}
            disabled={working}
            className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-6 py-3 rounded-xl transition flex items-center gap-2 w-full justify-center"
          >
            {working ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
            Entrar no Club Doctor
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="font-semibold text-slate-800 mb-4">O que esta incluso</h2>
        <ul className="space-y-3">
          {benefits.map((b) => (
            <li key={b} className="flex items-start gap-3 text-sm text-slate-700">
              <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                <Check size={12} className="text-emerald-600" />
              </span>
              {b}
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-400 mt-5">
          O Club Doctor nao e plano de saude. Consultas sao cobradas pelo valor definido pelo profissional.
        </p>
      </div>
    </div>
  );
}
