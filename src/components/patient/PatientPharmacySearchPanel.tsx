"use client";

import { useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  Pill,
  Search,
  ShoppingBag,
} from "lucide-react";
import PatientPharmacyBuyPanel from "@/components/patient/PatientPharmacyBuyPanel";

type MedHighlight = { name: string; dosage?: string };

type StoreHit = {
  pharmacyStoreId: string;
  nomeFantasia: string;
  addressStreet: string | null;
  addressNeighborhood: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  distanceKm: number | null;
  acceptsPickup: boolean;
  acceptsDelivery: boolean;
  inventoryCount: number;
  matchedItemCount: number;
  coveragePercent: number;
  subtotalCents: number;
  subtotalFormatted: string;
};

type StoreItem = {
  itemId: string;
  name: string;
  presentation: string;
  priceCents: number;
  priceFormatted: string;
  stockQty: number | null;
};

type Props = {
  highlightMedications?: MedHighlight[];
  prescriptionId?: string;
  /** When set, show buy panel for this store after user clicks Comprar */
  buyPrescriptionId?: string;
};

export default function PatientPharmacySearchPanel({
  highlightMedications = [],
  prescriptionId,
  buyPrescriptionId,
}: Props) {
  const [storeName, setStoreName] = useState("");
  const [drugQ, setDrugQ] = useState("");
  const [cep, setCep] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<StoreHit[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState<string | null>(null);
  const [inventoryCache, setInventoryCache] = useState<Record<string, StoreItem[]>>({});
  const [buyStoreId, setBuyStoreId] = useState<string | null>(null);

  const medsJson = highlightMedications.length > 0
    ? JSON.stringify(highlightMedications)
    : "";

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setMessage(null);
    setExpandedId(null);
    setBuyStoreId(null);

    const params = new URLSearchParams();
    if (storeName.trim()) params.set("storeName", storeName.trim());
    if (drugQ.trim()) params.set("drugQ", drugQ.trim());
    if (cep.trim()) params.set("cep", cep.replace(/\D/g, ""));
    if (medsJson) params.set("medications", medsJson);

    try {
      const res = await fetch(`/api/patient/pharmacy/network/search?${params}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setMessage(data.message ?? (data.results?.length ? null : "Nenhuma farmácia encontrada."));
    } finally {
      setLoading(false);
    }
  }

  async function toggleStore(storeId: string) {
    if (expandedId === storeId) {
      setExpandedId(null);
      setBuyStoreId(null);
      return;
    }
    setExpandedId(storeId);
    setBuyStoreId(null);

    if (inventoryCache[storeId]) return;

    setInventoryLoading(storeId);
    try {
      const params = new URLSearchParams();
      if (drugQ.trim()) params.set("drugQ", drugQ.trim());
      if (medsJson) params.set("medications", medsJson);
      const res = await fetch(`/api/patient/pharmacy/network/${storeId}/inventory?${params}`);
      const data = await res.json();
      if (res.ok) {
        setInventoryCache((prev) => ({ ...prev, [storeId]: data.items ?? [] }));
      }
    } finally {
      setInventoryLoading(null);
    }
  }

  function formatAddress(store: StoreHit): string {
    const parts = [
      store.addressStreet,
      store.addressNeighborhood,
      store.addressCity && store.addressState ? `${store.addressCity}/${store.addressState}` : store.addressCity,
      store.addressZip,
    ].filter(Boolean);
    return parts.join(" · ") || "Endereço não informado";
  }

  const activeBuyRxId = buyPrescriptionId ?? prescriptionId;

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6 space-y-4">
      <div>
        <h2 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
          <Building2 size={20} className="text-emerald-600" />
          Buscar farmácias na rede Doctor8
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Pesquise por nome da farmácia, medicamento ou CEP. Clique para ver preços e comprar.
        </p>
        {highlightMedications.length > 0 && (
          <p className="text-xs text-emerald-700 mt-2">
            Priorizando farmácias com medicamentos da sua receita ({highlightMedications.length} item
            {highlightMedications.length > 1 ? "s" : ""}).
          </p>
        )}
      </div>

      <form onSubmit={search} className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-600">Nome da farmácia</label>
          <input
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="Ex.: Drogaria Central"
            className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Medicamento (opcional)</label>
          <input
            value={drugQ}
            onChange={(e) => setDrugQ(e.target.value)}
            placeholder="Ex.: dipirona, losartana"
            className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-slate-600">CEP (proximidade)</label>
          <div className="relative mt-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={cep}
              onChange={(e) => setCep(e.target.value)}
              placeholder="00000-000"
              className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white"
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
            Buscar farmácias
          </button>
        </div>
      </form>

      {message && <p className="text-sm text-slate-500 text-center">{message}</p>}

      <div className="space-y-3">
        {results.map((store) => {
          const expanded = expandedId === store.pharmacyStoreId;
          const items = inventoryCache[store.pharmacyStoreId] ?? [];
          const isLoadingItems = inventoryLoading === store.pharmacyStoreId;
          const showBuy = buyStoreId === store.pharmacyStoreId && activeBuyRxId;

          return (
            <article
              key={store.pharmacyStoreId}
              className="rounded-xl bg-white border border-slate-200 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleStore(store.pharmacyStoreId)}
                className="w-full text-left p-4 hover:bg-slate-50 transition flex items-start justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900">{store.nomeFantasia}</p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    {store.inventoryCount} item{store.inventoryCount !== 1 ? "s" : ""} no estoque
                    {store.matchedItemCount > 0 && highlightMedications.length > 0 && (
                      <span> · {store.coveragePercent}% da receita · {store.subtotalFormatted}</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{formatAddress(store)}</p>
                  {store.distanceKm != null && (
                    <p className="text-xs text-slate-400 mt-0.5">{store.distanceKm.toFixed(1)} km</p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">
                    {store.acceptsPickup ? "Retirada" : ""}
                    {store.acceptsPickup && store.acceptsDelivery ? " · " : ""}
                    {store.acceptsDelivery ? "Entrega" : ""}
                  </p>
                </div>
                <span className="text-emerald-600 shrink-0 mt-1">
                  {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </span>
              </button>

              {expanded && (
                <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50 space-y-3">
                  {isLoadingItems ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="animate-spin text-slate-400" size={22} />
                    </div>
                  ) : items.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4 text-center">
                      Nenhum medicamento publicado com estes filtros.
                    </p>
                  ) : (
                    <ul className="space-y-2 max-h-60 overflow-y-auto">
                      {items.map((item) => (
                        <li
                          key={item.itemId}
                          className="flex items-start justify-between gap-3 text-sm py-1.5 border-b border-slate-100 last:border-0"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800 flex items-center gap-1">
                              <Pill size={12} className="text-emerald-600 shrink-0" />
                              {item.name}
                            </p>
                            {item.presentation && (
                              <p className="text-xs text-slate-500">{item.presentation}</p>
                            )}
                          </div>
                          <p className="font-bold text-emerald-700 shrink-0">{item.priceFormatted}</p>
                        </li>
                      ))}
                    </ul>
                  )}

                  {activeBuyRxId && !showBuy && items.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setBuyStoreId(store.pharmacyStoreId)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold"
                    >
                      <ShoppingBag size={16} />
                      Comprar nesta farmácia
                    </button>
                  )}

                  {showBuy && (
                    <PatientPharmacyBuyPanel
                      prescriptionId={activeBuyRxId}
                      medications={highlightMedications}
                      preselectedStoreId={store.pharmacyStoreId}
                    />
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
