"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPin, Save } from "lucide-react";

type StoreData = {
  nomeFantasia: string;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressNeighborhood?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZip?: string | null;
  acceptsPickup: boolean;
  acceptsDelivery: boolean;
  deliveryRadiusKm?: number | null;
  contactPhone?: string | null;
};

export default function PharmacyStoreSettingsClient({ readOnly = false }: { readOnly?: boolean }) {
  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    nomeFantasia: "",
    addressZip: "",
    addressStreet: "",
    addressNumber: "",
    addressComplement: "",
    addressNeighborhood: "",
    addressCity: "",
    addressState: "",
    contactPhone: "",
    acceptsPickup: true,
    acceptsDelivery: false,
    deliveryRadiusKm: "",
  });

  useEffect(() => {
    fetch("/api/pharmacy-store/company")
      .then((r) => r.json())
      .then((data) => {
        if (data.store) {
          setStore(data.store);
          setForm({
            nomeFantasia: data.store.nomeFantasia || "",
            addressZip: data.store.addressZip || "",
            addressStreet: data.store.addressStreet || "",
            addressNumber: data.store.addressNumber || "",
            addressComplement: data.store.addressComplement || "",
            addressNeighborhood: data.store.addressNeighborhood || "",
            addressCity: data.store.addressCity || "",
            addressState: data.store.addressState || "",
            contactPhone: data.store.contactPhone || "",
            acceptsPickup: data.store.acceptsPickup ?? true,
            acceptsDelivery: data.store.acceptsDelivery ?? false,
            deliveryRadiusKm: data.store.deliveryRadiusKm?.toString() || "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function lookupCep() {
    const cep = form.addressZip.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`/api/cep/lookup?cep=${cep}`);
      const data = await res.json();
      if (res.ok) {
        setForm((f) => ({
          ...f,
          addressStreet: data.street || f.addressStreet,
          addressNeighborhood: data.neighborhood || f.addressNeighborhood,
          addressCity: data.city || f.addressCity,
          addressState: data.state || f.addressState,
          addressComplement: data.complement || f.addressComplement,
        }));
      }
    } finally {
      setCepLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/pharmacy-store/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeFantasia: form.nomeFantasia,
          addressZip: form.addressZip,
          addressStreet: form.addressStreet,
          addressNumber: form.addressNumber,
          addressComplement: form.addressComplement,
          addressNeighborhood: form.addressNeighborhood,
          addressCity: form.addressCity,
          addressState: form.addressState,
          contactPhone: form.contactPhone,
          acceptsPickup: form.acceptsPickup,
          acceptsDelivery: form.acceptsDelivery,
          deliveryRadiusKm: form.deliveryRadiusKm
            ? parseFloat(form.deliveryRadiusKm)
            : null,
        }),
      });
      if (res.ok) setMessage("Salvo com sucesso.");
      else setMessage("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-emerald-600" size={28} />
      </div>
    );
  }

  return (
    <fieldset disabled={readOnly} className="max-w-2xl space-y-6 border-0 p-0 m-0">
    <form onSubmit={handleSave} className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <MapPin size={20} className="text-emerald-600" /> Endereço da farmácia
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Usado para pacientes encontrarem sua loja por proximidade (quando a busca estiver ativa).
        </p>
      </div>

      <div className="grid gap-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Nome fantasia</span>
          <input
            value={form.nomeFantasia}
            onChange={(e) => setForm({ ...form, nomeFantasia: e.target.value })}
            className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
            required
          />
        </label>

        <div className="flex gap-2">
          <label className="block flex-1">
            <span className="text-sm font-medium text-slate-700">CEP</span>
            <input
              value={form.addressZip}
              onChange={(e) => setForm({ ...form, addressZip: e.target.value })}
              className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
              placeholder="00000-000"
            />
          </label>
          <button
            type="button"
            onClick={lookupCep}
            disabled={cepLoading}
            className="self-end px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium hover:bg-slate-50"
          >
            {cepLoading ? <Loader2 size={16} className="animate-spin" /> : "Buscar CEP"}
          </button>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Rua</span>
          <input
            value={form.addressStreet}
            onChange={(e) => setForm({ ...form, addressStreet: e.target.value })}
            className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Número</span>
            <input
              value={form.addressNumber}
              onChange={(e) => setForm({ ...form, addressNumber: e.target.value })}
              className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Complemento</span>
            <input
              value={form.addressComplement}
              onChange={(e) => setForm({ ...form, addressComplement: e.target.value })}
              className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Bairro</span>
          <input
            value={form.addressNeighborhood}
            onChange={(e) => setForm({ ...form, addressNeighborhood: e.target.value })}
            className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
          />
        </label>

        <div className="grid grid-cols-3 gap-4">
          <label className="block col-span-2">
            <span className="text-sm font-medium text-slate-700">Cidade</span>
            <input
              value={form.addressCity}
              onChange={(e) => setForm({ ...form, addressCity: e.target.value })}
              className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">UF</span>
            <input
              value={form.addressState}
              onChange={(e) => setForm({ ...form, addressState: e.target.value.toUpperCase().slice(0, 2) })}
              className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
              maxLength={2}
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Telefone de contato</span>
          <input
            value={form.contactPhone}
            onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
            className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
          />
        </label>

        <div className="flex flex-wrap gap-6 pt-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.acceptsPickup}
              onChange={(e) => setForm({ ...form, acceptsPickup: e.target.checked })}
              className="rounded border-slate-300"
            />
            Retirada no balcão
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.acceptsDelivery}
              onChange={(e) => setForm({ ...form, acceptsDelivery: e.target.checked })}
              className="rounded border-slate-300"
            />
            Entrega (em breve)
          </label>
        </div>
      </div>

      {message && (
        <p className={`text-sm ${message.includes("sucesso") ? "text-emerald-700" : "text-red-600"}`}>
          {message}
        </p>
      )}

      {!readOnly && (
      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-3 rounded-xl disabled:opacity-50"
      >
        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
        Salvar configurações
      </button>
      )}
    </form>
    </fieldset>
  );
}
