"use client";

// src/app/(dashboard)/professional/prescriptions/page.tsx
// Memed-style prescription UI: reuse, manual add, recent carousel.

import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import {
  Plus, Trash2, FileText, Download, Loader2, X, CheckCircle2, Search,
  AlertCircle, ChevronRight, AlertTriangle, PenLine, Smartphone, Lock,
  ExternalLink, Pill, ArrowLeft, Copy, Clock, User,
} from "lucide-react";

function controlInfo(type: string | null | undefined): {
  tarja: "preta" | "vermelha"; label: string; receita: string;
} | null {
  if (!type) return null;
  const code = type.toUpperCase();
  const A = "Exige Notificação de Receita A (amarela)";
  const B = "Exige Notificação de Receita B (azul)";
  const C = "Exige Receita de Controle Especial (2 vias)";
  const CESP = "Exige Notificação de Receita Especial";
  const map: Record<string, { tarja: "preta" | "vermelha"; label: string; receita: string }> = {
    A1: { tarja: "preta", label: "A1 — Receita A", receita: A },
    A2: { tarja: "preta", label: "A2 — Receita A", receita: A },
    A3: { tarja: "preta", label: "A3 — Receita A", receita: A },
    B1: { tarja: "preta", label: "B1 — Receita B", receita: B },
    B2: { tarja: "preta", label: "B2 — Receita B", receita: B },
    C1: { tarja: "vermelha", label: "C1 — Controle especial", receita: C },
    C2: { tarja: "vermelha", label: "C2 — Retinoide", receita: CESP },
    C3: { tarja: "vermelha", label: "C3 — Talidomida", receita: CESP },
    C4: { tarja: "vermelha", label: "C4 — Antirretroviral", receita: C },
    C5: { tarja: "vermelha", label: "C5 — Anabolizante", receita: C },
  };
  return map[code] || { tarja: "vermelha", label: "Controlado", receita: C };
}

function missingLabel(code: string): string {
  return ({ name: "nome completo", address: "endereço", dob: "data de nascimento" } as Record<string, string>)[code] || code;
}

interface Chart {
  id: string; firstName: string; lastName: string;
  email: string | null; hasAccount: boolean; missingForRx?: string[];
}
interface Drug {
  id: string; name: string; activeIngredient: string; presentation: string;
  manufacturer: string | null; country: string; category: string | null;
  controlled: boolean; prescriptionType: string | null;
}
interface MedItem {
  name: string; dosage: string; frequency: string; duration: string; instructions: string;
  presentation?: string; controlled?: boolean; prescriptionType?: string | null;
}
interface Prescription {
  id: string; createdAt: string; validUntil?: string;
  instructions?: string; patientRecordId?: string | null;
  digitalSignature?: string | null;
  signatureStatus?: string | null;
  document?: { patient?: { firstName: string; lastName: string } | null };
  medications: MedItem[];
}

