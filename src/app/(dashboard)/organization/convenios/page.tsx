"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Download, Shield } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";

function fmt(c: number, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(c / 100);
}

import { DENTAL_PROCEDURES } from "@/lib/dentistry/procedures";

type Tab = "convenios" | "guias" | "lotes";

export default function OrganizationConveniosPage() {
  const { lang, t } = useI18n();
  const locale = localeOf(lang);
  const [tab, setTab] = useState<Tab>("convenios");
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<{ id: string; operatorName: string; ansRegistry: string | null; active: boolean }[]>([]);
  const [guides, setGuides] = useState<{ id: string; guideNumber: string | null; guideType?: string; procedureName?: string; patientName: string; amountCents: number; status: string; operatorName: string; batchId: string | null }[]>([]);
  const [batches, setBatches] = useState<{ id: string; batchNumber: string; operatorName: string; totalAmountCents: number; status: string; guideCount: number }[]>([]);
  const [professionals, setProfessionals] = useState<{ professionalId: string; name: string }[]>([]);

  const [newPlan, setNewPlan] = useState({ operatorName: "", ansRegistry: "", contractNumber: "" });
  const [newGuide, setNewGuide] = useState({
    orgHealthPlanId: "",
    professionalId: "",
    patientName: "",
    cardNumber: "",
    amount: "",
    serviceDate: "",
    guideType: "CONSULTA" as "CONSULTA" | "ODONTO",
    procedureCode: "10101012",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [pRes, gRes, bRes, mRes] = await Promise.all([
      fetch("/api/organization/convenios"),
      fetch("/api/organization/tiss/guides?status=DRAFT"),
      fetch("/api/organization/tiss/batches"),
      fetch("/api/organization/members"),
    ]);
    const [p, g, b, m] = await Promise.all([pRes.json(), gRes.json(), bRes.json(), mRes.json()]);
    if (pRes.ok) setPlans(p.plans || []);
    if (gRes.ok) setGuides(g.guides || []);
    if (bRes.ok) setBatches(b.batches || []);
    if (mRes.ok) setProfessionals((m.professionals || []).map((x: { professionalId: string; name: string }) => ({ professionalId: x.professionalId, name: x.name })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addPlan(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/organization/convenios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPlan),
    });
    setNewPlan({ operatorName: "", ansRegistry: "", contractNumber: "" });
    await load();
  }

  async function addGuide(e: React.FormEvent) {
    e.preventDefault();
    const amountCents = Math.round(parseFloat(newGuide.amount.replace(",", ".")) * 100);
    const proc = DENTAL_PROCEDURES.find((p) => p.code === newGuide.procedureCode);
    await fetch("/api/organization/tiss/guides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgHealthPlanId: newGuide.orgHealthPlanId,
        professionalId: newGuide.professionalId,
        patientName: newGuide.patientName,
        cardNumber: newGuide.cardNumber || undefined,
        amountCents,
        serviceDate: newGuide.serviceDate,
        guideType: newGuide.guideType,
        procedureCode: newGuide.procedureCode,
        procedureName: proc ? t(proc.nameKey) : undefined,
      }),
    });
    setNewGuide({
      orgHealthPlanId: "",
      professionalId: "",
      patientName: "",
      cardNumber: "",
      amount: "",
      serviceDate: "",
      guideType: "CONSULTA",
      procedureCode: "10101012",
    });
    await load();
  }

  async function createBatch() {
    const draftIds = guides.filter((g) => !g.batchId).map((g) => g.id);
    if (draftIds.length === 0 || !plans[0]) return;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const res = await fetch("/api/organization/tiss/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgHealthPlanId: plans[0].id,
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
        guideIds: draftIds,
      }),
    });
    if (res.ok) await load();
  }

  function exportBatch(id: string) {
    window.open(`/api/organization/tiss/batches/${id}/export`, "_blank");
  }

  const draftCount = guides.filter((g) => !g.batchId).length;

  const tabs: { id: Tab; label: string }[] = [
    { id: "convenios", label: t("org.convenios.tabPlans") },
    { id: "guias", label: t("org.convenios.tabGuides") },
    { id: "lotes", label: t("org.convenios.tabBatches") },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="text-indigo-600" size={24} />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("org.convenios.title")}</h1>
          <p className="text-slate-500 text-sm">{t("org.convenios.subtitle")}</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {tabs.map((tabItem) => (
          <button key={tabItem.id} onClick={() => setTab(tabItem.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === tabItem.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500"}`}>
            {tabItem.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
      ) : tab === "convenios" ? (
        <div className="space-y-4">
          <form onSubmit={addPlan} className="bg-white rounded-2xl border p-5 grid sm:grid-cols-3 gap-3">
            <input required placeholder={t("org.convenios.operatorPlaceholder")} value={newPlan.operatorName} onChange={(e) => setNewPlan({ ...newPlan, operatorName: e.target.value })}
              className="border rounded-xl px-3 py-2 text-sm" />
            <input placeholder={t("org.convenios.ansPlaceholder")} value={newPlan.ansRegistry} onChange={(e) => setNewPlan({ ...newPlan, ansRegistry: e.target.value })}
              className="border rounded-xl px-3 py-2 text-sm" />
            <button type="submit" className="bg-indigo-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-1">
              <Plus size={16} /> {t("org.convenios.register")}
            </button>
          </form>
          <div className="bg-white rounded-2xl border divide-y">
            {plans.length === 0 ? <p className="p-6 text-slate-400 text-sm">{t("org.convenios.noPlans")}</p> : plans.map((p) => (
              <div key={p.id} className="px-5 py-4 flex justify-between">
                <div>
                  <p className="font-medium">{p.operatorName}</p>
                  <p className="text-xs text-slate-500">ANS: {p.ansRegistry || "?"}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${p.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100"}`}>
                  {p.active ? t("org.convenios.active") : t("org.convenios.inactive")}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : tab === "guias" ? (
        <div className="space-y-4">
          <form onSubmit={addGuide} className="bg-white rounded-2xl border p-5 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <select required value={newGuide.orgHealthPlanId} onChange={(e) => setNewGuide({ ...newGuide, orgHealthPlanId: e.target.value })}
                className="border rounded-xl px-3 py-2 text-sm">
                <option value="">{t("org.convenios.selectPlan")}</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.operatorName}</option>)}
              </select>
              <select required value={newGuide.professionalId} onChange={(e) => setNewGuide({ ...newGuide, professionalId: e.target.value })}
                className="border rounded-xl px-3 py-2 text-sm">
                <option value="">{t("org.convenios.selectProfessional")}</option>
                {professionals.map((p) => <option key={p.professionalId} value={p.professionalId}>{p.name}</option>)}
              </select>
              <select
                value={newGuide.guideType}
                onChange={(e) => {
                  const guideType = e.target.value as "CONSULTA" | "ODONTO";
                  setNewGuide({
                    ...newGuide,
                    guideType,
                    procedureCode: guideType === "ODONTO" ? "81000030" : "10101012",
                  });
                }}
                className="border rounded-xl px-3 py-2 text-sm"
              >
                <option value="CONSULTA">{t("dental.tiss.guideConsulta")}</option>
                <option value="ODONTO">{t("dental.tiss.guideOdonto")}</option>
              </select>
              <select
                value={newGuide.procedureCode}
                onChange={(e) => setNewGuide({ ...newGuide, procedureCode: e.target.value })}
                className="border rounded-xl px-3 py-2 text-sm sm:col-span-2"
              >
                {(newGuide.guideType === "ODONTO" ? DENTAL_PROCEDURES : [{ code: "10101012", nameKey: "dental.tiss.procConsulta", defaultPriceCents: 0, category: "preventive" as const }]).map((p) => (
                  <option key={p.code} value={p.code}>{p.code} — {t(p.nameKey)}</option>
                ))}
              </select>
              <input required placeholder={t("org.convenios.patientNamePlaceholder")} value={newGuide.patientName} onChange={(e) => setNewGuide({ ...newGuide, patientName: e.target.value })}
                className="border rounded-xl px-3 py-2 text-sm" />
              <input placeholder={t("org.convenios.cardPlaceholder")} value={newGuide.cardNumber} onChange={(e) => setNewGuide({ ...newGuide, cardNumber: e.target.value })}
                className="border rounded-xl px-3 py-2 text-sm" />
              <input required placeholder={t("org.ledger.amountPlaceholder")} value={newGuide.amount} onChange={(e) => setNewGuide({ ...newGuide, amount: e.target.value })}
                className="border rounded-xl px-3 py-2 text-sm" />
              <input type="date" value={newGuide.serviceDate} onChange={(e) => setNewGuide({ ...newGuide, serviceDate: e.target.value })}
                className="border rounded-xl px-3 py-2 text-sm" />
            </div>
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium">{t("org.convenios.createGuide")}</button>
          </form>
          <div className="bg-white rounded-2xl border divide-y">
            {guides.map((g) => (
              <div key={g.id} className="px-5 py-3 flex justify-between text-sm">
                <span>{g.guideNumber} - {g.patientName} ({g.operatorName}) {g.guideType === "ODONTO" ? "· Odonto" : ""}</span>
                <span className="font-medium">{fmt(g.amountCents, locale)} · {g.status}</span>
              </div>
            ))}
          </div>
          {draftCount > 0 && (
            <button onClick={createBatch} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium text-sm">
              {t("org.convenios.createBatch").replace("{{n}}", String(draftCount))}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border divide-y">
          {batches.length === 0 ? <p className="p-6 text-slate-400 text-sm">{t("org.convenios.noBatches")}</p> : batches.map((b) => (
            <div key={b.id} className="px-5 py-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{b.batchNumber} - {b.operatorName}</p>
                <p className="text-xs text-slate-500">{b.guideCount} · {fmt(b.totalAmountCents, locale)} · {b.status}</p>
              </div>
              <button onClick={() => exportBatch(b.id)}
                className="flex items-center gap-1 text-indigo-600 text-sm font-medium hover:text-indigo-700">
                <Download size={16} /> {t("org.convenios.exportXml")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
