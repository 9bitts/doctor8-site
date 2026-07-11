"use client";

import { useState, useCallback } from "react";
import { Loader2, Check, X, Plus } from "lucide-react";
import PrescriptionMedItemForm, {
  type PrescriptionMedItem,
} from "@/components/professional/prescriptions/PrescriptionMedItemForm";
import DrugSearchResults, {
  type DrugSearchResult,
} from "@/components/professional/prescriptions/DrugSearchResults";
import { DRUG_COUNTRIES, type DrugCountryCode } from "@/lib/drug-countries";
import { TEMPLATE_CATEGORIES } from "@/lib/clinical-template-utils";
import MedicinaNaturalSearchResults from "@/components/medicina-natural-catalog/MedicinaNaturalSearchResults";
import {
  fetchMnFitoterapicosForPrescription,
  phytoMedItemFromMnListItem,
  type PrescriptionItemSearchMode,
} from "@/lib/medicina-natural-catalog/prescription-search";
import type { MedicinaNaturalListItem } from "@/lib/medicina-natural-catalog/search-server";

const inputClass =
  "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40";

function controlInfo(type: string | null | undefined): {
  tarja: "preta" | "vermelha"; label: string; receita: string;
} | null {
  if (!type) return null;
  const code = type.toUpperCase();
  const A = "Exige Notificação de Receita A (amarela)";
  const B = "Exige Notificação de Receita B (azul)";
  const C = "Exige Receita de Controle Especial (2 vias)";
  const map: Record<string, { tarja: "preta" | "vermelha"; label: string; receita: string }> = {
    A1: { tarja: "preta", label: "A1 — Receita A", receita: A },
    A2: { tarja: "preta", label: "A2 — Receita A", receita: A },
    B1: { tarja: "preta", label: "B1 — Receita B", receita: B },
    C1: { tarja: "vermelha", label: "C1 — Controle especial", receita: C },
  };
  return map[code] || { tarja: "vermelha", label: "Controlado", receita: C };
}

function medItemFieldErrors(m: PrescriptionMedItem) {
  const kind = m.itemKind || "medication";
  return {
    name: !m.name.trim(),
    dosage: kind === "medication" && !m.dosage?.trim(),
    frequency: kind === "medication" && !m.frequency?.trim(),
  };
}

function isMedsFormValid(medications: PrescriptionMedItem[]): boolean {
  return medications.length > 0 && medications.every((m) => {
    const e = medItemFieldErrors(m);
    return !e.name && !e.dosage && !e.frequency;
  });
}

function rxFieldClass(invalid: boolean): string {
  return invalid ? " !border-rose-400 !bg-rose-50" : "";
}

export interface RxTemplateData {
  id: string;
  name: string;
  medications: PrescriptionMedItem[];
  instructions: string;
  validDays: number;
}

interface RxTemplateFormProps {
  editing?: RxTemplateData | null;
  t: (k: string) => string;
  onSaved: () => void;
  onCancel: () => void;
}