function SignModal({
  prescription, signConfig, onClose,
}: {
  prescription: Prescription;
  signConfig: { configured: boolean; provider: string; cpfMasked: string } | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleStartSign() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/professional/prescriptions/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prescriptionId: prescription.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.redirectUrl) {
        setError(data.error || "Erro ao iniciar assinatura.");
        setLoading(false);
        return;
      }
      window.location.href = data.redirectUrl;
    } catch {
      setError("Erro de rede. Tente novamente.");
      setLoading(false);
    }
  }

  if (!signConfig?.configured) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <PenLine size={18} className="text-indigo-500" /> Assinatura Digital
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            Configure o CPF da sua assinatura digital nas configurações da conta antes de assinar receitas.
          </div>
          <a href="/professional/account" onClick={onClose}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-sm transition">
            <ExternalLink size={14} /> Ir para configurações
          </a>
        </div>
      </div>
    );
  }

  const patientName = prescription.document?.patient
    ? `${prescription.document.patient.firstName} ${prescription.document.patient.lastName}`
    : "Paciente";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <PenLine size={18} className="text-indigo-500" /> Assinatura Digital ICP-Brasil
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-indigo-800 flex items-center gap-2">
            <Smartphone size={15} /> Como funciona
          </p>
          <ol className="text-xs text-indigo-700 space-y-1 list-decimal list-inside">
            <li>Você será levado à página segura de assinatura</li>
            <li>Escolha seu certificado (BirdID, VIDaaS, etc.)</li>
            <li>Autorize a assinatura no app do seu celular</li>
            <li>Você volta automaticamente com a receita assinada</li>
          </ol>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1">
          <p className="text-xs text-slate-500">Receita</p>
          <p className="font-medium text-slate-800 text-xs">{patientName}</p>
          <p className="text-xs text-slate-400">CPF de assinatura: {signConfig.cpfMasked}</p>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle size={14} /> {error}
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 transition">
            Cancelar
          </button>
          <button onClick={handleStartSign} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold text-sm transition flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={13} className="animate-spin" /> Abrindo...</> : <><Lock size={13} /> Assinar agora</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function PrescriptionCard({
  p, locale, t, onReuse, onSign,
}: {
  p: Prescription; locale: string; t: (k: string) => string;
  onReuse: () => void; onSign: () => void;
}) {
  const meds = p.medications as MedItem[];
  const signed = p.signatureStatus === "SIGNED" || !!p.digitalSignature;
  const patientName = p.document?.patient
    ? `${p.document.patient.firstName} ${p.document.patient.lastName}`
    : t("rx.patient");

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 hover:border-indigo-200 transition">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-800">{patientName}</p>
            {signed && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={11} /> {t("rx.signed")}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {t("rx.issued")} {new Date(p.createdAt).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" })}
            {p.validUntil && ` · ${t("rx.validUntil")} ${new Date(p.validUntil).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" })}`}
          </p>
          <ol className="mt-3 space-y-1">
            {meds.slice(0, 4).map((m, i) => (
              <li key={i} className="text-xs text-slate-600 truncate">
                {i + 1}. {m.name}{m.dosage ? ` — ${m.dosage}` : ""}
              </li>
            ))}
            {meds.length > 4 && <li className="text-xs text-slate-400">+{meds.length - 4} {t("rx.more")}</li>}
          </ol>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <button onClick={onReuse}
            className="flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-2 rounded-xl text-xs font-semibold transition">
            <Copy size={13} /> {t("rx.reuse")}
          </button>
          {!signed && (
            <button onClick={onSign}
              className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl text-xs font-semibold transition">
              <PenLine size={13} /> {t("rx.sign")}
            </button>
          )}
          <a href={`/api/professional/prescriptions/${p.id}/pdf`} target="_blank"
            className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold transition">
            <Download size={13} /> {t("rx.downloadPDF")}
          </a>
        </div>
      </div>
    </div>
  );
}

export default function PrescriptionsPage() {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);

  const [view, setView] = useState<"list" | "create">("list");
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAllHistory, setShowAllHistory] = useState(false);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [reuseSource, setReuseSource] = useState<Prescription | null>(null);

  const [successPatient, setSuccessPatient] = useState<Chart | null>(null);
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteError, setInviteError] = useState("");

  const [charts, setCharts] = useState<Chart[]>([]);
  const [patientQuery, setPatientQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Chart | null>(null);

  const [drugQuery, setDrugQuery] = useState("");
  const [drugResults, setDrugResults] = useState<Drug[]>([]);
  const [drugSearching, setDrugSearching] = useState(false);
  const [drugCountry, setDrugCountry] = useState("");
  const drugDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [medications, setMedications] = useState<MedItem[]>([]);
  const [instructions, setInstructions] = useState("");
  const [validDays, setValidDays] = useState(30);

  const [signConfig, setSignConfig] = useState<{ configured: boolean; provider: string; cpfMasked: string } | null>(null);
  const [signModal, setSignModal] = useState<Prescription | null>(null);
  const [signResult, setSignResult] = useState<string | null>(null);

  useEffect(() => {
    fetchPrescriptions();
    loadSignConfig();
    const params = new URLSearchParams(window.location.search);
    const s = params.get("sign");
    if (s) {
      setSignResult(s);
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => setSignResult(null), 6000);
    }
  }, []);

  async function fetchPrescriptions() {
    try {
      const res = await fetch("/api/professional/prescriptions");
      const d = await res.json();
      setPrescriptions(d.prescriptions || []);
    } finally { setLoading(false); }
  }

  async function loadSignConfig() {
    try {
      const res = await fetch("/api/professional/digital-sign");
      setSignConfig(await res.json());
    } catch { /* ignore */ }
  }

  async function loadCharts() {
    try {
      const res = await fetch("/api/professional/records");
      const d = await res.json();
      setCharts(d.records || []);
    } catch { /* ignore */ }
  }

  function resetForm() {
    setSelectedPatient(null); setPatientQuery(""); setDrugQuery("");
    setDrugResults([]); setDrugCountry(""); setMedications([]);
    setInstructions(""); setValidDays(30); setFormError("");
    setSuccessPatient(null); setInviteSending(false);
    setInviteSent(false); setInviteError(""); setReuseSource(null);
  }

  async function openCreate() {
    resetForm();
    setView("create");
    await loadCharts();
  }

  async function openReuse(p: Prescription) {
    resetForm();
    setReuseSource(p);
    setView("create");
    await loadCharts();

    const meds = (p.medications as MedItem[]).map((m) => ({ ...m }));
    setMedications(meds);
    if (p.instructions) setInstructions(p.instructions);

    const recordsRes = await fetch("/api/professional/records");
    const recordsData = await recordsRes.json();
    const records: Chart[] = recordsData.records || [];
    setCharts(records);

    if (p.patientRecordId) {
      const chart = records.find((c) => c.id === p.patientRecordId);
      if (chart) setSelectedPatient(chart);
    } else if (p.document?.patient) {
      const target = `${p.document.patient.firstName} ${p.document.patient.lastName}`.toLowerCase();
      const chart = records.find((c) => `${c.firstName} ${c.lastName}`.toLowerCase() === target);
      if (chart) setSelectedPatient(chart);
    }
  }

  function closeCreate() {
    setView("list");
    resetForm();
    fetchPrescriptions();
  }

  const filteredCharts = patientQuery.trim().length === 0
    ? charts.slice(0, 8)
    : charts.filter((c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(patientQuery.toLowerCase())
      );

  useEffect(() => {
    if (drugDebounce.current) clearTimeout(drugDebounce.current);
    const q = drugQuery.trim();
    if (q.length < 2) { setDrugResults([]); setDrugSearching(false); return; }
    setDrugSearching(true);
    drugDebounce.current = setTimeout(async () => {
      try {
        const url = `/api/professional/drugs/search?q=${encodeURIComponent(q)}${drugCountry ? `&country=${drugCountry}` : ""}`;
        const res = await fetch(url);
        const d = await res.json();
        setDrugResults(d.drugs || []);
      } catch { setDrugResults([]); }
      finally { setDrugSearching(false); }
    }, 300);
    return () => { if (drugDebounce.current) clearTimeout(drugDebounce.current); };
  }, [drugQuery, drugCountry]);

  function addDrug(drug: Drug) {
    setMedications((prev) => [...prev, {
      name: `${drug.name}${drug.activeIngredient ? ` (${drug.activeIngredient})` : ""}`,
      dosage: "", frequency: "", duration: "", instructions: "",
      presentation: drug.presentation, controlled: drug.controlled, prescriptionType: drug.prescriptionType,
    }]);
    setDrugQuery(""); setDrugResults([]);
  }

  function addManual() {
    const name = drugQuery.trim();
    setMedications((prev) => [...prev, {
      name: name || "",
      dosage: "", frequency: "", duration: "", instructions: "",
    }]);
    setDrugQuery(""); setDrugResults([]);
  }

  function removeMedication(index: number) { setMedications((prev) => prev.filter((_, i) => i !== index)); }
  function updateMedication(index: number, field: keyof MedItem, value: string) {
    setMedications((prev) => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  }

  async function handleSubmit() {
    setFormError("");
    if (!selectedPatient) { setFormError(t("rx2.needPatient")); return; }
    if (medications.length === 0 || medications.some((m) => !m.name.trim() || !m.dosage || !m.frequency)) {
      setFormError(t("rx2.needMeds")); return;
    }
    setSaving(true);
    try {
      const cleanMeds = medications.map((m) => ({
        name: m.name.trim(), dosage: m.dosage, frequency: m.frequency,
        duration: m.duration, instructions: m.instructions,
      }));
      const res = await fetch("/api/professional/prescriptions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientRecordId: selectedPatient.id, medications: cleanMeds, instructions, validDays }),
      });
      if (res.ok) { setSuccessPatient(selectedPatient); fetchPrescriptions(); }
      else {
        const d = await res.json().catch(() => ({}));
        setFormError(typeof d.error === "string" ? d.error : t("rx2.needMeds"));
      }
    } finally { setSaving(false); }
  }

  async function sendInvite() {
    if (!successPatient) return;
    setInviteSending(true); setInviteError("");
    try {
      const res = await fetch(`/api/professional/records/${successPatient.id}/invite`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang }),
      });
      if (res.ok) setInviteSent(true);
      else {
        const d = await res.json().catch(() => ({}));
        setInviteError(typeof d.error === "string" ? d.error : t("rx3.inviteError"));
      }
    } catch { setInviteError(t("rx3.inviteError")); }
    finally { setInviteSending(false); }
  }

  const filtered = prescriptions.filter((p) => {
    const name = p.document?.patient
      ? `${p.document.patient.firstName} ${p.document.patient.lastName}`.toLowerCase() : "";
    return name.includes(search.toLowerCase());
  });

  const recentPrescriptions = prescriptions.slice(0, 12);
  const selectedMissing = selectedPatient?.missingForRx ?? [];
  const todayLabel = new Date().toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });

  // ── CREATE VIEW (Memed-style full page) ──────────────────────────────────
  if (view === "create") {
    return (
      <div className="max-w-3xl mx-auto space-y-5 pb-24">
        <button onClick={closeCreate}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition font-medium">
          <ArrowLeft size={16} /> {t("rx.backToList")}
        </button>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("rx.formTitle")}</h1>
          <p className="text-slate-500 text-sm mt-1">{t("rx.formSubtitle")}</p>
        </div>

        {reuseSource && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3">
            <Copy size={18} className="text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-indigo-800">{t("rx.reuseTitle")}</p>
              <p className="text-xs text-indigo-700 mt-1">{t("rx.reuseHint")}</p>
            </div>
          </div>
        )}

        {successPatient ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                <CheckCircle2 size={28} className="text-emerald-600" />
              </div>
              <p className="font-bold text-slate-900 text-lg">{t("rx3.savedTitle")}</p>
              <p className="text-slate-500 text-sm mt-1">{successPatient.firstName} {successPatient.lastName}</p>
            </div>
            {successPatient.hasAccount ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800 flex items-start gap-3">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <p>{t("rx3.notifiedText")}</p>
              </div>
            ) : successPatient.email ? (
              inviteSent ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
                  {t("rx3.inviteSent")} <strong>{successPatient.email}</strong>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm text-amber-800">{t("rx3.noAccountText")}</p>
                  <p className="text-sm font-semibold text-amber-900">{successPatient.email}</p>
                  {inviteError && <p className="text-sm text-rose-600">{inviteError}</p>}
                  <button onClick={sendInvite} disabled={inviteSending}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50">
                    {inviteSending && <Loader2 size={14} className="animate-spin" />}
                    {t("rx3.sendInvite")}
                  </button>
                </div>
              )
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
                {t("rx3.noEmailText")}
              </div>
            )}
            <button onClick={closeCreate}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition">
              {t("rx3.done")}
            </button>
          </div>
        ) : (
          <>
            {/* Patient card */}
            <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <label className="text-sm font-semibold text-slate-800">{t("rx2.selectPatient")}</label>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{t("rx.documentDate")}:</span>
                  <span className="font-medium text-slate-700">{todayLabel}</span>
                </div>
              </div>

              {selectedPatient ? (
                <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 text-sm shrink-0">
                    {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                    <p className="text-xs mt-0.5 text-slate-500">
                      {selectedPatient.hasAccount ? t("rx2.hasAccountBadge") : t("rx2.noAccountBadge")}
                    </p>
                  </div>
                  <button onClick={() => { setSelectedPatient(null); setPatientQuery(""); }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold shrink-0">
                    {t("rx2.changePatient")}
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)}
                      placeholder={t("rx2.searchPatient")}
                      className="rx-inp pl-9" />
                  </div>
                  {patientQuery.trim().length > 0 && (
                    <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                      {filteredCharts.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-500">{t("rx2.noPatientFound")}</div>
                      ) : filteredCharts.map((c) => (
                        <button key={c.id} onClick={() => setSelectedPatient(c)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 transition text-left">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs shrink-0">
                            {c.firstName[0]}{c.lastName[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 text-sm">{c.firstName} {c.lastName}</p>
                            <p className="text-xs text-slate-400">{c.hasAccount ? t("rx2.hasAccountBadge") : t("rx2.noAccountBadge")}</p>
                          </div>
                          <ChevronRight size={16} className="text-slate-300 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {selectedPatient && selectedMissing.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    Complete na ficha: <strong>{selectedMissing.map(missingLabel).join(", ")}</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Add item card */}
            <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-semibold text-slate-800">{t("rx2.addItem")}</label>
                <select value={drugCountry} onChange={(e) => setDrugCountry(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                  <option value="">{t("rx2.countryAll")}</option>
                  <option value="BR">🇧🇷 BR</option>
                  <option value="US">🇺🇸 US</option>
                </select>
              </div>

              <div className="relative">
                <Pill size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" />
                <input type="text" value={drugQuery} onChange={(e) => setDrugQuery(e.target.value)}
                  placeholder={t("rx2.searchDrug")} className="rx-inp pl-10" />
                {drugSearching && <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
              </div>

              {/* Always visible manual add */}
              <button type="button" onClick={addManual}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 font-semibold text-sm transition">
                <Plus size={16} /> {t("rx2.addManual")}
              </button>
              <p className="text-xs text-slate-400 text-center -mt-2">{t("rx.manualAlways")}</p>

              {drugQuery.trim().length >= 2 && drugResults.length > 0 && (
                <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {drugResults.map((drug) => {
                    const ci = controlInfo(drug.prescriptionType);
                    return (
                      <button key={drug.id} onClick={() => addDrug(drug)}
                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-indigo-50 transition text-left">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 text-sm flex items-center gap-2 flex-wrap">
                            {drug.name}
                            {drug.controlled && ci && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${ci.tarja === "preta" ? "bg-slate-800 text-white" : "bg-red-100 text-red-600"}`}>
                                {ci.label}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500">{drug.activeIngredient}</p>
                          <p className="text-xs text-slate-400">{drug.presentation}</p>
                        </div>
                        <Plus size={16} className="text-indigo-500 shrink-0 mt-1" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Prescription items */}
            <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 space-y-4">
              <label className="text-sm font-semibold text-slate-800">{t("rx2.selectedMeds")}</label>
              {medications.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Pill size={28} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">{t("rx2.noMeds")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {medications.map((med, index) => {
                    const ci = controlInfo(med.prescriptionType);
                    return (
                      <div key={index} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0 space-y-2">
                            <label className="text-xs font-medium text-slate-600">{t("rx2.manualName")}</label>
                            <input type="text" value={med.name}
                              onChange={(e) => updateMedication(index, "name", e.target.value)}
                              placeholder={t("rx2.manualNamePlaceholder")} className="rx-inp-sm" />
                            {med.controlled && ci && (
                              <p className="text-[11px] text-red-700 bg-red-50 rounded-md px-2 py-1 inline-flex items-center gap-1">
                                <AlertCircle size={11} />{ci.receita}
                              </p>
                            )}
                          </div>
                          <button onClick={() => removeMedication(index)} className="text-red-400 hover:text-red-600 shrink-0 p-1">
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-slate-600 block mb-1">{t("rx2.dosageLabel")} *</label>
                            <input type="text" value={med.dosage} onChange={(e) => updateMedication(index, "dosage", e.target.value)} placeholder="500mg" className="rx-inp-sm" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-600 block mb-1">{t("rx2.frequencyLabel")} *</label>
                            <select value={med.frequency} onChange={(e) => updateMedication(index, "frequency", e.target.value)} className="rx-inp-sm">
                              <option value="">{t("med.freqSelect")}</option>
                              <option value="Once daily">{t("med.freqOnce")}</option>
                              <option value="Twice daily">{t("med.freqTwice")}</option>
                              <option value="Three times daily">{t("med.freqThree")}</option>
                              <option value="Every 8 hours">{t("med.freq8h")}</option>
                              <option value="Every 12 hours">{t("med.freq12h")}</option>
                              <option value="As needed">{t("med.freqAsNeeded")}</option>
                              <option value="Weekly">{t("med.freqWeekly")}</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-600 block mb-1">{t("rx2.durationLabel")}</label>
                            <input type="text" value={med.duration} onChange={(e) => updateMedication(index, "duration", e.target.value)} placeholder={t("rx.medDurationPlaceholder")} className="rx-inp-sm" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-600 block mb-1">{t("rx2.instructionsLabel")}</label>
                            <input type="text" value={med.instructions} onChange={(e) => updateMedication(index, "instructions", e.target.value)} placeholder={t("rx.medInstructionsPlaceholder")} className="rx-inp-sm" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Instructions + validity */}
            <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">{t("rx2.generalInstructions")}</label>
                <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2}
                  placeholder={t("rx.generalInstructionsPlaceholder")} className="rx-inp resize-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">{t("rx2.validFor")}</label>
                <select value={validDays} onChange={(e) => setValidDays(Number(e.target.value))} className="rx-inp">
                  <option value={7}>{t("rx.days7")}</option>
                  <option value={30}>{t("rx.days30")}</option>
                  <option value={60}>{t("rx.days60")}</option>
                  <option value={90}>{t("rx.days90")}</option>
                  <option value={180}>{t("rx.days180")}</option>
                  <option value={365}>{t("rx.days365")}</option>
                </select>
              </div>
            </div>

            {formError && <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-3">{formError}</p>}
          </>
        )}

        {/* Sticky footer */}
        {!successPatient && (
          <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 p-4 z-20">
            <div className="max-w-3xl mx-auto flex gap-3">
              <button type="button" onClick={closeCreate}
                className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition">
                {t("rx2.cancel")}
              </button>
              <button type="button" onClick={handleSubmit} disabled={saving}
                className="flex-[2] py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-600/20">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                {saving ? t("rx2.saving") : t("rx2.save")}
              </button>
            </div>
          </div>
        )}

        <style>{`
          .rx-inp { width: 100%; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; font-size: 14px; color: #1e293b; outline: none; background: white; }
          .rx-inp:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,.12); }
          .rx-inp-sm { width: 100%; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 8px 12px; font-size: 13px; color: #1e293b; outline: none; background: white; }
          .rx-inp-sm:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,.1); }
        `}</style>
      </div>
    );
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("rx.title")}</h1>
          <p className="text-slate-500 text-sm mt-1">{t("rx.subtitle")}</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition shadow-md shadow-indigo-600/20">
          <Plus size={16} /> {t("rx.new")}
        </button>
      </div>

      {signResult === "success" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-800 font-medium">Receita assinada com sucesso! O PDF assinado já está disponível.</p>
        </div>
      )}
      {signResult === "cancelled" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">Assinatura cancelada.</div>
      )}
      {signResult === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">Erro ao assinar. Tente novamente.</div>
      )}

      {signConfig && !signConfig.configured && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3">
          <PenLine size={18} className="text-indigo-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-indigo-800">Assinatura digital não configurada</p>
            <p className="text-xs text-indigo-600 mt-1">Configure o CPF para assinar receitas com validade ICP-Brasil.</p>
          </div>
          <a href="/professional/account"
            className="text-xs font-semibold text-indigo-700 border border-indigo-300 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition shrink-0">
            Configurar
          </a>
        </div>
      )}

      {/* Quick actions (Memed-style) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <button onClick={openCreate}
          className="text-left p-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 hover:bg-indigo-50 transition group">
          <Pill size={20} className="text-indigo-600 mb-2" />
          <p className="font-semibold text-indigo-900 text-sm">{t("rx.createAction")}</p>
          <p className="text-xs text-indigo-600/80 mt-0.5">{t("rx.createActionDesc")}</p>
        </button>
        <button onClick={() => setShowAllHistory(true)}
          className="text-left p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition">
          <Clock size={20} className="text-slate-500 mb-2" />
          <p className="font-semibold text-slate-800 text-sm">{t("rx.historyAction")}</p>
          <p className="text-xs text-slate-500 mt-0.5">{t("rx.historyActionDesc")}</p>
        </button>
      </div>

      {/* Recent prescriptions carousel */}
      {!loading && recentPrescriptions.length > 0 && !showAllHistory && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-800">{t("rx.recent")}</h2>
            <button onClick={() => setShowAllHistory(true)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              {t("rx.showAll")}
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin">
            {recentPrescriptions.map((p) => {
              const meds = p.medications as MedItem[];
              const patientName = p.document?.patient
                ? `${p.document.patient.firstName} ${p.document.patient.lastName}` : t("rx.patient");
              return (
                <div key={p.id}
                  className="snap-start shrink-0 w-64 bg-white rounded-2xl border border-slate-200 p-4 hover:border-indigo-200 transition cursor-pointer"
                  onClick={() => openReuse(p)}>
                  <p className="text-xs text-indigo-500 font-medium">
                    {new Date(p.createdAt).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </p>
                  <p className="font-semibold text-slate-800 text-sm mt-1 truncate">{patientName}</p>
                  <ol className="mt-2 space-y-0.5">
                    {meds.slice(0, 2).map((m, i) => (
                      <li key={i} className="text-xs text-slate-500 truncate">{i + 1}. {m.name}</li>
                    ))}
                  </ol>
                  <button onClick={(e) => { e.stopPropagation(); openReuse(p); }}
                    className="mt-3 w-full flex items-center justify-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 py-1.5 rounded-lg transition">
                    <Copy size={12} /> {t("rx.reuse")}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search + full list */}
      {(showAllHistory || recentPrescriptions.length === 0) && (
        <>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder={t("rx.search")} value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
          </div>
          {showAllHistory && (
            <button onClick={() => setShowAllHistory(false)} className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1">
              <ArrowLeft size={12} /> {t("rx.recent")}
            </button>
          )}
        </>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <FileText size={40} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">{t("rx.empty")}</p>
          <button onClick={openCreate} className="mt-4 text-indigo-600 text-sm font-semibold hover:underline">
            {t("rx.createFirst")} →
          </button>
        </div>
      ) : (showAllHistory || search.trim().length > 0) && (
        <div className="space-y-3">
          {filtered.map((p) => (
            <PrescriptionCard
              key={p.id} p={p} locale={locale} t={t}
              onReuse={() => openReuse(p)}
              onSign={() => setSignModal(p)}
            />
          ))}
        </div>
      )}

      {signModal && (
        <SignModal prescription={signModal} signConfig={signConfig} onClose={() => setSignModal(null)} />
      )}
    </div>
  );
}
