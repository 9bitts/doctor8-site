"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ExternalLink,
  Info,
  Loader2,
  Search,
  Tag,
  X,
} from "lucide-react";
import { useT } from "@/lib/i18n/I18nProvider";

type SearchHit = {
  drugCatalogId?: string;
  name: string;
  activeIngredient: string;
  presentation: string;
  manufacturer?: string | null;
};

type PharmacyOffer = {
  pharmacyName: string;
  priceCents: number;
  purchaseUrl: string;
  deliveryEta?: string;
};

type PharmacyConfig = {
  marketplaceEnabled: boolean;
  mode: string;
};

type ReferencePrice = {
  priceCents: number;
  priceType: string;
  source: string;
  sourceUrl: string;
  cmedTableLabel?: string;
  matchedName: string;
  isRegulatedReference: true;
};

type SearchFilters = {
  name: string;
  manufacturer: string;
  activeIngredient: string;
  presentation: string;
};

const EMPTY_FILTERS: SearchFilters = {
  name: "",
  manufacturer: "",
  activeIngredient: "",
  presentation: "",
};

function formatBrl(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function hasAnyFilter(filters: SearchFilters): boolean {
  return Object.values(filters).some((v) => v.trim().length >= 2);
}

interface PharmacyMarketplacePanelProps {
  onSaved: () => void;
}

export default function PharmacyMarketplacePanel({ onSaved }: PharmacyMarketplacePanelProps) {
  const t = useT();
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [results, setResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<SearchHit | null>(null);
  const [reference, setReference] = useState<ReferencePrice | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [referenceMissing, setReferenceMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pharmacyConfig, setPharmacyConfig] = useState<PharmacyConfig | null>(null);
  const [cep, setCep] = useState("");
  const [offers, setOffers] = useState<PharmacyOffer[]>([]);
  const [purchaseUrl, setPurchaseUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/patient/pharmacy/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        if (cfg) setPharmacyConfig({ marketplaceEnabled: cfg.marketplaceEnabled, mode: cfg.mode });
      })
      .catch(() => {});
  }, []);

  const runSearch = useCallback(async () => {
    if (!hasAnyFilter(filters)) {
      setResults([]);
      setSearched(false);
      return;
    }

    setSearching(true);
    setSearched(true);
    setSelected(null);
    setReference(null);
    setReferenceMissing(false);
    setSaveError(null);
    setOffers([]);
    setPurchaseUrl(null);

    try {
      const params = new URLSearchParams();
      if (filters.name.trim()) params.set("name", filters.name.trim());
      if (filters.manufacturer.trim()) params.set("manufacturer", filters.manufacturer.trim());
      if (filters.activeIngredient.trim()) {
        params.set("activeIngredient", filters.activeIngredient.trim());
      }
      if (filters.presentation.trim()) params.set("presentation", filters.presentation.trim());

      const res = await fetch(`/api/patient/pharmacy/search?${params}`);
      const data = await res.json();
      setResults(data.results || []);
    } finally {
      setSearching(false);
    }
  }, [filters]);

  const loadPrice = useCallback(async (hit: SearchHit, cepValue?: string) => {
    setSelected(hit);
    setReference(null);
    setReferenceMissing(false);
    setSaveError(null);
    setOffers([]);
    setPurchaseUrl(null);
    setDetailLoading(true);

    try {
      const params = new URLSearchParams();
      if (hit.drugCatalogId) params.set("drugCatalogId", hit.drugCatalogId);
      else {
        params.set("name", hit.name);
        params.set("activeIngredient", hit.activeIngredient);
        params.set("presentation", hit.presentation);
      }
      const cepDigits = (cepValue ?? cep).replace(/\D/g, "");
      if (cepDigits.length >= 8) params.set("cep", cepDigits);

      const res = await fetch(`/api/patient/pharmacy/offers?${params}`);
      const data = await res.json();
      if (res.ok) {
        setReference(data.reference || null);
        setReferenceMissing(!data.reference);
        setOffers(data.offers || []);
        setPurchaseUrl(data.fallbackPurchaseUrl || null);
      }
    } finally {
      setDetailLoading(false);
    }
  }, [cep]);

  const marketplaceActive =
    pharmacyConfig?.marketplaceEnabled && pharmacyConfig.mode !== "disabled";

  function closeModal() {
    setSelected(null);
    setReference(null);
    setReferenceMissing(false);
    setSaveError(null);
    setOffers([]);
    setPurchaseUrl(null);
    setDetailLoading(false);
  }

  async function handleSave() {
    if (!selected?.drugCatalogId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/patient/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flow: "PURCHASE",
          name: selected.name,
          dosage: selected.presentation,
          drugCatalogId: selected.drugCatalogId,
          referencePriceCents: reference?.priceCents,
          notes: selected.manufacturer
            ? `${t("pharmacy.manufacturer")}: ${selected.manufacturer}`
            : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error?.message || t("pharmacy.saveError"));
        return;
      }
      closeModal();
      setResults([]);
      setSearched(false);
      setFilters(EMPTY_FILTERS);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-b border-slate-200 bg-gradient-to-b from-blue-50/80 to-white px-5 py-4 space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-800">{t("pharmacy.title")}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{t("pharmacy.subtitleReference")}</p>
      </div>

      <div className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-950 leading-relaxed">
        <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-900">{t("pharmacy.referenceWarningTitle")}</p>
          <p className="mt-1">{t("pharmacy.referenceWarningBody")}</p>
        </div>
      </div>

      <p className="text-xs text-slate-500 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 leading-relaxed">
        {t("pharmacy.noPurchaseNote")}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FilterField
          label={t("pharmacy.filterName")}
          value={filters.name}
          onChange={(v) => setFilters({ ...filters, name: v })}
          placeholder={t("pharmacy.filterNamePlaceholder")}
        />
        <FilterField
          label={t("pharmacy.filterManufacturer")}
          value={filters.manufacturer}
          onChange={(v) => setFilters({ ...filters, manufacturer: v })}
          placeholder={t("pharmacy.filterManufacturerPlaceholder")}
        />
        <FilterField
          label={t("pharmacy.filterIngredient")}
          value={filters.activeIngredient}
          onChange={(v) => setFilters({ ...filters, activeIngredient: v })}
          placeholder={t("pharmacy.filterIngredientPlaceholder")}
        />
        <FilterField
          label={t("pharmacy.filterPresentation")}
          value={filters.presentation}
          onChange={(v) => setFilters({ ...filters, presentation: v })}
          placeholder={t("pharmacy.filterPresentationPlaceholder")}
        />
      </div>

      <button
        type="button"
        onClick={runSearch}
        disabled={searching || !hasAnyFilter(filters)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition"
      >
        {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
        {t("pharmacy.searchButton")}
      </button>

      <p className="text-[11px] text-slate-400">{t("pharmacy.searchHint")}</p>

      {searched && !searching && results.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-4">{t("pharmacy.noResults")}</p>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-600">{t("pharmacy.clickToSeePrice")}</p>
          {results.map((hit) => (
            <button
              key={hit.drugCatalogId || hit.name}
              type="button"
              onClick={() => loadPrice(hit)}
              className="w-full text-left rounded-xl border border-slate-200 bg-white p-3 transition hover:border-blue-300 hover:bg-blue-50/50"
            >
              <p className="text-sm font-bold text-slate-800">{hit.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{hit.activeIngredient}</p>
              <p className="text-xs text-slate-400 mt-0.5">{hit.presentation}</p>
              {hit.manufacturer && (
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <Tag size={11} />
                  {hit.manufacturer}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-200">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  {t("pharmacy.selectedDrug")}
                </p>
                <p className="text-base font-bold text-slate-900 mt-1 leading-snug">{selected.name}</p>
                <p className="text-xs text-slate-500 mt-1">{selected.activeIngredient}</p>
                <p className="text-xs text-slate-400 mt-0.5">{selected.presentation}</p>
                {selected.manufacturer && (
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Tag size={11} />
                    {selected.manufacturer}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                aria-label={t("pharmacy.closeModal")}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {detailLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                  <Loader2 size={22} className="animate-spin text-blue-500" />
                  {t("pharmacy.loadingReference")}
                </div>
              ) : reference ? (
                <div className="text-center space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t("pharmacy.referencePriceLabel")}
                  </p>
                  <p className="text-4xl font-extrabold text-emerald-600">
                    {formatBrl(reference.priceCents)}
                  </p>
                  <p className="text-xs text-slate-500">{t("pharmacy.referencePriceType")}</p>
                  <div className="flex gap-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-left">
                    <Info size={14} className="shrink-0 mt-0.5" />
                    <span>{t("pharmacy.referencePriceNote")}</span>
                  </div>
                  <a
                    href={reference.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  >
                    {t("pharmacy.viewOnSource")}
                    <ExternalLink size={12} />
                  </a>
                </div>
              ) : referenceMissing ? (
                <p className="text-sm text-slate-500 text-center py-6">{t("pharmacy.referenceNotFound")}</p>
              ) : null}

              {!detailLoading && marketplaceActive && purchaseUrl && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-4 space-y-3">
                  <p className="text-xs text-blue-900 leading-relaxed">{t("pharmacy.deeplinkHint")}</p>
                  <div>
                    <label className="block text-[11px] font-semibold text-blue-800 mb-1">
                      CEP
                    </label>
                    <input
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                      placeholder={t("pharmacy.cepPlaceholder")}
                      className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-800"
                    />
                    <p className="mt-1 text-[10px] text-blue-700/80">{t("pharmacy.deeplinkCepHint")}</p>
                  </div>
                  {offers.length > 0 && (
                    <ul className="space-y-2 text-left">
                      {offers.slice(0, 3).map((offer) => (
                        <li
                          key={`${offer.pharmacyName}-${offer.purchaseUrl}`}
                          className="flex items-center justify-between gap-2 text-xs bg-white rounded-lg border border-blue-100 px-3 py-2"
                        >
                          <span className="font-medium text-slate-800 truncate">{offer.pharmacyName}</span>
                          <a
                            href={offer.purchaseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-blue-600 font-semibold hover:underline"
                          >
                            {formatBrl(offer.priceCents)}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                  <a
                    href={purchaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm py-3 transition"
                  >
                    {t("pharmacy.compareAndBuy")}
                    <ExternalLink size={14} />
                  </a>
                  {cep.replace(/\D/g, "").length >= 8 && selected && (
                    <button
                      type="button"
                      onClick={() => loadPrice(selected, cep)}
                      className="w-full text-xs font-medium text-blue-700 hover:text-blue-900 transition"
                    >
                      {t("pharmacy.searchButton")}
                    </button>
                  )}
                </div>
              )}

              {!detailLoading && reference && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-bold text-sm transition flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {saving ? t("docs.modal.saving") : t("pharmacy.saveToList")}
                </button>
              )}

              {saveError && (
                <p className="text-xs text-red-600 text-center">{saveError}</p>
              )}

              <button
                type="button"
                onClick={closeModal}
                className="w-full py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition"
              >
                {t("pharmacy.chooseAnother")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600 mb-1 block">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}
