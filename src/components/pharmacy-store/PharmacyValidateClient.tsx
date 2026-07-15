"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ShieldCheck, Pill, CheckCircle2, AlertTriangle } from "lucide-react";
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
    signedAt?: string | null;
    prescriptionFormKind?: string | null;
    sncrReceiptNumber?: string | null;
    requiresSncr?: boolean;
    itiReady?: boolean;
  };
};

export default function PharmacyValidateClient({ token }: { token: string }) {
  const [data, setData] = useState<RxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dispensing, setDispensing] = useState(false);
  const [done, setDone] = useState(false);
  const [pharmacyStoreId, setPharmacyStoreId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/pharmacy-store/company", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.store?.id) setPharmacyStoreId(d.store.id);
      })
      .catch(() => {});

    fetch(`/api/pharmacy-store/prescriptions/validate?token=${encodeURIComponent(token)}`, {
      credentials: "same-origin",
    })
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
    setError(null);
    try {
      const res = await fetch("/api/pharmacy-store/prescriptions/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          token,
          ...(pharmacyStoreId ? { pharmacyStoreId } : {}),
        }),
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

  const rx = data?.prescription;
  const canDispense =
    rx?.signatureStatus === "SIGNED" &&
    rx?.itiReady !== false &&
    (!rx?.requiresSncr || !!rx?.sncrReceiptNumber);

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

  const meds = (rx?.medications as PrescriptionMedicationLine[]) || [];
  const formLabel =
    rx?.prescriptionFormKind === "NRB"
      ? "Notificação de Receita B (azul)"
      : rx?.prescriptionFormKind === "RCE"
        ? "Receita de Controle Especial"
        : null;

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
            <p className="font-semibold text-slate-900">{rx?.patientName}</p>
          </div>
          {rx?.doctor && (
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold">Prescritor</p>
              <p className="text-slate-800">{rx.doctor}</p>
            </div>
          )}
          {formLabel && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-900">
              <p className="font-semibold">{formLabel}</p>
              {rx?.sncrReceiptNumber && (
                <p className="text-xs mt-1">SNCR: {rx.sncrReceiptNumber}</p>
              )}
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
                  </div>
                  {m.dosage ? <span className="text-slate-500">{m.dosage}</span> : null}
                </li>
              ))}
            </ul>
          </div>

          {rx?.itiReady ? (
            <p className="text-xs text-emerald-700 flex items-center gap-1">
              <ShieldCheck size={14} /> Assinatura ICP-Brasil verificada (PDF disponível)
            </p>
          ) : (
            <p className="text-xs text-amber-800 flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle size={14} /> Receita não assinada ou PDF indisponível para validação ITI
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
              disabled={dispensing || !canDispense}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold disabled:opacity-50"
            >
              {dispensing ? "Registrando..." : "Confirmar dispensação (CRF)"}
            </button>
          )}
          {error && data && (
            <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</p>
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
