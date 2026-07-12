"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPin, Save } from "lucide-react";
import { LABORATORY_TYPE_LABELS } from "@/lib/laboratory-portal";

type LabData = {
  nomeFantasia: string;
  labType: string;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressNeighborhood?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZip?: string | null;
  contactPhone?: string | null;
};

export default function LaboratorySettingsClient({ readOnly = false }: { readOnly?: boolean }) {
  const [lab, setLab] = useState<LabData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    nomeFantasia: "",
    labType: "BLOOD" as "BLOOD" | "IMAGING" | "BOTH",
    addressZip: "",
    addressStreet: "",
    addressNumber: "",
    addressComplement: "",
    addressNeighborhood: "",
    addressCity: "",
    addressState: "",
    contactPhone: "",
  });

  useEffect(() => {
    fetch("/api/laboratory/company")
      .then((r) => r.json())
      .then((data) => {
        if (data.lab) {
          setLab(data.lab);
          setForm({
            nomeFantasia: data.lab.nomeFantasia || "",
            labType: data.lab.labType || "BLOOD",
            addressZip: data.lab.addressZip || "",
            addressStreet: data.lab.addressStreet || "",
            addressNumber: data.lab.addressNumber || "",
            addressComplement: data.lab.addressComplement || "",
            addressNeighborhood: data.lab.addressNeighborhood || "",
            addressCity: data.lab.addressCity || "",
            addressState: data.lab.addressState || "",
            contactPhone: data.lab.contactPhone || "",
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
      const res = await fetch("/api/laboratory/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMessage("Configurações salvas com sucesso.");
      } else {
        setMessage("Erro ao salvar. Tente novamente.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12 text-slate-500">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      <fieldset disabled={readOnly} className="space-y-8 border-0 p-0 m-0">
      <section className="rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-bold text-slate-900">Dados do laboratório</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block sm:col-span-2">
            <span className="text-sm text-slate-600">Nome fantasia</span>
            <input
              value={form.nomeFantasia}
              onChange={(e) => setForm((f) => ({ ...f, nomeFantasia: e.target.value }))}
              className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm text-slate-600">Tipo de laboratório</span>
            <select
              value={form.labType}
              onChange={(e) => setForm((f) => ({ ...f, labType: e.target.value as typeof f.labType }))}
              className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
            >
              {Object.entries(LABORATORY_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Define a categoria padrão na importação CSV e como pacientes encontram seu laboratório.
            </p>
          </label>
          <label className="block">
            <span className="text-sm text-slate-600">Telefone de contato</span>
            <input
              value={form.contactPhone}
              onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
              className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-bold text-slate-900 flex items-center gap-2">
          <MapPin size={18} /> Endereço
        </h2>
        <div className="flex gap-2">
          <input
            value={form.addressZip}
            onChange={(e) => setForm((f) => ({ ...f, addressZip: e.target.value }))}
            placeholder="CEP"
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
          />
          <button
            type="button"
            onClick={lookupCep}
            disabled={cepLoading}
            className="px-4 rounded-xl border border-slate-200 text-sm font-medium"
          >
            {cepLoading ? <Loader2 size={16} className="animate-spin" /> : "Buscar CEP"}
          </button>
        </div>
        <input
          value={form.addressStreet}
          onChange={(e) => setForm((f) => ({ ...f, addressStreet: e.target.value }))}
          placeholder="Rua"
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
        />
        <div className="grid grid-cols-3 gap-3">
          <input
            value={form.addressNumber}
            onChange={(e) => setForm((f) => ({ ...f, addressNumber: e.target.value }))}
            placeholder="Nº"
            className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
          />
          <input
            value={form.addressNeighborhood}
            onChange={(e) => setForm((f) => ({ ...f, addressNeighborhood: e.target.value }))}
            placeholder="Bairro"
            className="col-span-2 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <input
            value={form.addressCity}
            onChange={(e) => setForm((f) => ({ ...f, addressCity: e.target.value }))}
            placeholder="Cidade"
            className="col-span-2 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
          />
          <input
            value={form.addressState}
            onChange={(e) => setForm((f) => ({ ...f, addressState: e.target.value.toUpperCase().slice(0, 2) }))}
            placeholder="UF"
            maxLength={2}
            className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
          />
        </div>
      </section>

      {message && (
        <p className={`text-sm ${message.includes("sucesso") ? "text-emerald-600" : "text-red-600"}`}>
          {message}
        </p>
      )}
      </fieldset>

      {!readOnly && (
      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-6 py-3 rounded-xl disabled:opacity-50"
      >
        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
        Salvar configurações
      </button>
      )}
    </form>
  );
}
