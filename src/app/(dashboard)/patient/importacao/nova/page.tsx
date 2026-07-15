"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Upload, AlertCircle } from "lucide-react";
import { uploadFileToApi } from "@/lib/upload-client";
import { maxQuantityForProduct } from "@/lib/import-order";

type Product = {
  id: string;
  name: string;
  strengthMg: number;
  priceUsdCents: number;
  shippingUsdCents: number;
  daysPerUnit: number;
  maxQuantity: number;
  priceUsd: number;
  shippingUsd: number;
};

type DocKind = "ID_DOCUMENT" | "ADDRESS_PROOF" | "MEDICAL_REPORT" | "OTHER";

type UploadedDoc = {
  kind: DocKind;
  fileKey: string;
  fileName: string;
  mimeType: string;
};

function NovaImportacaoInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prescriptionId = searchParams.get("prescriptionId") || undefined;

  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [docKind, setDocKind] = useState<DocKind>("ID_DOCUMENT");

  const [shipName, setShipName] = useState("");
  const [shipCpf, setShipCpf] = useState("");
  const [shipPhone, setShipPhone] = useState("");
  const [shipLine1, setShipLine1] = useState("");
  const [shipLine2, setShipLine2] = useState("");
  const [shipCity, setShipCity] = useState("");
  const [shipState, setShipState] = useState("");
  const [shipZip, setShipZip] = useState("");
  const [patientNotes, setPatientNotes] = useState("");

  useEffect(() => {
    (async () => {
      const [prodRes, prefillRes] = await Promise.all([
        fetch("/api/patient/import/products"),
        fetch("/api/patient/import/prefill"),
      ]);
      if (prodRes.ok) {
        const data = await prodRes.json();
        setProducts(data.products ?? []);
        if (data.products?.[0]) setProductId(data.products[0].id);
      }
      if (prefillRes.ok) {
        const p = await prefillRes.json();
        setShipName(p.shipName || "");
        setShipCpf(p.shipCpf || "");
        setShipPhone(p.shipPhone || "");
        setShipLine1(p.shipLine1 || "");
        setShipLine2(p.shipLine2 || "");
        setShipCity(p.shipCity || "");
        setShipState(p.shipState || "");
        setShipZip(p.shipZip || "");
      }
      setLoading(false);
    })();
  }, []);

  const selected = useMemo(
    () => products.find((p) => p.id === productId) || null,
    [products, productId],
  );

  const maxQty = selected
    ? maxQuantityForProduct(selected.daysPerUnit, 90)
    : 1;

  async function onUpload(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError("");
    const result = await uploadFileToApi(file, "import-docs");
    setUploading(false);
    if (!result.ok) {
      setError(result.error === "FILE_TOO_LARGE" ? "Arquivo muito grande" : "Falha no upload");
      return;
    }
    setDocs((prev) => [
      ...prev,
      {
        kind: docKind,
        fileKey: result.key,
        fileName: result.name,
        mimeType: result.type,
      },
    ]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    if (!docs.some((d) => d.kind === "ID_DOCUMENT")) {
      setError("Envie um documento de identidade");
      return;
    }
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/patient/import/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        prescriptionId,
        quantity,
        treatmentDays: 90,
        shipName,
        shipCpf,
        shipPhone,
        shipLine1,
        shipLine2,
        shipCity,
        shipState,
        shipZip,
        patientNotes,
        documents: docs,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      const first = data.error
        ? Object.values(data.error).flat()[0]
        : "Não foi possível criar o pedido";
      setError(String(first || "Erro"));
      return;
    }
    router.push(`/patient/importacao/${data.order.id}`);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 p-6">
      <Link href="/patient/importacao" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={14} /> Voltar
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">Solicitar importação Zephra</h1>
      <p className="text-sm text-slate-500">
        Uso pessoal. Pagamento e envio só após autorização Anvisa. Máx. cobertura ≈ 90 dias.
      </p>
      {prescriptionId && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          Vinculado à receita {prescriptionId.slice(0, 8)}…
        </p>
      )}

      <form onSubmit={submit} className="space-y-4">
        {error && (
          <p className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle size={14} /> {error}
          </p>
        )}

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Produto</span>
          <select
            value={productId}
            onChange={(e) => { setProductId(e.target.value); setQuantity(1); }}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
            required
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — US$ {p.priceUsd.toFixed(0)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Quantidade (máx. {maxQty})</span>
          <input
            type="number"
            min={1}
            max={maxQty}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
          />
        </label>

        {selected && (
          <p className="text-xs text-slate-500">
            Produto US$ {(selected.priceUsd * quantity).toFixed(0)} + frete US$ {selected.shippingUsd.toFixed(0)}
            {" · "}Taxa Doctor8 15% (cobrada após Anvisa)
          </p>
        )}

        <div className="space-y-3 border-t border-slate-100 pt-4">
          <p className="text-sm font-semibold text-slate-800">Endereço de entrega (Brasil)</p>
          <input value={shipName} onChange={(e) => setShipName(e.target.value)} placeholder="Nome completo" required className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
          <div className="grid grid-cols-2 gap-3">
            <input value={shipCpf} onChange={(e) => setShipCpf(e.target.value)} placeholder="CPF" className="rounded-xl border border-slate-200 px-3 py-2.5" />
            <input value={shipPhone} onChange={(e) => setShipPhone(e.target.value)} placeholder="Telefone" className="rounded-xl border border-slate-200 px-3 py-2.5" />
          </div>
          <input value={shipLine1} onChange={(e) => setShipLine1(e.target.value)} placeholder="Endereço" required className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
          <input value={shipLine2} onChange={(e) => setShipLine2(e.target.value)} placeholder="Complemento" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
          <div className="grid grid-cols-3 gap-3">
            <input value={shipCity} onChange={(e) => setShipCity(e.target.value)} placeholder="Cidade" required className="col-span-2 rounded-xl border border-slate-200 px-3 py-2.5" />
            <input value={shipState} onChange={(e) => setShipState(e.target.value.toUpperCase().slice(0, 2))} placeholder="UF" required maxLength={2} className="rounded-xl border border-slate-200 px-3 py-2.5" />
          </div>
          <input value={shipZip} onChange={(e) => setShipZip(e.target.value)} placeholder="CEP" required className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
        </div>

        <div className="space-y-3 border-t border-slate-100 pt-4">
          <p className="text-sm font-semibold text-slate-800">Documentos</p>
          <div className="flex flex-wrap gap-2">
            <select value={docKind} onChange={(e) => setDocKind(e.target.value as DocKind)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="ID_DOCUMENT">Identidade (obrigatório)</option>
              <option value="ADDRESS_PROOF">Comprovante de endereço</option>
              <option value="MEDICAL_REPORT">Laudo / relatório médico</option>
              <option value="OTHER">Outro</option>
            </select>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              Enviar arquivo
              <input type="file" className="hidden" accept="application/pdf,image/*" onChange={(e) => onUpload(e.target.files?.[0] || null)} />
            </label>
          </div>
          <ul className="space-y-1 text-xs text-slate-600">
            {docs.map((d) => (
              <li key={d.fileKey}>• {d.kind}: {d.fileName}</li>
            ))}
          </ul>
        </div>

        <textarea
          value={patientNotes}
          onChange={(e) => setPatientNotes(e.target.value)}
          placeholder="Observações (opcional)"
          rows={2}
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        />

        <button
          type="submit"
          disabled={submitting || products.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="animate-spin" size={18} /> : null}
          Enviar solicitação
        </button>
      </form>
    </div>
  );
}

export default function NovaImportacaoPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-400" /></div>}>
      <NovaImportacaoInner />
    </Suspense>
  );
}
