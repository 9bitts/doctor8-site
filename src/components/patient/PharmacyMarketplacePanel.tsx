"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, MapPin, Search } from "lucide-react";
import { useT } from "@/lib/i18n/I18nProvider";

type PharmacyMode = "disabled" | "deeplink" | "api";

type PharmacyConfig = {
  enabled: boolean;
  provider: string;
  mode: PharmacyMode;
  requiresCep: boolean;
  affiliateTrackingReady: boolean;
};

type SearchHit = {
  drugCatalogId?: string;
  name: string;
  activeIngredient: string;
  presentation: string;
  manufacturer?: string | null;
  lowestPriceCents?: number;
  offerCount?: number;
};

type PharmacyOffer = {
  pharmacyName: string;
  priceCents: number;
  currency: "BRL";
  deliveryEta?: string;
  inStock: boolean;
  purchaseUrl: string;
};

function formatBrl(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function readStoredCep(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("doctor8_pharmacy_cep") || "";
}

function storeCep(cep: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("doctor8_pharmacy_cep", cep);
}

export default function PharmacyMarketplacePanel() {
  const t = useT();
  const [config, setConfig] = useState<PharmacyConfig | null>(null);
  const [cep, setCep] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchHit | null>(null);
  const [offers, setOffers] = useState<PharmacyOffer[]>([]);
  const [purchaseUrl, setPurchaseUrl] = useState<string | null>(null);
  const [offersLoading, setOffersLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setCep(readStoredCep());
    fetch("/api/patient/pharmacy/config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setConfig({ enabled: false, provider: "consulta-remedios", mode: "disabled", requiresCep: true, affiliateTrackingReady: false }));
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const loadOffers = useCallback(async (hit: SearchHit, cepValue: string) => {
    setOffersLoading(true);
    setSelected(hit);
    setOffers([]);
    setPurchaseUrl(null);
    try {
      const params = new URLSearchParams();
      if (hit.drugCatalogId) params.set("drugCatalogId", hit.drugCatalogId);
      else {
        params.set("name", hit.name);
        params.set("activeIngredient", hit.activeIngredient);
        params.set("presentation", hit.presentation);
      }
      if (cepValue) params.set("cep", cepValue);

      const res = await fetch(`/api/patient/pharmacy/offers?${params}`);
      const data = await res.json();
      if (res.ok) {
        setOffers(data.offers || []);
        setPurchaseUrl(data.fallbackPurchaseUrl || null);
      }
    } finally {
      setOffersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!config?.enabled) return;
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ q: query.trim() });
        if (cep) params.set("cep", cep);
        const res = await fetch(`/api/patient/pharmacy/search?${params}`);
        const data = await res.json();
        setResults(data.results || []);
        setShowDropdown(true);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query, cep, config?.enabled]);

  function handleCepChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    const formatted =
      digits.length > 5
        ? `${digits.slice(0, 5)}-${digits.slice(5)}`
        : digits;
    setCep(formatted);
    storeCep(formatted);
  }

  if (!config) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 size={20} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (!config.enabled) {
    return (
      <div className="mx-5 mt-4 mb-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
        {t("pharmacy.comingSoon")}
      </div>
    );
  }

  return (
    <div className="border-b border-slate-200 bg-gradient-to-b from-blue-50/80 to-white px-5 py-4 space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-800">{t("pharmacy.title")}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{t("pharmacy.subtitle")}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <label className="flex items-center gap-2 flex-1">
          <MapPin size={14} className="text-blue-600 shrink-0" />
          <input
            type="text"
            inputMode="numeric"
            value={cep}
            onChange={(e) => handleCepChange(e.target.value)}
            placeholder={t("pharmacy.cepPlaceholder")}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
          />
        </label>
      </div>

      <div ref={searchRef} className="relative">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder={t("pharmacy.searchPlaceholder")}
            className="w-full border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          {searching && (
            <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
          )}
        </div>

        {showDropdown && results.length > 0 && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
            {results.map((hit) => (
              <button
                key={hit.drugCatalogId || hit.name}
                type="button"
                onClick={() => {
                  setQuery(hit.name);
                  setShowDropdown(false);
                  loadOffers(hit, cep);
                }}
                className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-100 last:border-0"
              >
                <p className="text-sm font-semibold text-slate-800">{hit.name}</p>
                <p className="text-xs text-slate-500">
                  {hit.activeIngredient}
                  {hit.presentation ? ` ? ${hit.presentation}` : ""}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="rounded-xl border border-blue-200 bg-white p-4 space-y-3">
          <div>
            <p className="text-sm font-bold text-slate-800">{selected.name}</p>
            <p className="text-xs text-slate-500">{selected.activeIngredient}</p>
          </div>

          {offersLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 size={14} className="animate-spin" />
              {t("pharmacy.loadingOffers")}
            </div>
          ) : offers.length > 0 ? (
            <div className="space-y-2">
              {offers.slice(0, 5).map((offer) => (
                <div
                  key={`${offer.pharmacyName}-${offer.priceCents}`}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{offer.pharmacyName}</p>
                    {offer.deliveryEta && (
                      <p className="text-xs text-slate-500">{offer.deliveryEta}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-emerald-700">
                      {formatBrl(offer.priceCents)}
                    </span>
                    <a
                      href={offer.purchaseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 px-2.5 py-1.5 rounded-lg transition"
                    >
                      {t("pharmacy.buy")}
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : purchaseUrl ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-xs text-slate-600">{t("pharmacy.deeplinkHint")}</p>
              <a
                href={purchaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl transition"
              >
                {t("pharmacy.compareAndBuy")}
                <ExternalLink size={14} />
              </a>
            </div>
          ) : null}

          <p className="text-[11px] text-slate-400 leading-relaxed">{t("pharmacy.disclaimer")}</p>
        </div>
      )}
    </div>
  );
}
