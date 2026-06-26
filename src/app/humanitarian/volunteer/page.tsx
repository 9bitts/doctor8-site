"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart, Loader2, Power, PowerOff, Phone, Users, Radio,
  CheckCircle2, AlertCircle,
} from "lucide-react";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";

interface PoolRow {
  id: string;
  slug: string;
  labelEs: string;
  waiting: number;
  volunteersOnline: number;
  myStatus: string;
  volunteerId: string | null;
}

interface CurrentEntry {
  id: string;
  status: string;
  chiefComplaint: string | null;
  meetingUrl: string | null;
  patientName: string;
  calledAt: string | null;
  expiresAt: string | null;
}

export default function HumanitarianVolunteerPage() {
  const router = useRouter();
  const pollRef = useRef<NodeJS.Timeout>();

  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<{ name: string; active: boolean } | null>(null);
  const [pools, setPools] = useState<PoolRow[]>([]);
  const [currentEntry, setCurrentEntry] = useState<CurrentEntry | null>(null);
  const [activePoolSlug, setActivePoolSlug] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => {
        if (!s?.user) {
          router.push(`/login?callbackUrl=/humanitarian/volunteer`);
          return;
        }
        if (!["PROFESSIONAL", "PSYCHOANALYST"].includes(s.user.role)) {
          router.push("/patient");
          return;
        }
        load();
      });
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [router]);

  async function load() {
    try {
      const res = await fetch(
        `/api/humanitarian/volunteer?campaignSlug=${VENEZUELA_CAMPAIGN_SLUG}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error");
        setLoading(false);
        return;
      }
      setCampaign(data.campaign);
      setPools(data.pools || []);
      setCurrentEntry(data.currentEntry);
      setActivePoolSlug(data.activeVolunteer?.poolSlug ?? null);

      if (data.activeVolunteer?.status === "ONLINE" || data.activeVolunteer?.status === "BUSY") {
        startPolling();
      }
    } catch {
      setError("Error de conexi?n");
    }
    setLoading(false);
  }

  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => load(), 4000);
  }

  async function togglePool(poolSlug: string, goOnline: boolean) {
    setToggling(poolSlug);
    setError(null);
    try {
      const res = await fetch("/api/humanitarian/volunteer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: goOnline ? "ONLINE" : "OFFLINE",
          campaignSlug: VENEZUELA_CAMPAIGN_SLUG,
          poolSlug,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Error");
        setToggling(null);
        return;
      }
      await load();
      if (goOnline) startPolling();
      else if (pollRef.current) clearInterval(pollRef.current);
    } catch {
      setError("Error de red");
    }
    setToggling(null);
  }

  async function completeConsultation() {
    if (!currentEntry) return;
    setCompleting(true);
    try {
      await fetch("/api/humanitarian/queue/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: currentEntry.id }),
      });
      setCurrentEntry(null);
      await load();
    } catch {
      setError("Error al finalizar");
    }
    setCompleting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 size={24} className="animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-rose-100 flex items-center justify-center">
          <Heart size={22} className="text-rose-500" />
        </div>
        <div>
          <p className="text-xs text-rose-600 font-medium uppercase tracking-wide">Voluntariado humanitario</p>
          <h1 className="text-xl font-bold text-slate-900">{campaign?.name || "Venezuela"}</h1>
        </div>
      </div>

      <p className="text-sm text-slate-600 leading-relaxed">
        Entra en linea en la fila de tu especialidad. Los pacientes seran asignados automaticamente cuando estes disponible.
      </p>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-900 space-y-2">
        <p className="font-semibold">Guia para voluntarios</p>
        <ul className="list-disc list-inside space-y-1 text-blue-800 text-xs sm:text-sm">
          <li>Atencion 100% gratuita ? no cobres al paciente.</li>
          <li>Al finalizar, haz clic en Finalizar y siguiente para recibir al proximo.</li>
          <li>Los casos de crisis tienen prioridad en la fila.</li>
          <li>Si no puedes continuar, sal de la fila para liberar tu lugar.</li>
          <li>En emergencia vital presencial, orienta al paciente a buscar urgencias locales.</li>
        </ul>
      </div>

      {error && (
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
        </p>
      )}

      {currentEntry && ["CALLED", "IN_PROGRESS"].includes(currentEntry.status) && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-emerald-800 font-semibold">
            <Radio size={18} className="animate-pulse" />
            Paciente asignado
          </div>
          <p className="text-lg font-bold text-slate-900">{currentEntry.patientName}</p>
          {currentEntry.chiefComplaint && (
            <p className="text-sm text-slate-600 bg-white rounded-xl p-3 border border-slate-100">
              {currentEntry.chiefComplaint}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href={`/video/humanitarian/${currentEntry.id}`}
              className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm flex items-center justify-center gap-2"
            >
              <Phone size={16} /> Entrar a la consulta
            </Link>
            <button
              type="button"
              onClick={completeConsultation}
              disabled={completing}
              className="flex-1 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {completing ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle2 size={16} /> Finalizar y siguiente</>}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">Filas disponibles para ti</h2>
        {pools.length === 0 && (
          <p className="text-sm text-slate-500">Ninguna fila coincide con tu perfil profesional.</p>
        )}
        {pools.map((pool) => {
          const isOnline = pool.myStatus === "ONLINE" || pool.myStatus === "BUSY";
          const isBusy = pool.myStatus === "BUSY";
          return (
            <div key={pool.slug} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{pool.labelEs}</p>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                    <span className="flex items-center gap-1"><Users size={12} /> {pool.waiting} esperando</span>
                    <span>{pool.volunteersOnline} voluntarios en l?nea</span>
                  </p>
                  {isOnline && (
                    <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      {isBusy ? "En consulta" : "En l?nea ? recibiendo pacientes"}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={!!toggling || (isBusy && isOnline)}
                  onClick={() => togglePool(pool.slug, !isOnline)}
                  className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition disabled:opacity-50 ${
                    isOnline
                      ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      : "bg-emerald-500 text-white hover:bg-emerald-600"
                  }`}
                >
                  {toggling === pool.slug ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : isOnline ? (
                    <><PowerOff size={16} /> Salir</>
                  ) : (
                    <><Power size={16} /> Entrar en l?nea</>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {activePoolSlug && !currentEntry && (
        <p className="text-sm text-slate-500 text-center flex items-center justify-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Esperando pr?ximo paciente...
        </p>
      )}
    </div>
  );
}
