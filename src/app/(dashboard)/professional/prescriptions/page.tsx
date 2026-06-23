"use client";

// src/app/(dashboard)/professional/prescriptions/page.tsx
// ETAPA 2 — Memed-style prescription screen + Assinatura Digital BirdID/VIDaaS.
// Adicionado: botão "Assinar digitalmente" em cada receita + modal de OTP.

import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import {
  Plus, Trash2, FileText, Download, Loader2, X, CheckCircle2, Search,
  User, Pill, AlertCircle, ChevronRight, AlertTriangle,
  PenLine, Smartphone, Lock, ExternalLink,
} from "lucide-react";

// ── Controlled-substance helper ──────────────────────────────────────────────
function controlInfo(type: string | null | undefined): {
  tarja: "preta" | "vermelha"; label: string; receita: string;
} | null {
  if (!type) return null;
  const code = type.toUpperCase();
  const A    = "Exige Notificação de Receita A (amarela)";
  const B    = "Exige Notificação de Receita B (azul)";
  const C    = "Exige Receita de Controle Especial (2 vias)";
  const CESP = "Exige Notificação de Receita Especial";
  const map: Record<string, { tarja: "preta" | "vermelha"; label: string; receita: string }> = {
    A1: { tarja: "preta",    label: "A1 — Receita A",          receita: A },
    A2: { tarja: "preta",    label: "A2 — Receita A",          receita: A },
    A3: { tarja: "preta",    label: "A3 — Receita A",          receita: A },
    B1: { tarja: "preta",    label: "B1 — Receita B",          receita: B },
    B2: { tarja: "preta",    label: "B2 — Receita B",          receita: B },
    C1: { tarja: "vermelha", label: "C1 — Controle especial",  receita: C },
    C2: { tarja: "vermelha", label: "C2 — Retinoide",          receita: CESP },
    C3: { tarja: "vermelha", label: "C3 — Talidomida",         receita: CESP },
    C4: { tarja: "vermelha", label: "C4 — Antirretroviral",    receita: C },
    C5: { tarja: "vermelha", label: "C5 — Anabolizante",       receita: C },
  };
  return map[code] || { tarja: "vermelha", label: "Controlado", receita: C };
}

function missingLabel(code: string): string {
  return ({ name: "nome completo", address: "endereço", dob: "data de nascimento" } as any)[code] || code;
}

// ── Types ────────────────────────────────────────────────────────────────────
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
  digitalSignature?: string | null;
  signatureStatus?: string | null;
  document?: { patient?: { firstName: string; lastName: string } | null };
  medications: MedItem[];
}

