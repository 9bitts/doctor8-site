"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { psychologistHubHref } from "@/lib/psychologist-portal";
import {
  ArrowLeft, MessageCircle, Loader2, Send, User, Search, Bot,
} from "lucide-react";

interface Chart { id: string; firstName: string; lastName: string; }
interface ChatMsg { role: "user" | "assistant"; text: string }

export default function PsychologyChartChatClient() {
  const { t, lang } = useI18n();
  const pathname = usePathname();
  const hubHref = psychologistHubHref(pathname);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [charts, setCharts] = useState<Chart[]>([]);
  const [selected, setSelected] = useState<Chart | null>(null);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const [patientQuery, setPatientQuery] = useState("");

  useEffect(() => {
    fetch("/api/professional/records")
      .then((r) => r.json())
      .then((d) => setCharts(d.records || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filtered = patientQuery.trim()
    ? charts.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(patientQuery.toLowerCase()))
    : charts.slice(0, 8);

  async function ask() {
    if (!selected || !query.trim()) return;
    setAsking(true);
    setError("");
    const q = query.trim();
    setMessages((m) => [...m, { role: "user", text: q }]);
    setQuery("");
    try {
      const res = await fetch("/api/professional/psychology/chart-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientRecordId: selected.id,
          question: q,
          lang,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "PSYCHOLOGY_PLAN_REQUIRED") setError(t("psy.plans.upgradeRequired"));
        else setError(t("psy.chartChat.error"));
        return;
      }
      setMessages((m) => [...m, { role: "assistant", text: data.answer }]);
    } catch {
      setError(t("psy.chartChat.error"));
    } finally { setAsking(false); }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      <div>
        <Link href={hubHref} className="flex items-center gap-2 text-sm text-slate-500 hover:text-violet-600 font-medium mb-2">
          <ArrowLeft size={16} /> {t("psy.backToHub")}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <MessageCircle size={24} className="text-violet-600" />
          {t("psy.mod.chartChat.title")}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{t("psy.mod.chartChat.desc")}</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <label className="text-sm font-semibold text-slate-700">{t("psy.chartChat.selectPatient")}</label>
        {selected ? (
          <div className="flex items-center gap-2 text-sm font-medium">
            <User size={16} className="text-violet-500" />
            {selected.firstName} {selected.lastName}
            <button type="button" onClick={() => { setSelected(null); setMessages([]); }} className="text-xs text-slate-400 ml-auto">
              {t("common.cancel")}
            </button>
          </div>
        ) : loading ? (
          <Loader2 className="animate-spin text-violet-500" size={20} />
        ) : (
          <>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={patientQuery}
                onChange={(e) => setPatientQuery(e.target.value)}
                placeholder={t("psy.sessions.searchPatient")}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelected(c)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-violet-50 text-sm"
                >
                  {c.firstName} {c.lastName}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {selected && (
        <div className="bg-white rounded-2xl border border-slate-200 flex flex-col min-h-[360px]">
          <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[400px]">
            {messages.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">{t("psy.chartChat.empty")}</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && <Bot size={18} className="text-violet-500 shrink-0 mt-1" />}
                <div className={`rounded-2xl px-4 py-2 text-sm max-w-[85%] whitespace-pre-wrap ${
                  m.role === "user" ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-800"
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          {error && <p className="text-sm text-rose-600 px-4">{error}</p>}
          <div className="border-t border-slate-100 p-3 flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !asking && ask()}
              placeholder={t("psy.chartChat.placeholder")}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
            <button
              type="button"
              onClick={ask}
              disabled={asking || !query.trim()}
              className="px-4 py-2 bg-violet-600 text-white rounded-xl disabled:opacity-50"
            >
              {asking ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
          <p className="text-[11px] text-amber-700 bg-amber-50 px-4 py-2">{t("rec.aiDisclaimer")}</p>
        </div>
      )}
    </div>
  );
}
