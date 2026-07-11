"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ShieldCheck, Pill, CheckCircle2 } from "lucide-react";
import {
  MN_ITEM_KIND_LABELS_PT,
  type PrescriptionMedicationLine,
} from "@/lib/pharmacy/prescription-medication-lines";

type RxData = {
  token: string;
  status: string;
  prescription: {
    id: string;
    patientName: string;
    doctor: string | null;
    medications: unknown;
    validUntil: string | null;
    signatureStatus: string | null;
  };
};

export default function PharmacyValidateClient({ token }: { token: string }) {
  const [data, setData] = useState<RxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dispensing, setDispensing] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/pharmacy-store/prescriptions/validate?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
        if (d.status === "DISPENSED") setDone(true);
      })
      .catch(() => setError("Erro ao carregar"))
      .finally(() => setLoading(false));
  }, [token]);

  async function dispense() {
    setDispensing(true);
    try {
      const res = await fetch("/api/pharmacy-store/prescriptions/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || "Falha na dispensação");
        return;
      }
      setDone(true);
    } finally {
      setDispensing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <p className="text-red-600 font-medium">{error}</p>
          <Link href="/farmacias/login" className="text-sm text-emerald-600 mt-4 inline-block">
            Entrar como farmácia
          </Link>
        </div>
      </div>
    );
  }

  const meds = (data?.prescription.medications as PrescriptionMedicationLine[]) || [];

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Pill className="text-emerald-600" size={24} />
          <h1 className="font-bold text-slate-900">Validar receita Doctor8</h1>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold">Paciente</p>
            <p className="font-semibold text-slate-900">{data?.prescription.patientName}</p>
          </div>
          {data?.prescription.doctor && (
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold">Prescritor</p>
              <p className="text-slate-800">{data.prescription.doctor}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Medicamentos</p>
            <ul className="space-y-2">
              {meds.map((m, i) => (
                <li key={i} className="text-sm bg-slate-50 rounded-lg px-3 py-2 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{m.name}</span>
                    {m.itemKind && MN_ITEM_KIND_LABELS_PT[m.itemKind] && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {MN_ITEM_KIND_LABELS_PT[m.itemKind]}
                      </span>
                    )}
                    {m.renisus && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                        RENISUS
                      </span>
                    )}
                  </div>
                  {m.dosage ? <span className="text-slate-500">{m.dosage}</span> : null}
                </li>
              ))}
            </ul>
          </div>

          {data?.prescription.signatureStatus === "SIGNED" && (
            <p className="text-xs text-emerald-700 flex items-center gap-1">
              <ShieldCheck size={14} /> Receita assinada digitalmente
            </p>
          )}

          {done ? (
            <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
              <CheckCircle2 size={20} />
              <span className="font-semibold text-sm">Dispensação registrada</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={dispense}
              disabled={dispensing}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold disabled:opacity-50"
            >
              {dispensing ? "Registrando..." : "Confirmar dispensação (CRF)"}
            </button>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Token: {token.slice(0, 8)}… ·{" "}
          <Link href="/farmacias/farmaceutico/login" className="text-emerald-600 hover:underline">
            Login farmacêutico
          </Link>
        </p>
      </div>
    </div>
  );
}
