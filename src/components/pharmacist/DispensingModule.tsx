"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Loader2, Package, Plus, Save, Trash2 } from "lucide-react";
import type { PharmacistChart } from "./PharmacistChartWorkspace";

type MedicalRx = {
  id: string;
  patientRecordId: string | null;
  medications: Array<{ name: string; dosage?: string; frequency?: string }>;
  createdAt: string;
  document?: { patient?: { firstName: string; lastName: string } | null };
};

type DispensingRecord = {
  id: string;
  prescriptionId: string | null;
  medicationsDispensed: Array<{ name: string; quantity?: string; batch?: string }>;
  status: string;
  validationNotes: string | null;
  rejectionReason: string | null;
  dispensedAt: string;
};

type DispensedItem = { name: string; quantity: string; batch: string };

const emptyItem = (): DispensedItem => ({ name: "", quantity: "", batch: "" });

const STATUSES = ["VALIDATED", "DISPENSED", "PARTIAL", "REJECTED"] as const;

export default function DispensingModule({ chart }: { chart: PharmacistChart }) {
  const { t } = useI18n();
  const [records, setRecords] = useState<DispensingRecord[]>([]);
  const [medicalRx, setMedicalRx] = useState<MedicalRx[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRxId, setSelectedRxId] = useState<string>("");
  const [manualMode, setManualMode] = useState(false);
  const [items, setItems] = useState<DispensedItem[]>([emptyItem()]);
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("DISPENSED");
  const [validationNotes, setValidationNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [dispRes, rxRes] = await Promise.all([
        fetch(`/api/pharmacist/charts/${chart.id}/dispensing`),
        fetch("/api/professional/prescriptions"),
      ]);
      const dispData = await dispRes.json();
      const rxData = await rxRes.json();
      setRecords(dispData.records || []);
      const chartRx = (rxData.prescriptions || []).filter(
        (p: MedicalRx) => p.patientRecordId === chart.id,
      );
      setMedicalRx(chartRx);
    } catch {
      setRecords([]);
      setMedicalRx([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [chart.id]);

  function selectPrescription(rx: MedicalRx) {
    setSelectedRxId(rx.id);
    setManualMode(false);
    const meds = (rx.medications || []).map((m) => ({
      name: m.name,
      quantity: m.dosage || "",
      batch: "",
    }));
    setItems(meds.length > 0 ? meds : [emptyItem()]);
  }

  async function save() {
    const dispensed = items.filter((i) => i.name.trim());
    if (dispensed.length === 0) return;
    setSaving(true);
    try {
      const selected = medicalRx.find((r) => r.id === selectedRxId);
      await fetch(`/api/pharmacist/charts/${chart.id}/dispensing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prescriptionId: selectedRxId || undefined,
          prescriptionSnapshot: selected
            ? { id: selected.id, medications: selected.medications, createdAt: selected.createdAt }
            : { manual: true, chartId: chart.id },
          medicationsDispensed: dispensed,
          status,
          validationNotes: validationNotes || undefined,
          rejectionReason: status === "REJECTED" ? rejectionReason : undefined,
        }),
      });
      setSelectedRxId("");
      setManualMode(false);
      setItems([emptyItem()]);
      setValidationNotes("");
      setRejectionReason("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-teal-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-5 space-y-4">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Package size={16} className="text-teal-600" />
          {t("pharma.dispensing.new")}
        </h3>
        <p className="text-sm text-slate-600">{t("pharma.dispensing.newDesc")}</p>

        {medicalRx.length > 0 && !manualMode && (
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">{t("pharma.dispensing.fromRx")}</p>
            <ul className="space-y-2">
              {medicalRx.map((rx) => (
                <li key={rx.id}>
                  <button
                    type="button"
                    onClick={() => selectPrescription(rx)}
                    className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition ${
                      selectedRxId === rx.id
                        ? "border-teal-400 bg-white ring-2 ring-teal-200"
                        : "border-slate-200 bg-white hover:border-teal-200"
                    }`}
                  >
                    <p className="font-medium text-slate-900">
                      {new Date(rx.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {(rx.medications || []).map((m) => m.name).join(", ")}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setManualMode(true);
            setSelectedRxId("");
            setItems([emptyItem()]);
          }}
          className="text-sm font-medium text-teal-700 hover:text-teal-800"
        >
          {t("pharma.dispensing.manualEntry")}
        </button>

        {(manualMode || selectedRxId || medicalRx.length === 0) && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">{t("pharma.dispensing.items")}</p>
            {items.map((item, idx) => (
              <div key={idx} className="flex flex-wrap gap-2">
                <input
                  value={item.name}
                  onChange={(e) => setItems((p) => p.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))}
                  placeholder={t("pharma.rx.name")}
                  className="flex-1 min-w-[120px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  value={item.quantity}
                  onChange={(e) => setItems((p) => p.map((x, i) => (i === idx ? { ...x, quantity: e.target.value } : x)))}
                  placeholder={t("pharma.dispensing.quantity")}
                  className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  value={item.batch}
                  onChange={(e) => setItems((p) => p.map((x, i) => (i === idx ? { ...x, batch: e.target.value } : x)))}
                  placeholder={t("pharma.dispensing.batch")}
                  className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                {items.length > 1 && (
                  <button type="button" onClick={() => setItems((p) => p.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setItems((p) => [...p, emptyItem()])}
              className="text-sm text-teal-700 flex items-center gap-1"
            >
              <Plus size={14} /> {t("pharma.dispensing.addItem")}
            </button>
          </div>
        )}

        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">{t("pharma.dispensing.status")}</p>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold border ${
                  status === s
                    ? "bg-teal-100 border-teal-400 text-teal-800"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                {t(`pharma.dispensing.status.${s}`)}
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={validationNotes}
          onChange={(e) => setValidationNotes(e.target.value)}
          rows={2}
          placeholder={t("pharma.dispensing.validationNotes")}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        {status === "REJECTED" && (
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={2}
            placeholder={t("pharma.dispensing.rejectionReason")}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        )}

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
        >
          <Save size={14} />
          {saving ? t("pharma.saving") : t("pharma.dispensing.save")}
        </button>
      </div>

      <div>
        <h3 className="font-semibold text-slate-900 mb-3">{t("pharma.dispensing.history")}</h3>
        {records.length === 0 ? (
          <p className="text-sm text-slate-500">{t("pharma.dispensing.noHistory")}</p>
        ) : (
          <ul className="space-y-3">
            {records.map((r) => (
              <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium text-slate-900">
                    {new Date(r.dispensedAt).toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                    {t(`pharma.dispensing.status.${r.status}`)}
                  </span>
                </div>
                <ul className="mt-2 text-slate-700 space-y-0.5">
                  {(r.medicationsDispensed as DispensedItem[]).map((m, i) => (
                    <li key={i}>{m.name}{m.quantity ? ` × ${m.quantity}` : ""}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
