"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart, Loader2, Radio, Phone, AlertCircle, Stethoscope,
  Users, Clock, ChevronRight,
} from "lucide-react";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import { HUMANITARIAN_PRIORITY_OPTIONS } from "@/lib/humanitarian";

interface PoolInfo {
  id: string;
  slug: string;
  label: string;
  maxWaiting: number;
  waiting: number;
  volunteersOnline: number;
  volunteersBusy: number;
  isFull: boolean;
}

interface CampaignInfo {
  slug: string;
  name: string;
  description: string | null;
  active: boolean;
}

interface QueueEntry {
  id: string;
  status: string;
  position: number;
  aheadCount: number;
  estimatedWaitMinutes: number;
  onlineVolunteers: number;
  calledAt: string | null;
  expiresAt: string | null;
  meetingUrl: string | null;
  poolLabel: string;
  professionalName: string | null;
}

export default function HumanitarianCampaignPage() {
  const router = useRouter();
  const slug = VENEZUELA_CAMPAIGN_SLUG;
  const pollRef = useRef<NodeJS.Timeout>();

  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<CampaignInfo | null>(null);
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [entry, setEntry] = useState<QueueEntry | null>(null);
  const [joining, setJoining] = useState<string | null>(null);
  const [entering, setEntering] = useState(false);
  const [complaint, setComplaint] = useState("");
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [priority, setPriority] = useState<"ROUTINE" | "URGENT" | "CRISIS">("ROUTINE");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => {
        if (!s?.user) {
          router.push(`/login?callbackUrl=/humanitarian/${slug}`);
          return;
        }
        if (s.user.role !== "PATIENT") {
          router.push("/professional");
          return;
        }
        loadCampaign();
      })
      .catch(() => router.push(`/login?callbackUrl=/humanitarian/${slug}`));

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [router, slug]);

  async function loadCampaign() {
    try {
      const res = await fetch(`/api/humanitarian/campaigns/${slug}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No disponible");
        setLoading(false);
        return;
      }
      setCampaign(data.campaign);
      setPools(data.pools || []);
    } catch {
      setError("Error de conexi?n");
    }
    setLoading(false);
  }

  function startPolling(entryId: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollEntry(entryId);
    pollRef.current = setInterval(() => pollEntry(entryId), 3000);
  }

  async function pollEntry(entryId: string) {
    try {
      const res = await fetch(`/api/humanitarian/queue?entryId=${entryId}`);
      const data = await res.json();
      if (res.ok && data.entry) {
        setEntry(data.entry);
        if (["DONE", "CANCELLED", "NO_SHOW"].includes(data.entry.status)) {
          clearInterval(pollRef.current);
        }
      }
    } catch { /* ignore */ }
  }

  async function joinPool(poolSlug: string) {
    setJoining(poolSlug);
    setError(null);
    try {
      const res = await fetch("/api/humanitarian/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignSlug: slug,
          poolSlug,
          chiefComplaint: complaint.trim() || undefined,
          priority,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || "No se pudo entrar en la fila");
        setJoining(null);
        return;
      }
      setEntry(data.entry);
      setSelectedPool(null);
      startPolling(data.entry.id);
    } catch {
      setError("Error de red");
    }
    setJoining(null);
  }

  async function enterConsultation() {
    if (!entry) return;
    setEntering(true);
    try {
      const res = await fetch("/api/humanitarian/queue/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: entry.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error");
        setEntering(false);
        return;
      }
      window.location.href = `/video/humanitarian/${entry.id}`;
    } catch {
      setError("Error de red");
    }
    setEntering(false);
  }

  async function leaveQueue() {
    if (!entry) return;
    await fetch("/api/humanitarian/queue/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId: entry.id }),
    }).catch(() => {});
    clearInterval(pollRef.current);
    setEntry(null);
    loadCampaign();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 size={28} className="animate-spin text-emerald-400" />
      </div>
    );
  }

  if (entry) {
    if (entry.status === "NO_SHOW" || entry.status === "CANCELLED") {
      return (
        <Screen>
          <AlertCircle size={32} className="text-rose-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Perdiste tu turno</h2>
          <p className="text-slate-400 text-sm mb-6">Puedes volver a unirte a la fila si a?n necesitas atenci?n.</p>
          <button
            type="button"
            onClick={() => { setEntry(null); loadCampaign(); }}
            className="w-full py-3 rounded-xl bg-emerald-500 text-white font-semibold"
          >
            Volver a la fila
          </button>
        </Screen>
      );
    }

    if (entry.status === "CALLED") {
      return (
        <Screen border="emerald">
          <Phone size={32} className="text-emerald-400 mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold text-emerald-300 mb-2">?Es tu turno!</h2>
          {entry.professionalName && (
            <p className="text-slate-300 mb-2">{entry.professionalName}</p>
          )}
          <p className="text-slate-400 text-sm mb-6">Tienes 3 minutos para entrar a la consulta.</p>
          {error && <p className="text-rose-400 text-sm mb-3">{error}</p>}
          <button
            type="button"
            onClick={enterConsultation}
            disabled={entering}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {entering ? <Loader2 size={18} className="animate-spin" /> : <><Phone size={18} /> Entrar ahora</>}
          </button>
        </Screen>
      );
    }

    if (entry.status === "IN_PROGRESS") {
      return (
        <Screen border="blue">
          <Stethoscope size={32} className="text-blue-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-4">Consulta en curso</h2>
          <Link
            href={`/video/humanitarian/${entry.id}`}
            className="w-full py-3 rounded-xl bg-blue-500 text-white font-bold flex items-center justify-center gap-2"
          >
            <Phone size={16} /> Entrar a la sala
          </Link>
        </Screen>
      );
    }

    return (
      <Screen>
        <Radio size={32} className="text-emerald-400 mx-auto mb-4 animate-pulse" />
        <h2 className="text-lg font-bold text-white mb-1">Est?s en la fila</h2>
        <p className="text-slate-400 text-sm mb-6">{entry.poolLabel}</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-3xl font-bold text-emerald-400">{entry.aheadCount + 1}</p>
            <p className="text-xs text-slate-500 mt-1">Tu posici?n</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-3xl font-bold text-slate-200">~{entry.estimatedWaitMinutes}</p>
            <p className="text-xs text-slate-500 mt-1">Minutos estimados</p>
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-4 flex items-center justify-center gap-1">
          <Users size={14} /> {entry.onlineVolunteers} voluntario(s) en l?nea
        </p>
        <p className="text-xs text-slate-500 mb-6">Mant?n esta p?gina abierta. Te avisaremos cuando sea tu turno.</p>
        <button
          type="button"
          onClick={leaveQueue}
          className="text-sm text-slate-500 hover:text-slate-300 underline"
        >
          Salir de la fila
        </button>
      </Screen>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-lg mx-auto px-4 py-8 pb-16">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center">
            <Heart size={24} className="text-rose-400" />
          </div>
          <div>
            <p className="text-xs text-rose-300/80 uppercase tracking-wide font-medium">Atenci?n humanitaria ? Gratis</p>
            <h1 className="text-xl font-bold leading-tight">{campaign?.name || "Venezuela"}</h1>
          </div>
        </div>

        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          {campaign?.description ||
            "Atenci?n m?dica y de salud mental gratuita para personas afectadas por el terremoto. Un voluntario te atender? por teleconsulta."}
        </p>

        {error && (
          <p className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 mb-6">
            {error}
          </p>
        )}

        {!campaign?.active && (
          <p className="text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 mb-6 text-sm">
            La campa?a no est? activa en este momento. Intenta m?s tarde.
          </p>
        )}

        <h2 className="text-sm font-semibold text-slate-300 mb-3">?Qu? tipo de atenci?n necesitas?</h2>
        <div className="space-y-3 mb-8">
          {pools.map((pool) => (
            <button
              key={pool.slug}
              type="button"
              disabled={!campaign?.active || pool.isFull || !!joining}
              onClick={() => setSelectedPool(pool.slug)}
              className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{pool.label}</p>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                    <span className="flex items-center gap-1"><Clock size={12} /> {pool.waiting} en espera</span>
                    <span className="flex items-center gap-1"><Users size={12} /> {pool.volunteersOnline + pool.volunteersBusy} voluntarios</span>
                  </p>
                </div>
                {pool.isFull ? (
                  <span className="text-xs text-rose-400 shrink-0">Fila llena</span>
                ) : (
                  <ChevronRight size={18} className="text-slate-500 shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>

        {selectedPool && campaign?.active && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            <p className="text-sm text-slate-300">
              Unirse a: <strong className="text-white">{pools.find((p) => p.slug === selectedPool)?.label}</strong>
            </p>
            <div>
              <label className="block text-xs text-slate-500 mb-2">Nivel de urgencia</label>
              <div className="space-y-2">
                {HUMANITARIAN_PRIORITY_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      priority === opt.value
                        ? opt.value === "CRISIS"
                          ? "border-rose-400 bg-rose-500/10"
                          : opt.value === "URGENT"
                            ? "border-amber-400 bg-amber-500/10"
                            : "border-emerald-400/50 bg-emerald-500/5"
                        : "border-white/10 bg-slate-900/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={opt.value}
                      checked={priority === opt.value}
                      onChange={() => setPriority(opt.value)}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-medium text-white">{opt.labelEs}</p>
                      <p className="text-xs text-slate-500">{opt.descEs}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Motivo de consulta (opcional)</label>
              <textarea
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                rows={3}
                placeholder="Ej.: ansiedad, dolor, necesito hablar con alguien..."
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
            <button
              type="button"
              onClick={() => joinPool(selectedPool)}
              disabled={!!joining}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {joining === selectedPool ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>Entrar en la fila ? Gratis</>
              )}
            </button>
            <button type="button" onClick={() => setSelectedPool(null)} className="w-full text-sm text-slate-500 hover:text-slate-300">
              Cancelar
            </button>
          </div>
        )}

        <p className="text-center text-xs text-slate-500 mt-6 px-4 leading-relaxed">
          Si tienes una emergencia que pone en riesgo tu vida, busca atencion presencial de urgencia inmediata.
          Este servicio no reemplaza ambulancias ni hospitales.
        </p>
        <p className="text-center text-xs text-slate-600 mt-4">
          Doctor8 - Voluntarios de salud - Sin costo
        </p>
      </div>
    </div>
  );
}

function Screen({
  children,
  border,
}: {
  children: React.ReactNode;
  border?: "emerald" | "blue";
}) {
  const borderClass =
    border === "emerald" ? "border-2 border-emerald-500/50" :
    border === "blue" ? "border-2 border-blue-500/50" :
    "border border-white/10";

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className={`bg-slate-900 rounded-2xl ${borderClass} p-8 max-w-sm w-full text-center`}>
        {children}
      </div>
    </div>
  );
}
