"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  Package,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

type DrugHit = {
  id: string;
  name: string;
  activeIngredient: string;
  presentation: string;
  manufacturer?: string | null;
  ggremCode?: string | null;
  inInventory?: boolean;
};

type InventoryItem = {
  id: string;
  drugCatalogId: string;
  priceCents: number;
  stockQty: number | null;
  available: boolean;
  drug: DrugHit;
};

function formatBrl(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function parsePriceInput(value: string): number | null {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(",", ".");
  const num = parseFloat(normalized);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.round(num * 100);
}

export default function PharmacyInventoryClient() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    rowsCreated: number;
    rowsUpdated: number;
    rowsSkipped: number;
    errors: { line: number; message: string }[];
  } | null>(null);

  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<DrugHit[]>([]);
  const [addSearching, setAddSearching] = useState(false);
  const [addPrice, setAddPrice] = useState("");
  const [addStock, setAddStock] = useState("");
  const [selectedDrug, setSelectedDrug] = useState<DrugHit | null>(null);
  const [adding, setAdding] = useState(false);

  const loadInventory = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q?.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/pharmacy-store/inventory?${params}`);
      const data = await res.json();
      if (res.ok) setItems(data.items || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInventory(); }, [loadInventory]);

  async function handleSearchInventory(e: React.FormEvent) {
    e.preventDefault();
    await loadInventory(searchQ);
  }

  async function handleImport(file: File) {
    setImporting(true);
    setImportResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/pharmacy-store/inventory/import", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (res.ok) {
        setImportResult(data.result);
        await loadInventory(searchQ);
      }
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function searchDrugs(q: string) {
    setAddSearching(true);
    try {
      const res = await fetch(`/api/pharmacy-store/drugs/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setAddResults(data.results || []);
    } finally {
      setAddSearching(false);
    }
  }

  async function handleAddItem() {
    if (!selectedDrug) return;
    const priceCents = parsePriceInput(addPrice);
    if (!priceCents) return;
    setAdding(true);
    try {
      const res = await fetch("/api/pharmacy-store/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drugCatalogId: selectedDrug.id,
          priceCents,
          stockQty: addStock ? parseInt(addStock, 10) : undefined,
        }),
      });
      if (res.ok) {
        setSelectedDrug(null);
        setAddPrice("");
        setAddStock("");
        setAddQuery("");
        setAddResults([]);
        await loadInventory(searchQ);
      }
    } finally {
      setAdding(false);
    }
  }

  async function updatePrice(itemId: string, priceStr: string) {
    const priceCents = parsePriceInput(priceStr);
    if (!priceCents) return;
    const res = await fetch(`/api/pharmacy-store/inventory/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceCents }),
    });
    if (res.ok) await loadInventory(searchQ);
  }

  async function removeItem(itemId: string) {
    if (!confirm("Remover este item do estoque?")) return;
    const res = await fetch(`/api/pharmacy-store/inventory/${itemId}`, { method: "DELETE" });
    if (res.ok) await loadInventory(searchQ);
  }

  return (
    <div className="space-y-8">
      {/* CSV Import */}
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Upload className="text-emerald-600 shrink-0 mt-0.5" size={22} />
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-slate-900">Importar banco de preços (CSV)</h2>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              Envie o arquivo exportado do seu sistema. Colunas aceitas:{" "}
              <code className="text-xs bg-white px-1 rounded">codigo_ggrem</code>,{" "}
              <code className="text-xs bg-white px-1 rounded">nome</code> +{" "}
              <code className="text-xs bg-white px-1 rounded">apresentacao</code>, ou{" "}
              <code className="text-xs bg-white px-1 rounded">drug_catalog_id</code> — sempre com{" "}
              <code className="text-xs bg-white px-1 rounded">preco</code> (ex: 12,90).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href="/api/pharmacy-store/drugs/search?format=template"
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-900 border border-emerald-300 bg-white px-4 py-2 rounded-xl"
          >
            <Download size={16} /> Baixar modelo CSV
          </a>
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-xl cursor-pointer transition">
            {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {importing ? "Importando..." : "Enviar CSV"}
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              disabled={importing}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
              }}
            />
          </label>
        </div>

        {importResult && (
          <div className="rounded-xl bg-white border border-emerald-100 p-4 text-sm space-y-2">
            <p className="flex items-center gap-2 text-emerald-800 font-semibold">
              <CheckCircle2 size={16} /> Importação concluída
            </p>
            <p className="text-slate-600">
              {importResult.rowsCreated} criados · {importResult.rowsUpdated} atualizados ·{" "}
              {importResult.rowsSkipped} ignorados
            </p>
            {importResult.errors.length > 0 && (
              <details className="text-amber-800">
                <summary className="cursor-pointer font-medium">
                  {importResult.errors.length} avisos/erros
                </summary>
                <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto text-xs">
                  {importResult.errors.slice(0, 50).map((err, i) => (
                    <li key={i}>Linha {err.line}: {err.message}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </section>

      {/* Manual add */}
      <section className="rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-bold text-slate-900 flex items-center gap-2">
          <Plus size={18} /> Adicionar medicamento
        </h2>
        <div className="flex gap-2">
          <input
            value={addQuery}
            onChange={(e) => setAddQuery(e.target.value)}
            placeholder="Buscar no catálogo Anvisa Doctor8..."
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
          />
          <button
            type="button"
            disabled={addQuery.trim().length < 2 || addSearching}
            onClick={() => searchDrugs(addQuery)}
            className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold disabled:opacity-50"
          >
            {addSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          </button>
        </div>

        {addResults.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {addResults.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedDrug(d)}
                className={`w-full text-left p-3 rounded-xl border text-sm transition ${
                  selectedDrug?.id === d.id
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <p className="font-semibold text-slate-900">{d.name}</p>
                <p className="text-slate-500 text-xs">{d.activeIngredient} · {d.presentation}</p>
                {d.inInventory && <span className="text-xs text-amber-600">Já no estoque</span>}
              </button>
            ))}
          </div>
        )}

        {selectedDrug && (
          <div className="flex flex-wrap gap-3 items-end pt-2 border-t border-slate-100">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Preço (R$)</label>
              <input
                value={addPrice}
                onChange={(e) => setAddPrice(e.target.value)}
                placeholder="12,90"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-28"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Estoque (opc.)</label>
              <input
                value={addStock}
                onChange={(e) => setAddStock(e.target.value)}
                placeholder="50"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-24"
              />
            </div>
            <button
              type="button"
              disabled={adding || !addPrice}
              onClick={handleAddItem}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              {adding ? "Salvando..." : "Salvar"}
            </button>
          </div>
        )}
      </section>

      {/* Inventory list */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <Package size={18} /> Seu estoque ({items.length})
          </h2>
          <form onSubmit={handleSearchInventory} className="flex gap-2">
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Filtrar..."
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-48"
            />
            <button type="submit" className="px-3 py-2 rounded-lg border border-slate-200 text-sm">
              Buscar
            </button>
          </form>
        </div>

        {loading ? (
          <div className="flex justify-center py-12 text-slate-500">
            <Loader2 className="animate-spin" size={24} />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-slate-300 text-slate-500">
            <AlertCircle className="mx-auto mb-2 text-slate-400" size={28} />
            <p>Nenhum medicamento cadastrado ainda.</p>
            <p className="text-sm mt-1">Importe um CSV ou adicione manualmente acima.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Medicamento</th>
                  <th className="px-4 py-3 font-semibold">GGREM</th>
                  <th className="px-4 py-3 font-semibold">Preço</th>
                  <th className="px-4 py-3 font-semibold">Estoque</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{item.drug.name}</p>
                      <p className="text-xs text-slate-500">{item.drug.presentation}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{item.drug.ggremCode || "—"}</td>
                    <td className="px-4 py-3">
                      <input
                        key={`${item.id}-${item.priceCents}`}
                        defaultValue={(item.priceCents / 100).toFixed(2).replace(".", ",")}
                        onBlur={(e) => updatePrice(item.id, e.target.value)}
                        className="border border-slate-200 rounded-lg px-2 py-1 w-24 text-sm"
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.stockQty ?? "—"}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                        aria-label="Remover"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