export function RxTemplateForm({ editing, t, onSaved, onCancel }: RxTemplateFormProps) {
  const [name, setName] = useState(editing?.name || "");
  const [medications, setMedications] = useState<PrescriptionMedItem[]>(
    editing?.medications?.map((m) => ({ ...m })) || [],
  );
  const [instructions, setInstructions] = useState(editing?.instructions || "");
  const [validDays, setValidDays] = useState(editing?.validDays || 30);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const [drugQuery, setDrugQuery] = useState("");
  const [drugResults, setDrugResults] = useState<DrugSearchResult[]>([]);
  const [drugSearching, setDrugSearching] = useState(false);
  const [drugSearchDone, setDrugSearchDone] = useState(false);
  const [drugSearchModalOpen, setDrugSearchModalOpen] = useState(false);
  const [drugCountry, setDrugCountry] = useState<DrugCountryCode>("BR");
  const [itemSearchMode, setItemSearchMode] = useState<PrescriptionItemSearchMode>("medication");
  const [mnSearchResults, setMnSearchResults] = useState<MedicinaNaturalListItem[]>([]);
  const [mnPickerTargetIndex, setMnPickerTargetIndex] = useState<number | null>(null);
  const phytoMode = itemSearchMode === "phytotherapy";

  const searchDrugs = useCallback(async () => {
    const q = drugQuery.trim();
    if (q.length < 2) return;
    setDrugSearchModalOpen(true);
    setDrugSearching(true);
    setDrugSearchDone(false);
    setDrugResults([]);
    setMnSearchResults([]);
    try {
      if (phytoMode) {
        const items = await fetchMnFitoterapicosForPrescription("/api/professional", q);
        setMnSearchResults(items);
      } else {
        const res = await fetch(
          `/api/professional/drugs/search?q=${encodeURIComponent(q)}&country=${drugCountry}`,
        );
        const d = await res.json();
        setDrugResults(res.ok ? (d.drugs || []) : []);
      }
    } catch {
      setDrugResults([]);
      setMnSearchResults([]);
    } finally {
      setDrugSearching(false);
      setDrugSearchDone(true);
    }
  }, [drugQuery, drugCountry, phytoMode]);

  function addPhytoItem(item: PrescriptionMedItem) {
    if (mnPickerTargetIndex !== null) {
      setMedications((prev) =>
        prev.map((m, i) => (i === mnPickerTargetIndex ? { ...m, ...item } : m)),
      );
    } else {
      setMedications((prev) => [...prev, item]);
    }
    setDrugQuery("");
    setDrugResults([]);
    setMnSearchResults([]);
    setDrugSearchModalOpen(false);
    setMnPickerTargetIndex(null);
  }

  function addDrug(drug: DrugSearchResult) {
    const substance = drug.activeIngredient?.trim() || drug.name;
    setMedications((prev) => [...prev, {
      name: substance,
      dosage: drug.dosage?.trim() || "",
      frequency: "",
      duration: "",
      instructions: "",
      presentation: drug.presentation,
      pharmaceuticalForm: drug.pharmaceuticalForm?.trim() || "",
      controlled: drug.controlled,
      prescriptionType: drug.prescriptionType,
      itemKind: "medication",
    }]);
    setDrugQuery("");
    setDrugResults([]);
    setDrugSearchModalOpen(false);
  }

  function addManual() {
    const n = drugQuery.trim();
    setMedications((prev) => [...prev, {
      name: n || "",
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
      itemKind: phytoMode ? "phytotherapy" : "medication",
    }]);
    setDrugQuery("");
    setDrugSearchModalOpen(false);
  }

  function addSpecialPhyto() {
    setItemSearchMode("phytotherapy");
    setMedications((prev) => [...prev, {
      name: "",
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
      itemKind: "phytotherapy",
    }]);
  }

  function removeMedication(index: number) {
    setMedications((prev) => prev.filter((_, i) => i !== index));
  }

  function updateMedication(index: number, field: keyof PrescriptionMedItem, value: string) {
    setMedications((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  }

  async function handleSave() {
    if (!name.trim()) {
      setError(t("tmpl.fillName"));
      return;
    }
    if (!isMedsFormValid(medications)) {
      setShowErrors(true);
      setError(t("rx2.incompleteItems"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const cleanMeds = medications.map((m) => ({
        name: m.name.trim(),
        dosage: m.dosage || "",
        frequency: m.frequency || "",
        duration: m.duration,
        instructions: m.instructions,
        presentation: m.presentation || "",
        pharmaceuticalForm: m.pharmaceuticalForm || "",
        itemKind: m.itemKind || "medication",
        mnSlug: m.mnSlug,
      }));
      const payload = {
        name: name.trim(),
        templateCategory: TEMPLATE_CATEGORIES.RX_POSTOP,
        medications: cleanMeds,
        instructions,
        validDays,
      };
      const res = editing
        ? await fetch(`/api/professional/templates/prescriptions/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/professional/templates/prescriptions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("tmpl.saveError"));
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("tmpl.saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-slate-50 rounded-xl p-4 space-y-4 border border-slate-100">
      {error && (
        <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>
      )}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">{t("tmpl.templateName")}</label>
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)}
          placeholder={t("tmpl.rxPostopNamePlaceholder")} />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setItemSearchMode("medication")}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
              itemSearchMode === "medication"
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            {t("rx.searchMode.medication")}
          </button>
          <button
            type="button"
            onClick={() => setItemSearchMode("phytotherapy")}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
              itemSearchMode === "phytotherapy"
                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            {t("rx.searchMode.phytotherapy")}
          </button>
        </div>
        <p className="text-xs font-medium text-slate-600">
          {phytoMode ? t("rx.phytoCatalogSearch") : t("rx2.searchDrug")}
        </p>
        {!phytoMode && (
        <div className="flex flex-wrap gap-2">
          {DRUG_COUNTRIES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => setDrugCountry(c.code)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${
                drugCountry === c.code
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              <span aria-hidden>{c.flag}</span>
              {t(c.labelKey)}
            </button>
          ))}
        </div>
        )}
        <div className="flex items-center rounded-xl border border-slate-200 bg-white">
          <input
            type="text"
            value={drugQuery}
            onChange={(e) => setDrugQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void searchDrugs(); } }}
            placeholder={phytoMode ? t("rx.phytoCatalogSearch") : t("rx2.searchDrug")}
            className="flex-1 border-0 bg-transparent outline-none py-2.5 pl-3 text-sm"
          />
          {drugSearching ? (
            <Loader2 size={15} className="shrink-0 mr-3 animate-spin text-slate-400" />
          ) : (
            <button
              type="button"
              onClick={() => void searchDrugs()}
              disabled={drugQuery.trim().length < 2}
              className="shrink-0 mr-1.5 px-3 py-1.5 rounded-lg bg-brand-500 text-white text-xs font-semibold disabled:opacity-50"
            >
              {t("pubSearch.search")}
            </button>
          )}
        </div>
        {drugSearchModalOpen && drugSearchDone && !phytoMode && drugResults.length === 0 && (
          <p className="text-xs text-slate-500">{t("rx2.noDrugsFound")}</p>
        )}
        {drugSearchModalOpen && mnSearchResults.length > 0 && (
          <MedicinaNaturalSearchResults
            results={mnSearchResults}
            onSelect={(item) => addPhytoItem(phytoMedItemFromMnListItem(item))}
          />
        )}
        {drugSearchModalOpen && !phytoMode && drugResults.length > 0 && (
          <DrugSearchResults results={drugResults} onSelect={addDrug} controlInfo={controlInfo} />
        )}
        <button type="button" onClick={() => addSpecialPhyto()}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 text-emerald-800 font-semibold text-sm">
          <Plus size={16} /> {t("rx.addPhytotherapy")}
        </button>
        <button type="button" onClick={addManual}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-brand-200 bg-brand-50/50 text-brand-600 font-semibold text-sm">
          <Plus size={16} /> {t("rx2.addManual")}
        </button>
      </div>

      {medications.length > 0 && (
        <div className="space-y-3">
          {medications.map((med, i) => (
            <PrescriptionMedItemForm
              key={i}
              med={med}
              index={i}
              showErrors={showErrors}
              fieldErrors={medItemFieldErrors(med)}
              kindLabel={
                med.itemKind === "phytotherapy" ? t("rx.itemKind.phytotherapy") : null
              }
              controlInfo={controlInfo(med.prescriptionType)}
              onUpdate={updateMedication}
              onOpenPhytoSearch={(index) => {
                setItemSearchMode("phytotherapy");
                setMnPickerTargetIndex(index);
                setDrugQuery("");
                setMnSearchResults([]);
                setDrugResults([]);
                setDrugSearchDone(false);
                setDrugSearchModalOpen(false);
              }}
              onRemove={removeMedication}
              t={t}
              rxFieldClass={rxFieldClass}
            />
          ))}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">{t("rx.generalInstructions")}</label>
        <textarea className={inputClass + " resize-y min-h-[60px]"} value={instructions}
          onChange={(e) => setInstructions(e.target.value)} rows={2} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">{t("rx2.validFor")}</label>
        <select className={inputClass + " bg-white max-w-[200px]"} value={validDays}
          onChange={(e) => setValidDays(Number(e.target.value))}>
          <option value={7}>{t("rx.days7")}</option>
          <option value={30}>{t("rx.days30")}</option>
          <option value={60}>{t("rx.days60")}</option>
          <option value={90}>{t("rx.days90")}</option>
          <option value={180}>{t("rx.days180")}</option>
          <option value={365}>{t("rx.days365")}</option>
        </select>
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 flex items-center gap-1">
          <X size={14} /> {t("common.cancel")}
        </button>
        <button type="button" onClick={handleSave} disabled={saving}
          className="px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-semibold flex items-center gap-1 disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {editing ? t("tmpl.saveChanges") : t("tmpl.createTemplate")}
        </button>
      </div>
    </div>
  );
}
