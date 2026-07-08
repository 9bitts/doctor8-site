"use client";

import { useEffect, useState } from "react";
import { Loader2, CreditCard, Webhook } from "lucide-react";

type BillingData = {
  planTier: string;
  limits: { tier: string; maxWorkforce: number; maxSurveysPerYear: number };
  billing: {
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    hasSubscription: boolean;
    meteredConfigured?: boolean;
    meteredActive?: boolean;
  };
  plans: {
    tier: string;
    label: string;
    description: string;
    monthlyHint: string;
    priceConfigured: boolean;
  }[];
};

type WebhookEndpoint = {
  id: string;
  label: string | null;
  url: string;
  events: string[];
  enabled: boolean;
  createdAt: string;
};

export function EmployerBillingSection() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/employer/billing");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function checkout(tier: string) {
    setBusy(tier);
    const res = await fetch("/api/employer/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    });
    const json = await res.json();
    if (json.url) window.location.href = json.url;
    else alert(json.message || json.error || "Erro ao iniciar checkout.");
    setBusy(null);
  }

  async function openPortal() {
    setBusy("portal");
    const res = await fetch("/api/employer/billing", { method: "PATCH" });
    const json = await res.json();
    if (json.url) window.location.href = json.url;
    setBusy(null);
  }

  if (loading) return <Loader2 className="animate-spin text-slate-400" size={20} />;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
      <h2 className="font-semibold text-slate-800 flex items-center gap-2">
        <CreditCard size={18} className="text-sky-600" /> Plano e cobrança
      </h2>
      <p className="text-sm text-slate-500">
        Plano atual: <strong>{data?.planTier ?? "PILOT"}</strong>
        {data?.limits && (
          <> · até {data.limits.maxWorkforce} colaboradores · {data.limits.maxSurveysPerYear} pesquisas/ano</>
        )}
      </p>
      {data?.billing.hasSubscription && (
        <p className="text-xs text-slate-500">
          Assinatura {data.billing.status}
          {data.billing.currentPeriodEnd && (
            <> · renova em {new Date(data.billing.currentPeriodEnd).toLocaleDateString("pt-BR")}</>
          )}
          {data.billing.meteredConfigured && (
            <> · EAP metered {data.billing.meteredActive ? "ativo" : "pendente"}</>
          )}
        </p>
      )}
      <div className="grid sm:grid-cols-3 gap-3">
        {(data?.plans ?? []).map((p) => (
          <div key={p.tier} className="rounded-xl border border-slate-200 p-4 space-y-2">
            <p className="font-medium text-slate-900">{p.label}</p>
            <p className="text-xs text-slate-500">{p.description}</p>
            {p.priceConfigured ? (
              <button
                type="button"
                disabled={busy === p.tier || data?.planTier === p.tier}
                onClick={() => checkout(p.tier)}
                className="text-sm text-sky-600 hover:underline disabled:opacity-50"
              >
                {busy === p.tier ? "Redirecionando…" : data?.planTier === p.tier ? "Plano atual" : "Assinar"}
              </button>
            ) : (
              <p className="text-xs text-slate-400">{p.monthlyHint}</p>
            )}
          </div>
        ))}
      </div>
      {data?.billing.hasSubscription && (
        <button
          type="button"
          onClick={openPortal}
          disabled={busy === "portal"}
          className="text-sm text-slate-600 hover:underline"
        >
          Gerenciar assinatura no Stripe
        </button>
      )}
    </section>
  );
}

type WebhookDelivery = {
  id: string;
  event: string;
  success: boolean;
  httpStatus: number | null;
  errorMessage: string | null;
  deliveredAt: string;
  endpointLabel: string | null;
};

export function EmployerWebhooksSection() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["whistleblower.created"]);
  const [secret, setSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [whRes, delRes] = await Promise.all([
      fetch("/api/employer/webhooks"),
      fetch("/api/employer/webhooks/deliveries"),
    ]);
    const data = await whRes.json();
    const delData = delRes.ok ? await delRes.json() : { deliveries: [] };
    setEndpoints(data.endpoints ?? []);
    setEvents(data.availableEvents ?? []);
    setDeliveries(delData.deliveries ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createEndpoint(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/employer/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, label: label || undefined, events: selectedEvents }),
    });
    const data = await res.json();
    if (res.ok) {
      setSecret(data.secret);
      setUrl("");
      setLabel("");
      load();
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
      <h2 className="font-semibold text-slate-800 flex items-center gap-2">
        <Webhook size={18} className="text-violet-600" /> Webhooks RH / integrações
      </h2>
      <p className="text-sm text-slate-500">
        Receba eventos no seu SI-RH ou middleware. Assinatura HMAC em <code className="text-xs">X-Doctor8-Signature</code>.
      </p>

      <form onSubmit={createEndpoint} className="space-y-3">
        <input
          required
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://seu-sistema.com/webhooks/doctor8"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Rótulo (opcional)"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          {events.map((ev) => (
            <label key={ev} className="text-xs flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1">
              <input
                type="checkbox"
                checked={selectedEvents.includes(ev)}
                onChange={(e) => {
                  setSelectedEvents((prev) =>
                    e.target.checked ? [...prev, ev] : prev.filter((x) => x !== ev),
                  );
                }}
              />
              {ev}
            </label>
          ))}
        </div>
        <button type="submit" className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium">
          Adicionar endpoint
        </button>
      </form>

      {secret && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
          Guarde o secret (exibido uma vez): <code className="break-all">{secret}</code>
        </p>
      )}

      {loading ? (
        <Loader2 className="animate-spin text-slate-400" size={18} />
      ) : (
        <ul className="space-y-2 text-sm">
          {endpoints.map((ep) => (
            <li key={ep.id} className="rounded-lg border border-slate-100 px-3 py-2 flex justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{ep.label || ep.url}</p>
                <p className="text-xs text-slate-400 truncate">{ep.events.join(", ")}</p>
              </div>
              <span className={`text-xs shrink-0 ${ep.enabled ? "text-emerald-600" : "text-slate-400"}`}>
                {ep.enabled ? "Ativo" : "Off"}
              </span>
            </li>
          ))}
          {endpoints.length === 0 && <p className="text-slate-400 text-xs">Nenhum webhook configurado.</p>}
        </ul>
      )}

      {deliveries.length > 0 && (
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <p className="text-xs font-medium text-slate-500 uppercase">Últimas entregas</p>
          <ul className="space-y-1 max-h-48 overflow-y-auto text-xs">
            {deliveries.slice(0, 15).map((d) => (
              <li key={d.id} className="flex justify-between gap-2 text-slate-600">
                <span className="truncate">{d.event} · {d.endpointLabel || "endpoint"}</span>
                <span className={d.success ? "text-emerald-600 shrink-0" : "text-red-600 shrink-0"}>
                  {d.success ? "OK" : d.errorMessage || "Falha"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
