"use client";

import { useState } from "react";
import { FileSignature, Loader2 } from "lucide-react";

export function DocumentSignSection() {
  const [name, setName] = useState("");
  const [registro, setRegistro] = useState("");
  const [role, setRole] = useState("SST");
  const [docType, setDocType] = useState("PGR_INVENTORY");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function sign(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/employer/documents/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        docType,
        signedByName: name.trim(),
        signedByRegistro: registro.trim() || undefined,
        signedByRole: role,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage("Assinatura registrada. Inclua no dossiê de auditoria junto ao PDF/JSON exportado.");
      setName("");
      setRegistro("");
    } else {
      setMessage("Erro ao registrar assinatura.");
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
      <h2 className="font-semibold text-slate-800 flex items-center gap-2">
        <FileSignature size={18} className="text-sky-600" />
        Assinatura técnica (PGR / PCMSO)
      </h2>
      <p className="text-sm text-slate-500">
        Registro de responsável técnico habilitado (CRM/CREA). Para validade ICP-Brasil, complemente com certificado digital no dossiê.
      </p>
      <form onSubmit={sign} className="grid sm:grid-cols-2 gap-3">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do responsável"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <input
          value={registro}
          onChange={(e) => setRegistro(e.target.value)}
          placeholder="CRM / CREA / CRP"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <select value={docType} onChange={(e) => setDocType(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="PGR_INVENTORY">Inventário PGR</option>
          <option value="GRO_CRITERIA">Critérios GRO</option>
          <option value="PCMSO">PCMSO</option>
        </select>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="SST">SST / Segurança</option>
          <option value="MEDICO_TRABALHO">Médico do trabalho</option>
          <option value="ENG_SEGURANCA">Eng. Segurança</option>
        </select>
        <button
          type="submit"
          disabled={saving}
          className="sm:col-span-2 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <FileSignature size={16} />}
          Registrar assinatura
        </button>
      </form>
      {message && <p className="text-sm text-emerald-700">{message}</p>}
    </section>
  );
}
