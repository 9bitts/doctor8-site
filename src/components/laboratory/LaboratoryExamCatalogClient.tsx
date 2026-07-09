"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FlaskConical,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

type ExamItem = {
  id: string;
  examCatalogId: string;
  priceCents: number;
  available: boolean;
  internalCode?: string | null;
  exam: {
    id: string;
    name: string;
    category: string;
    code?: string | null;
  };
};

const CATEGORY_LABEL: Record<string, string> = {
  BLOOD: "Sangue",
  IMAGING: "Imagem",
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

export default function LaboratoryExamCatalogClient() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    rowsCreated: number;
    rowsUpdated: number;
    rowsSkipped: number;
    errors: { line: number; message: string }[];
  } | null>(null);

  const [addName, setAddName] = useState("");
  const [addCategory, setAddCategory] = useState<"BLOOD" | "IMAGING">("BLOOD");
  const [addPrice, setAddPrice] = useState("");
  const [adding, setAdding] = useState(false);

  const loadExams = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q?.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/laboratory/exams?${params}`);
      const data = await res.json();
      if (res.ok) setItems(data.items || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadExams(); }, [loadExams]);

  async function handleSearchExams(e: React.FormEvent) {
    e.preventDefault();
    await loadExams(searchQ);
  }

  async function handleImport(file: File) {
    setImporting(true);
    setImportResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/laboratory/exams/import", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (res.ok) {
        setImportResult(data.result);
        await loadExams(searchQ);
      }
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleAddItem() {
    const priceCents = parsePriceInput(addPrice);
    if (!addName.trim() || !priceCents) return;
    setAdding(true);
    try {
      const res = await fetch("/api/laboratory/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          category: addCategory,
          priceCents,
        }),
      });
      if (res.ok) {
        setAddName("");
        setAddPrice("");
        await loadExams(searchQ);
      }
    } finally {
      setAdding(false);
    }
  }

  async function removeItem(itemId: string) {
    if (!confirm("Remover este exame da tabela?")) return;
    const res = await fetch(`/api/laboratory/exams/${itemId}`, { method: "DELETE" });
    if (res.ok) await loadExams(searchQ);
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-violet-200 bg-violet-50/50 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Upload className="text-violet-600 shrink-0 mt-0.5" size={22} />
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-slate-900">Importar tabela de exames (CSV)</h2>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              Envie o arquivo exportado do seu sistema. Colunas aceitas:{" "}
              <code className="text-xs bg-white px-1 rounded">nome</code>,{" "}
              <code className="text-xs bg-white px-1 rounded">preco</code>,{" "}
              <code className="text-xs bg-white px-1 rounded">categoria</code> (sangue/imagem),{" "}
              <code className="text-xs bg-white px-1 rounded">codigo</code>.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href="/api/laboratory/exams/import?format=template"
            className="inline-flex items-center gap-2 text-sm font-medium text-violet-700 hover:text-violet-900 border border-violet-300 bg-white px-4 py-2 rounded-xl"
          >
            <Download size={16} /> Baixar modelo CSV
          </a>
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-xl cursor-pointer transition">
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
          <div className="rounded-xl bg-white border border-violet-100 p-4 text-sm space-y-2">
            <p className="flex items-center gap-2 text-violet-800 font-semibold">
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

      <section className="rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-bold text-slate-900 flex items-center gap-2">
          <Plus size={18} /> Adicionar exame manualmente
        </h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-slate-600 block mb-1">Nome do exame</label>
            <input
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="Hemograma completo"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Categoria</label>
            <select
              value={addCategory}
              onChange={(e) => setAddCategory(e.target.value as "BLOOD" | "IMAGING")}
              className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
            >
              <option value="BLOOD">Sangue</option>
              <option value="IMAGING">Imagem</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Preço (R$)</label>
            <input
              value={addPrice}
              onChange={(e) => setAddPrice(e.target.value)}
              placeholder="45,00"
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm w-28"
            />
          </div>
          <button
            type="button"
            disabled={adding || !addName.trim() || !addPrice}
            onClick={handleAddItem}
            className="px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-50"
          >
            {adding ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <FlaskConical size={18} /> Seus exames ({items.length})
          </h2>
          <form onSubmit={handleSearchExams} className="flex gap-2">
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Filtrar..."
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-48"
            />
            <button type="submit" className="px-3 py-2 rounded-lg border border-slate-200 text-sm">
              <Search size={16} />
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
            <p>Nenhum exame cadastrado ainda.</p>
            <p className="text-sm mt-1">Importe um CSV ou adicione manualmente acima.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Exame</th>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 font-semibold">Preço</th>
                  <th className="px-4 py-3 font-semibold w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{item.exam.name}</p>
                      {item.exam.code && (
                        <p className="text-xs text-slate-500">Cód. {item.exam.code}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {CATEGORY_LABEL[item.exam.category] ?? item.exam.category}
                    </td>
                    <td className="px-4 py-3 font-semibold text-violet-700">
                      {formatBrl(item.priceCents)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-slate-400 hover:text-red-600 transition"
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
