"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type Company = {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  contactEmail: string | null;
  contactPhone: string | null;
  companySize: string | null;
  employeeCount: number | null;
  grauRisco: number | null;
  cnae: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressNeighborhood: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
};

export default function EmployerCompanyForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<Company | null>(null);

  useEffect(() => {
    fetch("/api/employer/company")
      .then((r) => r.json())
      .then((data) => {
        if (data.company) setForm(data.company);
      })
      .finally(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/employer/company", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) setMessage("Dados atualizados.");
    else setMessage("Erro ao salvar.");
  }

  if (loading) return <Loader2 className="animate-spin text-slate-400" size={20} />;
  if (!form) return null;

  const field = (key: keyof Company, label: string, type = "text") => (
    <label className="block text-sm">
      <span className="text-slate-600">{label}</span>
      <input
        type={type}
        value={form[key] ?? ""}
        onChange={(e) => setForm({ ...form, [key]: e.target.value || null })}
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
    </label>
  );

  return (
    <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
      <h2 className="font-semibold text-slate-800">Dados da empresa</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {field("nomeFantasia", "Nome fantasia")}
        {field("razaoSocial", "Razão social")}
        {field("contactEmail", "E-mail de contato")}
        {field("contactPhone", "Telefone")}
        {field("employeeCount", "Nº colaboradores", "number")}
        {field("cnae", "CNAE principal")}
        <label className="block text-sm">
          <span className="text-slate-600">Grau de risco (1–4)</span>
          <input
            type="number"
            min={1}
            max={4}
            value={form.grauRisco ?? ""}
            onChange={(e) => setForm({ ...form, grauRisco: e.target.value ? Number(e.target.value) : null })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        {field("addressCity", "Cidade")}
        {field("addressState", "UF")}
      </div>
      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium disabled:opacity-50"
      >
        {saving ? "Salvando…" : "Salvar alterações"}
      </button>
      {message && <p className="text-sm text-emerald-700">{message}</p>}
    </form>
  );
}
