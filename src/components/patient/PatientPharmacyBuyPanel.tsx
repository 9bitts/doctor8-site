"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Loader2,
  MapPin,
  Pill,
  QrCode,
  ShoppingBag,
  Truck,
} from "lucide-react";

type Quote = {
  pharmacyStoreId: string;
  nomeFantasia: string;
  addressStreet: string | null;
  addressCity: string | null;
  addressState: string | null;
  distanceKm: number | null;
  coveragePercent: number;
  subtotalCents: number;
  platformFeeCents: number;
  deliveryFeeCents: number;
  acceptsPickup: boolean;
  acceptsDelivery: boolean;
};

type MedItem = { name: string; dosage?: string };

type FulfillmentType = "PICKUP" | "DELIVERY";
type PaymentMethod = "card" | "pix";

function formatBrl(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

const stripePk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

type Props = {
  prescriptionId?: string;
  drugCatalogIds?: string[];
  medications: MedItem[];
  preselectedStoreId?: string;
  disabled?: boolean;
};

export default function PatientPharmacyBuyPanel({
  prescriptionId,
  drugCatalogIds,
  medications,
  preselectedStoreId,
  disabled,
}: Props) {
  const [cep, setCep] = useState("");
  const [loading, setLoading] = useState(false);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [storeCount, setStoreCount] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<string | null>(preselectedStoreId ?? null);
  const [fulfillment, setFulfillment] = useState<FulfillmentType>("PICKUP");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [deliveryStreet, setDeliveryStreet] = useState("");
  const [deliveryNumber, setDeliveryNumber] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryState, setDeliveryState] = useState("");
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [validateUrl, setValidateUrl] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [stripeLoaded, setStripeLoaded] = useState(false);

  const panelId = prescriptionId || drugCatalogIds?.[0] || "buy";
  const stripeRef = useRef<ReturnType<typeof Object> | null>(null);
  const cardElementRef = useRef<{ mount: (el: string) => void } | null>(null);
  const cardMountId = `pharmacy-card-${panelId}`;

  useEffect(() => {
    if (!stripePk || stripeLoaded || paymentMethod !== "card") return;
    function initStripe() {
      const StripeCtor = (window as { Stripe?: (key: string) => unknown }).Stripe;
      if (!StripeCtor) return;
      const stripe = StripeCtor(stripePk!) as {
        elements: () => { create: (t: string, o: unknown) => { mount: (el: string) => void; on: (e: string, fn: (ev: { complete: boolean }) => void) => void } };
        confirmCardPayment: (s: string, d: unknown) => Promise<{ error?: { message?: string }; paymentIntent?: { status: string } }>;
      };
      stripeRef.current = stripe;
      const card = stripe.elements().create("card", {
        style: { base: { fontSize: "16px", color: "#1e293b" } },
      });
      if (document.getElementById(cardMountId)) {
        card.mount(`#${cardMountId}`);
        card.on("change", (e) => setCardComplete(e.complete));
        cardElementRef.current = card;
        setStripeLoaded(true);
      }
    }
    if ((window as unknown as { Stripe?: unknown }).Stripe) {
      initStripe();
    } else {
      const script = document.createElement("script");
      script.src = "https://js.stripe.com/v3/";
      script.onload = () => initStripe();
      document.head.appendChild(script);
    }
  }, [stripeLoaded, cardMountId, paymentMethod]);

  useEffect(() => {
    if (preselectedStoreId) setSelectedStore(preselectedStoreId);
  }, [preselectedStoreId]);

  const selectedQuote = quotes.find((q) => q.pharmacyStoreId === selectedStore);

  function quoteTotal(q: Quote): number {
    const delivery =
      fulfillment === "DELIVERY" && q.acceptsDelivery ? q.deliveryFeeCents : 0;
    return q.subtotalCents + q.platformFeeCents + delivery;
  }

  async function searchQuotes() {
    const cepDigits = cep.replace(/\D/g, "");
    if (cepDigits.length < 8) {
      setMessage("Informe um CEP válido");
      return;
    }
    setLoading(true);
    setMessage(null);
    setQuotes([]);
    if (!preselectedStoreId) setSelectedStore(null);
    try {
      const body: Record<string, unknown> = { cep: cepDigits };
      if (prescriptionId) body.prescriptionId = prescriptionId;
      else if (drugCatalogIds?.length) body.drugCatalogIds = drugCatalogIds;
      else body.medications = medications;

      const res = await fetch("/api/patient/pharmacy/network/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Erro na busca");
        return;
      }
      setStoreCount(data.storeCount ?? 0);
      setQuotes(data.quotes || []);
      if (preselectedStoreId && (data.quotes || []).some((q: Quote) => q.pharmacyStoreId === preselectedStoreId)) {
        setSelectedStore(preselectedStoreId);
      }
      if ((data.quotes || []).length === 0) {
        setMessage(
          data.networkPublic === false
            ? "A rede Doctor8 ainda não está disponível na sua região."
            : data.storeCount === 0
              ? "Ainda não há farmácias Doctor8 na sua região."
              : "Nenhuma farmácia com estoque para estes itens perto de você.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function createAndPay() {
    if (!selectedStore) return;
    if (paymentMethod === "card" && (!stripeRef.current || !cardElementRef.current)) return;
    if (fulfillment === "DELIVERY" && !deliveryStreet.trim()) {
      setMessage("Informe o endereço de entrega");
      return;
    }
    setPaying(true);
    setMessage(null);
    try {
      const createBody: Record<string, unknown> = {
        pharmacyStoreId: selectedStore,
        fulfillmentType: fulfillment,
        patientCep: cep.replace(/\D/g, ""),
      };
      if (prescriptionId) createBody.prescriptionId = prescriptionId;
      else if (drugCatalogIds?.length) createBody.drugCatalogIds = drugCatalogIds;
      else createBody.medications = medications;
      if (fulfillment === "DELIVERY") {
        createBody.deliveryAddress = {
          street: deliveryStreet,
          number: deliveryNumber,
          city: deliveryCity,
          state: deliveryState,
          zip: cep.replace(/\D/g, ""),
        };
      }

      const createRes = await fetch("/api/patient/pharmacy/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createBody),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        setMessage(typeof createData.error === "string" ? createData.error : "Erro ao criar pedido");
        return;
      }
      const oid = createData.order.id as string;

      const payRes = await fetch(`/api/patient/pharmacy/orders/${oid}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod }),
      });
      const payData = await payRes.json();
      if (!payRes.ok) {
        setMessage(payData.error || "Erro no pagamento");
        return;
      }

      if (payData.checkoutUrl) {
        window.location.href = payData.checkoutUrl;
        return;
      }

      if (payData.alreadyPaid) {
        setPaid(true);
        return;
      }

      const { error, paymentIntent } = await (stripeRef.current as {
        confirmCardPayment: (s: string, d: unknown) => Promise<{ error?: { message?: string }; paymentIntent?: { status: string } }>;
      }).confirmCardPayment(payData.clientSecret, {
        payment_method: { card: cardElementRef.current },
      });
      if (error) {
        setMessage(error.message || "Pagamento recusado");
        return;
      }
      if (paymentIntent?.status === "succeeded") {
        await fetch(`/api/patient/pharmacy/orders/${oid}/confirm`, { method: "POST" });
        const detail = await fetch(`/api/patient/pharmacy/orders/${oid}`);
        if (detail.ok) {
          const d = await detail.json();
          setValidateUrl(d.order?.validateUrl ?? null);
        }
        setPaid(true);
      }
    } finally {
      setPaying(false);
    }
  }

  if (disabled) return null;

  if (paid) {
    return (
      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-4">
        <div className="flex gap-3">
          <CheckCircle2 className="text-emerald-600 shrink-0" size={22} />
          <div>
            <p className="font-semibold text-emerald-900">Pedido pago com sucesso</p>
            <p className="text-sm text-emerald-800 mt-1">
              A farmácia foi notificada.{" "}
              {fulfillment === "DELIVERY"
                ? "Aguarde a entrega no endereço informado."
                : "Apresente o QR da receita na farmácia para retirada."}
            </p>
          </div>
        </div>
        {prescriptionId && (
          <div className="flex flex-col items-center gap-2 pt-2 border-t border-emerald-200">
            <p className="text-xs font-medium text-emerald-800">QR para validação na farmácia</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/patient/pharmacy/prescriptions/${prescriptionId}/qr`}
              alt="QR da receita"
              width={160}
              height={160}
              className="rounded-lg border border-emerald-200 bg-white p-2"
            />
            {validateUrl && (
              <a href={validateUrl} className="text-[11px] text-emerald-700 underline break-all">
                {validateUrl}
              </a>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-100 bg-gradient-to-b from-emerald-50/80 to-white p-4 space-y-4">
      <div className="flex items-start gap-2">
        <ShoppingBag className="text-emerald-600 shrink-0 mt-0.5" size={18} />
        <div>
          <p className="text-sm font-bold text-slate-900">Comprar na rede Doctor8</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {medications.length} item(ns) · compare farmácias parceiras por preço e distância
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          value={cep}
          onChange={(e) => setCep(e.target.value)}
          placeholder="Seu CEP"
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={searchQuotes}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : "Buscar"}
        </button>
      </div>

      {message && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 flex gap-2">
          <AlertCircle size={14} className="shrink-0 mt-0.5" /> {message}
        </p>
      )}

      {quotes.length > 0 && (
        <div className="space-y-2">
          {quotes.map((q) => {
            const total = quoteTotal(q);
            const isSelected = selectedStore === q.pharmacyStoreId;
            return (
              <button
                key={q.pharmacyStoreId}
                type="button"
                onClick={() => setSelectedStore(q.pharmacyStoreId)}
                className={`w-full text-left p-3 rounded-xl border transition ${
                  isSelected
                    ? "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-300"
                    : "border-slate-200 hover:border-emerald-200"
                }`}
              >
                <div className="flex justify-between gap-2">
                  <p className="font-semibold text-slate-900 text-sm">{q.nomeFantasia}</p>
                  <p className="font-bold text-emerald-700 text-sm">{formatBrl(total)}</p>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 flex-wrap">
                  <MapPin size={11} />
                  {q.distanceKm != null
                    ? `${q.distanceKm.toFixed(1)} km`
                    : [q.addressCity, q.addressState].filter(Boolean).join("/")}
                  · {q.coveragePercent}% dos itens
                  {q.acceptsDelivery && (
                    <span className="text-emerald-600">· entrega +{formatBrl(q.deliveryFeeCents)}</span>
                  )}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {selectedQuote && (
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-600">Modalidade</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFulfillment("PICKUP")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border ${
                fulfillment === "PICKUP"
                  ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              <Pill size={14} /> Retirada
            </button>
            {selectedQuote.acceptsDelivery && (
              <button
                type="button"
                onClick={() => setFulfillment("DELIVERY")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border ${
                  fulfillment === "DELIVERY"
                    ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                <Truck size={14} /> Entrega
              </button>
            )}
          </div>

          {fulfillment === "DELIVERY" && (
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={deliveryStreet}
                onChange={(e) => setDeliveryStreet(e.target.value)}
                placeholder="Rua"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm sm:col-span-2"
              />
              <input
                value={deliveryNumber}
                onChange={(e) => setDeliveryNumber(e.target.value)}
                placeholder="Número"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={deliveryCity}
                onChange={(e) => setDeliveryCity(e.target.value)}
                placeholder="Cidade"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={deliveryState}
                onChange={(e) => setDeliveryState(e.target.value)}
                placeholder="UF"
                maxLength={2}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          )}

          <p className="text-xs font-medium text-slate-600">Pagamento</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod("card")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border ${
                paymentMethod === "card"
                  ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              <CreditCard size={14} /> Cartão
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("pix")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border ${
                paymentMethod === "pix"
                  ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              <QrCode size={14} /> PIX
            </button>
          </div>

          {paymentMethod === "card" && stripePk && (
            <div id={cardMountId} className="p-3 border border-slate-200 rounded-lg bg-white min-h-[40px]" />
          )}

          {paymentMethod === "pix" && (
            <p className="text-[11px] text-slate-500">
              Você será redirecionado ao checkout Stripe para pagar com PIX.
            </p>
          )}

          <button
            type="button"
            onClick={createAndPay}
            disabled={
              paying ||
              (paymentMethod === "card" &&
                Boolean(stripePk) &&
                (!stripeLoaded || !cardComplete))
            }
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {paying ? <Loader2 size={16} className="animate-spin" /> : <Pill size={16} />}
            Pagar {selectedQuote ? formatBrl(quoteTotal(selectedQuote)) : ""}
          </button>
        </div>
      )}

      {storeCount > 0 && quotes.length === 0 && !loading && (
        <p className="text-[11px] text-slate-400">
          {storeCount} farmácia(s) na rede — refine o CEP ou aguarde mais estoque na região.
        </p>
      )}
    </div>
  );
}