// ── Sign Modal ───────────────────────────────────────────────────────────────
function SignModal({
  prescription,
  signConfig,
  onClose,
}: {
  prescription: Prescription;
  signConfig: { configured: boolean; provider: string; cpfMasked: string } | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // Inicia a assinatura: chama o backend, que cria a sessão na Lacuna e
  // devolve a redirectUrl. Redirecionamos o médico para lá (ele assina com
  // o certificado em nuvem — BirdID/VIDaaS/etc — e volta automaticamente).
  async function handleStartSign() {
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/professional/prescriptions/sign", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ prescriptionId: prescription.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.redirectUrl) {
        setError(data.error || "Erro ao iniciar assinatura.");
        setLoading(false);
        return;
      }
      // Redireciona o médico para a página de assinatura da Lacuna
      window.location.href = data.redirectUrl;
    } catch {
      setError("Erro de rede. Tente novamente.");
      setLoading(false);
    }
  }

  // Sem configuração de CPF
  if (!signConfig?.configured) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <PenLine size={18} className="text-blue-500" /> Assinatura Digital
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            Configure o CPF da sua assinatura digital nas configurações da conta antes de assinar receitas.
          </div>
          <a href="/professional/account" onClick={onClose}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition">
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
            <PenLine size={18} className="text-blue-500" /> Assinatura Digital ICP-Brasil
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        {/* Como funciona */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-blue-800 flex items-center gap-2">
            <Smartphone size={15} /> Como funciona
          </p>
          <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
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
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold text-sm transition flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={13} className="animate-spin" /> Abrindo...</> : <><Lock size={13} /> Assinar agora</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function PrescriptionsPage() {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);

  const [prescriptions, setPrescriptions]   = useState<Prescription[]>([]);
  const [loading,       setLoading]         = useState(true);
  const [search,        setSearch]          = useState("");

  const [showForm,  setShowForm]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [formError, setFormError] = useState("");

  const [successPatient, setSuccessPatient] = useState<Chart | null>(null);
  const [inviteSending,  setInviteSending]  = useState(false);
  const [inviteSent,     setInviteSent]     = useState(false);
  const [inviteError,    setInviteError]    = useState("");

  const [charts,          setCharts]          = useState<Chart[]>([]);
  const [patientQuery,    setPatientQuery]    = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Chart | null>(null);

  const [drugQuery,    setDrugQuery]    = useState("");
  const [drugResults,  setDrugResults]  = useState<Drug[]>([]);
  const [drugSearching,setDrugSearching]= useState(false);
  const [drugCountry,  setDrugCountry]  = useState("");
  const drugDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [medications,   setMedications]   = useState<MedItem[]>([]);
  const [instructions,  setInstructions]  = useState("");
  const [validDays,     setValidDays]     = useState(30);

  // Assinatura digital
  const [signConfig,    setSignConfig]    = useState<{ configured: boolean; provider: string; cpfMasked: string } | null>(null);
  const [signModal,     setSignModal]     = useState<Prescription | null>(null);
  const [signResult,    setSignResult]    = useState<string | null>(null);

  useEffect(() => {
    fetchPrescriptions();
    loadSignConfig();
    // Detecta retorno da Lacuna (?sign=success|cancelled|error|processing)
    const params = new URLSearchParams(window.location.search);
    const s = params.get("sign");
    if (s) {
      setSignResult(s);
      // limpa o parâmetro da URL sem recarregar
      window.history.replaceState({}, "", window.location.pathname);
      // remove o aviso após alguns segundos
      setTimeout(() => setSignResult(null), 6000);
    }
  }, []);

  async function fetchPrescriptions() {
    try {
      const res = await fetch("/api/professional/prescriptions");
      const d   = await res.json();
      setPrescriptions(d.prescriptions || []);
    } finally { setLoading(false); }
  }

  async function loadSignConfig() {
    try {
      const res  = await fetch("/api/professional/digital-sign");
      const data = await res.json();
      setSignConfig(data);
    } catch { /* ignore */ }
  }

  function markSigned(id: string) {
    setPrescriptions(prev => prev.map(p =>
      p.id === id ? { ...p, digitalSignature: `signed:${new Date().toISOString()}` } : p
    ));
  }

  async function openForm() {
    setShowForm(true); resetForm();
    try {
      const res = await fetch("/api/professional/records");
      const d   = await res.json();
      setCharts(d.records || []);
    } catch { /* ignore */ }
  }

  function resetForm() {
    setSelectedPatient(null); setPatientQuery(""); setDrugQuery("");
    setDrugResults([]); setDrugCountry(""); setMedications([]);
    setInstructions(""); setValidDays(30); setFormError("");
    setSuccessPatient(null); setInviteSending(false);
    setInviteSent(false); setInviteError("");
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
        const d   = await res.json();
        setDrugResults(d.drugs || []);
      } catch { setDrugResults([]); }
      finally  { setDrugSearching(false); }
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
    const q = drugQuery.trim();
    setMedications((prev) => [...prev, { name: q || "", dosage: "", frequency: "", duration: "", instructions: "" }]);
    setDrugQuery(""); setDrugResults([]);
  }

  function removeMedication(index: number) { setMedications((prev) => prev.filter((_, i) => i !== index)); }
  function updateMedication(index: number, field: keyof MedItem, value: string) {
    setMedications((prev) => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  }

  async function handleSubmit() {
    setFormError("");
    if (!selectedPatient) { setFormError(t("rx2.needPatient")); return; }
    if (medications.length === 0 || medications.some((m) => !m.name || !m.dosage || !m.frequency)) {
      setFormError(t("rx2.needMeds")); return;
    }
    setSaving(true);
    try {
      const cleanMeds = medications.map((m) => ({
        name: m.name, dosage: m.dosage, frequency: m.frequency,
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
      if (res.ok) { setInviteSent(true); }
      else {
        const d = await res.json().catch(() => ({}));
        setInviteError(typeof d.error === "string" ? d.error : t("rx3.inviteError"));
      }
    } catch { setInviteError(t("rx3.inviteError")); }
    finally  { setInviteSending(false); }
  }

  function closeAll() { setShowForm(false); resetForm(); }

  const filtered = prescriptions.filter((p) => {
    const name = p.document?.patient
      ? `${p.document.patient.firstName} ${p.document.patient.lastName}`.toLowerCase() : "";
    return name.includes(search.toLowerCase());
  });

  const selectedMissing = selectedPatient?.missingForRx ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("rx.title")}</h1>
          <p className="text-slate-500 text-sm mt-1">{t("rx.subtitle")}</p>
        </div>
        <button onClick={openForm}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition">
          <Plus size={16} /> {t("rx.new")}
        </button>
      </div>

      {/* Resultado do retorno da Lacuna */}
      {signResult === "success" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-800">Receita assinada com sucesso!</p>
            <p className="text-xs text-emerald-700 mt-1">
              A assinatura digital ICP-Brasil foi aplicada. O PDF assinado já está disponível para download.
            </p>
          </div>
        </div>
      )}
      {signResult === "cancelled" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">Assinatura cancelada. Você pode tentar novamente quando quiser.</p>
        </div>
      )}
      {signResult === "processing" && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Loader2 size={18} className="text-blue-600 shrink-0 mt-0.5 animate-spin" />
          <p className="text-sm text-blue-800">Assinatura em processamento. Atualize a página em instantes.</p>
        </div>
      )}
      {signResult === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">Houve um erro ao assinar. Tente novamente ou verifique seu certificado.</p>
        </div>
      )}

      {/* Aviso de assinatura não configurada */}
      {signConfig && !signConfig.configured && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <PenLine size={18} className="text-blue-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-800">Assinatura digital não configurada</p>
            <p className="text-xs text-blue-600 mt-1">
              Configure o CPF da sua assinatura digital para assinar receitas com validade ICP-Brasil.
            </p>
          </div>
          <a href="/professional/account"
            className="text-xs font-semibold text-blue-700 border border-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition shrink-0">
            Configurar
          </a>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" placeholder={t("rx.search")} value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-slate-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <FileText size={40} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">{t("rx.empty")}</p>
          <button onClick={openForm} className="mt-4 text-emerald-600 text-sm font-semibold hover:underline">
            {t("rx.createFirst")} →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => {
            const meds   = p.medications as MedItem[];
            const signed = p.signatureStatus === "SIGNED" || !!p.digitalSignature;
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800">
                        {p.document?.patient
                          ? `${p.document.patient.firstName} ${p.document.patient.lastName}`
                          : t("rx.patient")}
                      </p>
                      {signed && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 size={11} /> Assinada ICP-Brasil
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {t("rx.issued")} {new Date(p.createdAt).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })}
                      {p.validUntil && ` · ${t("rx.validUntil")} ${new Date(p.validUntil).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })}`}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {meds.slice(0, 3).map((m, i) => (
                        <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                          {m.name} {m.dosage}
                        </span>
                      ))}
                      {meds.length > 3 && <span className="text-xs text-slate-400">+{meds.length - 3} {t("rx.more")}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Botão assinar */}
                    {!signed && (
                      <button onClick={() => setSignModal(p)}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-xs font-semibold transition">
                        <PenLine size={13} /> Assinar
                      </button>
                    )}
                    <a href={`/api/professional/prescriptions/${p.id}/pdf`} target="_blank"
                      className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition">
                      <Download size={14} /> {t("rx.downloadPDF")}
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de assinatura */}
      {signModal && (
        <SignModal
          prescription={signModal}
          signConfig={signConfig}
          onClose={() => setSignModal(null)}
        />
      )}

      {/* Create prescription modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white flex items-center justify-between p-5 border-b border-slate-200 z-10">
              <h2 className="font-bold text-slate-900 text-lg">
                {successPatient ? t("rx3.successTitle") : t("rx.modalTitle")}
              </h2>
              <button onClick={closeAll} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            {successPatient ? (
              <div className="p-6 space-y-5">
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
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800 flex items-start gap-3">
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                      <p>{t("rx3.inviteSent")} <strong>{successPatient.email}</strong></p>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-amber-800">{t("rx3.noAccountText")}</p>
                          <p className="text-sm text-amber-900 font-semibold mt-2">{successPatient.email}</p>
                          <p className="text-xs text-amber-700 mt-1">{t("rx3.emailCorrect")}</p>
                        </div>
                      </div>
                      {inviteError && <p className="text-sm text-rose-600">{inviteError}</p>}
                      <button onClick={sendInvite} disabled={inviteSending}
                        className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50">
                        {inviteSending ? <Loader2 size={14} className="animate-spin" /> : null}
                        {t("rx3.sendInvite")}
                      </button>
                    </div>
                  )
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600 flex items-start gap-3">
                    <AlertCircle size={18} className="text-slate-400 shrink-0 mt-0.5" />
                    <p>{t("rx3.noEmailText")}</p>
                  </div>
                )}
                <button onClick={closeAll}
                  className="w-full py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition">
                  {t("rx3.done")}
                </button>
              </div>
            ) : (
              <div className="p-5 space-y-6">
                {/* Patient */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">{t("rx2.selectPatient")}</label>
                  {selectedPatient ? (
                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center font-bold text-emerald-600 text-sm shrink-0">
                        {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                        <p className="text-xs mt-0.5">
                          {selectedPatient.hasAccount
                            ? <span className="text-emerald-600 inline-flex items-center gap-1"><CheckCircle2 size={12} /> {t("rx2.hasAccountBadge")}</span>
                            : <span className="text-amber-600 inline-flex items-center gap-1"><AlertCircle size={12} /> {t("rx2.noAccountBadge")}</span>}
                        </p>
                      </div>
                      <button onClick={() => { setSelectedPatient(null); setPatientQuery(""); }}
                        className="text-xs text-slate-500 hover:text-slate-700 font-medium shrink-0">
                        {t("rx2.changePatient")}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)}
                          placeholder={t("rx2.searchPatient")}
                          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                      </div>
                      <div className="mt-2 border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
                        {filteredCharts.length === 0 ? (
                          <div className="p-4 text-center">
                            <p className="text-sm text-slate-500">{t("rx2.noPatientFound")}</p>
                            <p className="text-xs text-slate-400 mt-1">{t("rx2.noPatientHint")}</p>
                            <a href="/professional/patients"
                              className="mt-3 inline-flex items-center gap-1.5 text-emerald-600 text-sm font-semibold hover:underline">
                              <Plus size={14} /> {t("rx2.createPatient")}
                            </a>
                          </div>
                        ) : filteredCharts.map((c) => (
                          <button key={c.id} onClick={() => setSelectedPatient(c)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition text-left">
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
                    </>
                  )}
                  {selectedPatient && selectedMissing.length > 0 && (
                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
                      <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-amber-800">
                          Para uma receita conforme o CFM, complete na ficha: <strong>{selectedMissing.map(missingLabel).join(", ")}</strong>.
                        </p>
                        <a href={`/professional/patients/${selectedPatient.id}`} target="_blank"
                          className="mt-2 inline-flex items-center gap-1.5 text-amber-900 text-xs font-semibold hover:underline">
                          <ChevronRight size={13} /> Abrir ficha
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Drug search */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-slate-700">{t("rx2.addItem")}</label>
                    <select value={drugCountry} onChange={(e) => setDrugCountry(e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600 focus:outline-none">
                      <option value="">{t("rx2.countryAll")}</option>
                      <option value="BR">🇧🇷 BR</option>
                      <option value="US">🇺🇸 US</option>
                    </select>
                  </div>
                  <div className="relative">
                    <Pill size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={drugQuery} onChange={(e) => setDrugQuery(e.target.value)}
                      placeholder={t("rx2.searchDrug")}
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                    {drugSearching && <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
                  </div>
                  {drugQuery.trim().length >= 2 && (
                    <div className="mt-2 border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
                      {drugResults.length === 0 && !drugSearching ? (
                        <div className="p-4 text-center">
                          <p className="text-sm text-slate-500">{t("rx2.noDrugsFound")}</p>
                          <button onClick={addManual}
                            className="mt-2 inline-flex items-center gap-1.5 text-emerald-600 text-sm font-semibold hover:underline">
                            <Plus size={14} /> {t("rx2.addManual")}
                          </button>
                        </div>
                      ) : drugResults.map((drug) => {
                        const ci = controlInfo(drug.prescriptionType);
                        return (
                          <button key={drug.id} onClick={() => addDrug(drug)}
                            className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition text-left">
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
                              <p className="text-xs text-slate-400">{drug.presentation}{drug.manufacturer ? ` · ${drug.manufacturer}` : ""}</p>
                            </div>
                            <Plus size={16} className="text-emerald-500 shrink-0 mt-1" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Selected meds */}
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-2">{t("rx2.selectedMeds")}</label>
                  {medications.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <p className="text-sm text-slate-400">{t("rx2.noMeds")}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {medications.map((med, index) => {
                        const ci = controlInfo(med.prescriptionType);
                        return (
                          <div key={index} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800 text-sm flex items-center gap-2 flex-wrap">
                                  {med.name}
                                  {med.controlled && ci && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${ci.tarja === "preta" ? "bg-slate-800 text-white" : "bg-red-100 text-red-600"}`}>
                                      {ci.label}
                                    </span>
                                  )}
                                </p>
                                {med.controlled && ci && (
                                  <p className={`text-[11px] mt-1 inline-flex items-center gap-1 rounded-md px-2 py-1 ${ci.tarja === "preta" ? "bg-slate-100 text-slate-700" : "bg-red-50 text-red-700"}`}>
                                    <AlertCircle size={11} />{ci.receita}
                                  </p>
                                )}
                              </div>
                              <button onClick={() => removeMedication(index)} className="text-red-400 hover:text-red-600 shrink-0">
                                <Trash2 size={15} />
                              </button>
                            </div>
                            <div className="grid sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-medium text-slate-600 block mb-1">{t("rx2.dosageLabel")} *</label>
                                <input type="text" value={med.dosage} onChange={(e) => updateMedication(index, "dosage", e.target.value)} placeholder="500mg" className="inp-sm" />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-slate-600 block mb-1">{t("rx2.frequencyLabel")} *</label>
                                <select value={med.frequency} onChange={(e) => updateMedication(index, "frequency", e.target.value)} className="inp-sm">
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
                                <input type="text" value={med.duration} onChange={(e) => updateMedication(index, "duration", e.target.value)} placeholder={t("rx.medDurationPlaceholder")} className="inp-sm" />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-slate-600 block mb-1">{t("rx2.instructionsLabel")}</label>
                                <input type="text" value={med.instructions} onChange={(e) => updateMedication(index, "instructions", e.target.value)} placeholder={t("rx.medInstructionsPlaceholder")} className="inp-sm" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Instructions + validity */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t("rx2.generalInstructions")}</label>
                  <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2}
                    placeholder={t("rx.generalInstructionsPlaceholder")} className="inp resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t("rx2.validFor")}</label>
                  <select value={validDays} onChange={(e) => setValidDays(Number(e.target.value))} className="inp">
                    <option value={7}>{t("rx.days7")}</option>
                    <option value={30}>{t("rx.days30")}</option>
                    <option value={60}>{t("rx.days60")}</option>
                    <option value={90}>{t("rx.days90")}</option>
                    <option value={180}>{t("rx.days180")}</option>
                    <option value={365}>{t("rx.days365")}</option>
                  </select>
                </div>

                {formError && <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{formError}</p>}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeAll}
                    className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition">
                    {t("rx2.cancel")}
                  </button>
                  <button type="button" onClick={handleSubmit} disabled={saving}
                    className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle2 size={14} /> : null}
                    {saved ? t("rx2.saved") : saving ? t("rx2.saving") : t("rx2.save")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .inp { width: 100%; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 10px 14px; font-size: 14px; color: #1e293b; outline: none; background: white; }
        .inp:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,.1); }
        .inp-sm { width: 100%; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; font-size: 13px; color: #1e293b; outline: none; background: white; }
        .inp-sm:focus { border-color: #10b981; }
      `}</style>
    </div>
  );
}
