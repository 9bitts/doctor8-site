"use client";

import {
  Clock,
  Users,
  Stethoscope,
  Radio,
} from "lucide-react";

interface LiveQueue {
  status: string;
  position: number;
  aheadCount: number;
  estimatedWaitMinutes: number;
  onlineVolunteers: number;
  poolLabel: string;
  professionalName: string | null;
}

interface LiveConsult {
  kind: "humanitarian" | "appointment";
  professionalName: string | null;
  specialty: string | null;
  startedAt: string;
  durationMinutes: number;
}

export default function PatientLiveStatusPanel({
  activeQueue,
  liveConsult,
}: {
  activeQueue: LiveQueue | null;
  liveConsult: LiveConsult | null;
}) {
  if (!activeQueue && !liveConsult) return null;

  if (liveConsult) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
          <Stethoscope size={16} />
          Em atendimento agora
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-emerald-600 uppercase font-semibold">Profissional</p>
            <p className="text-slate-800 font-medium">
              {liveConsult.professionalName ?? "\u2014"}
            </p>
          </div>
          <div>
            <p className="text-xs text-emerald-600 uppercase font-semibold">Especialidade</p>
            <p className="text-slate-800">{liveConsult.specialty ?? "\u2014"}</p>
          </div>
          <div>
            <p className="text-xs text-emerald-600 uppercase font-semibold">Inicio</p>
            <p className="text-slate-800">
              {new Date(liveConsult.startedAt).toLocaleString("pt-BR")}
            </p>
          </div>
          <div>
            <p className="text-xs text-emerald-600 uppercase font-semibold">Duracao</p>
            <p className="text-slate-800 flex items-center gap-1">
              <Clock size={14} /> {liveConsult.durationMinutes} min
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (activeQueue && ["WAITING", "CALLED"].includes(activeQueue.status)) {
    return (
      <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-brand-700 font-semibold text-sm">
          <Radio size={16} />
          Na fila agora
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-brand-600 uppercase font-semibold">Posicao</p>
            <p className="text-xl font-bold text-slate-800">{activeQueue.position}</p>
          </div>
          <div>
            <p className="text-xs text-brand-600 uppercase font-semibold">A frente</p>
            <p className="text-xl font-bold text-slate-800">{activeQueue.aheadCount}</p>
          </div>
          <div>
            <p className="text-xs text-brand-600 uppercase font-semibold">Espera est.</p>
            <p className="text-xl font-bold text-slate-800">
              {activeQueue.estimatedWaitMinutes} min
            </p>
          </div>
          <div>
            <p className="text-xs text-brand-600 uppercase font-semibold">Voluntarios</p>
            <p className="text-xl font-bold text-slate-800 flex items-center gap-1">
              <Users size={16} /> {activeQueue.onlineVolunteers}
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-600">
          Especialidade: <strong>{activeQueue.poolLabel}</strong>
          {activeQueue.status === "CALLED" && activeQueue.professionalName && (
            <> &middot; Chamado por {activeQueue.professionalName}</>
          )}
        </p>
      </div>
    );
  }

  return null;
}
