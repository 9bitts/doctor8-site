"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, MessageCircle } from "lucide-react";
import {
  MARKETING_LEAD_INTERESTS,
  marketingLeadWhatsAppHref,
  type MarketingLeadInterest,
} from "@/lib/marketing-hub-content";

export default function MarketingLeadForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [company, setCompany] = useState("");
  const [interest, setInterest] = useState<MarketingLeadInterest>("empresas");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/marketing/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          whatsapp,
          company,
          interest,
          message,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        setError(data.error || "Não foi possível enviar. Tente novamente.");
        return;
      }
      setDone(true);
    } catch {
      setError("Falha de conexão. Tente novamente ou use o WhatsApp.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8 text-center">
        <CheckCircle2 className="mx-auto text-emerald-600" size={36} />
        <p className="mt-3 text-lg font-semibold text-slate-900">Interesse registrado</p>
        <p className="mt-1 text-sm text-slate-600">
          Recebemos seus dados. Se preferir falar agora, continue no WhatsApp.
        </p>
        <a
          href={marketingLeadWhatsAppHref(interest, name)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1ebe57] transition"
        >
          <MessageCircle size={18} /> Continuar no WhatsApp
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Nome *</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            placeholder="Seu nome"
            autoComplete="name"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-600">E-mail *</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            placeholder="voce@empresa.com"
            autoComplete="email"
          />
        </label>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs font-medium text-slate-600">WhatsApp</span>
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            placeholder="+55 11 99999-9999"
            autoComplete="tel"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Empresa</span>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            placeholder="Opcional"
            autoComplete="organization"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-medium text-slate-600">Quem é você? *</span>
        <select
          required
          value={interest}
          onChange={(e) => setInterest(e.target.value as MarketingLeadInterest)}
          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        >
          {MARKETING_LEAD_INTERESTS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-medium text-slate-600">Mensagem</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 resize-y"
          placeholder="Conte em uma frase o que você busca"
        />
      </label>

      {error && (
        <p className="text-sm text-rose-600" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition shadow-lg shadow-brand-600/20"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" /> Enviando…
          </>
        ) : (
          "Enviar interesse"
        )}
      </button>
    </form>
  );
}
