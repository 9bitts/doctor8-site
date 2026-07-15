"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { IMPORT_STATUS_LABEL } from "@/lib/import-order";
import type { ImportOrderStatus } from "@prisma/client";

type OrderDetail = {
  id: string;
  status: ImportOrderStatus;
  quantity: number;
  productUsdCents: number;
  shippingUsdCents: number;
  feePercent: number;
  feeBrlCents: number;
  anvisaAuthorizationNumber: string | null;
  trackingNumber: string | null;
  courierName: string | null;
  product: { name: string };
  events: { toStatus: string; note: string | null; createdAt: string }[];
  documents: { kind: string; fileName: string | null }[];
};

type SignedDoc = {
  id: string;
  kind: string;
  fileName: string | null;
  viewUrl: string;
};

export default function PatientImportOrderDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = String(params.id || "");
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [docs, setDocs] = useState<SignedDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const paidBanner = searchParams.get("paid") === "1";
  const cancelledBanner = searchParams.get("cancelled") === "1";

  async function load() {
    if (!id) return;
    setLoading(true);
    const [ordersRes, docsRes] = await Promise.all([
      fetch("/api/patient/import/orders"),
      fetch(`/api/patient/import/orders/${id}/documents`),
    ]);
    if (ordersRes.ok) {
      const data = await ordersRes.json();
      const found = (data.orders ?? []).find((o: { id: string }) => o.id === id) || null;
      setOrder(found);
    }
    if (docsRes.ok) {
      const data = await docsRes.json();
      setDocs(data.documents ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when order id / paid query changes
  }, [id, paidBanner]);

  async function payFee() {
    setPaying(true);
    setPayError(null);
    try {
      const res = await fetch(`/api/patient/import/orders/${id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: "all" }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.alreadyPaid) {
        await load();
        return;
      }
      if (!res.ok || !data.checkoutUrl) {
        setPayError(typeof data.error === "string" ? data.error : "Não foi possível iniciar o pagamento");
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setPayError("Erro de rede ao iniciar pagamento");
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Pedido não encontrado.</p>
        <Link href="/patient/importacao" className="text-sky-600 text-sm">Voltar</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 p-6">
      <Link href="/patient/importacao" className="inline-flex items-center gap-1 text-sm text-slate-500">
        <ArrowLeft size={14} /> Voltar
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{order.product.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Status: <strong>{IMPORT_STATUS_LABEL[order.status]}</strong>
        </p>
      </div>

      {paidBanner && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Pagamento recebido. Se o status ainda não atualizou, aguarde alguns segundos e atualize a página.
        </div>
      )}
      {cancelledBanner && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Pagamento cancelado. Você pode tentar novamente quando quiser.
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm space-y-1">
        <p>Quantidade: {order.quantity}</p>
        <p>Produto: US$ {((order.productUsdCents * order.quantity) / 100).toFixed(2)}</p>
        <p>Frete: US$ {(order.shippingUsdCents / 100).toFixed(2)}</p>
        <p>Taxa Doctor8 ({order.feePercent}%): R$ {(order.feeBrlCents / 100).toFixed(2)}</p>
        {order.anvisaAuthorizationNumber && (
          <p className="text-emerald-700">Anvisa: {order.anvisaAuthorizationNumber}</p>
        )}
        {order.trackingNumber && (
          <p className="text-sky-700">
            {order.courierName || "Courier"} · {order.trackingNumber}
          </p>
        )}
      </div>

      {order.status === "PAYMENT_PENDING" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 space-y-3">
          <p>
            Autorização Anvisa liberada. Pague agora a <strong>taxa Doctor8</strong> (
            R$ {(order.feeBrlCents / 100).toFixed(2)}). O valor do produto Zephra em USD é tratado à parte com o fornecedor.
          </p>
          {payError && <p className="text-red-600">{payError}</p>}
          <button
            type="button"
            disabled={paying}
            onClick={payFee}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {paying ? <Loader2 className="animate-spin" size={16} /> : "Pagar taxa Doctor8"}
          </button>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-800">Timeline</h2>
        <ul className="space-y-2">
          {order.events?.map((ev, i) => (
            <li key={i} className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <span className="font-medium">{IMPORT_STATUS_LABEL[ev.toStatus as ImportOrderStatus] || ev.toStatus}</span>
              {" · "}
              {new Date(ev.createdAt).toLocaleString("pt-BR")}
              {ev.note ? ` — ${ev.note}` : ""}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-800">Documentos</h2>
        <ul className="text-xs text-slate-600 space-y-2">
          {docs.length > 0
            ? docs.map((d) => (
                <li key={d.id} className="flex items-center gap-2">
                  <span>• {d.kind}{d.fileName ? `: ${d.fileName}` : ""}</span>
                  <a
                    href={d.viewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 text-sky-600"
                  >
                    Abrir <ExternalLink size={12} />
                  </a>
                </li>
              ))
            : order.documents?.map((d, i) => (
                <li key={i}>• {d.kind}{d.fileName ? `: ${d.fileName}` : ""}</li>
              ))}
        </ul>
      </div>
    </div>
  );
}
