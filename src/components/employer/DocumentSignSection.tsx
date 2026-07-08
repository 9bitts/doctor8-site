"use client";

import { useEffect, useState } from "react";
import { FileSignature, Loader2, ShieldCheck } from "lucide-react";

type Signature = {
  id: string;
  docType: string;
  signedByName: string;
  signatureStatus: string;
  signedAt: string;
};

export function DocumentSignSection() {
  const [name, setName] = useState("");
  const [registro, setRegistro] = useState("");
  const [cpf, setCpf] = useState("");
  const [role, setRole] = useState("SST");
  const [docType, setDocType] = useState("PGR_INVENTORY");
  const [saving, setSaving] = useState(false);
  const [icpBusy, setIcpBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [lacunaConfigured, setLacunaConfigured] = useState(false);
  const [message, setMessage] = useState("");
  const [signatures, setSignatures] = useState<Signature[]>([]);

  async function loadSignatures() {
    const res = await fetch("/api/employer/documents/sign");
    if (res.ok) {
      const data = await res.json();
      setSignatures(data.signatures ?? []);
    }
  }

  useEffect(() => {
    loadSignatures();
    fetch("/api/employer/integrations")
      .then((r) => r.json())
      .then((data) => {
        const icp = (data.integrations ?? []).find((i: { id: string }) => i.id === "icp_brasil");
        setLacunaConfigured(icp?.mode === "live");
      })
      .catch(() => {});
    const params = new URLSearchParams(window.location.search);
    if (params.get("sign") === "success") {
      setMessage("Documento assinado com ICP-Brasil e salvo no dossiê.");
      loadSignatures();
    }
  }, []);

  async function signMetadata(e: React.FormEvent) {
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
      setMessage("Registro de responsável salvo (metadados).");
      loadSignatures();
    } else {
      setMessage("Erro ao registrar assinatura.");
    }
  }

  async function signIcp() {
    if (!name.trim()) {
      setMessage("Informe o nome do responsável antes de assinar com ICP.");
      return;
    }
    setIcpBusy(true);
    setMessage("");
    const res = await fetch("/api/employer/documents/sign/icp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        docType,
        signedByName: name.trim(),
        signedByRegistro: registro.trim() || undefined,
        signedByRole: role,
        signerCpf: cpf.trim() || undefined,
      }),
    });
    const data = await res.json();
    setIcpBusy(false);
    if (data.redirectUrl) {
      window.location.href = data.redirectUrl;
    } else {
      setMessage(data.message || "Erro ao iniciar assinatura ICP-Brasil.");
    }
  }

  async function signDemo() {
    if (!name.trim()) {
      setMessage("Informe o nome do responsável.");
      return;
    }
    setDemoBusy(true);
    setMessage("");
    const res = await fetch("/api/employer/documents/sign/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        docType,
        signedByName: name.trim(),
        signedByRegistro: registro.trim() || undefined,
        signedByRole: role,
      }),
    });
    const data = await res.json();
    setDemoBusy(false);
    if (res.ok) {
      setMessage(data.message || "PDF demo gerado e salvo no dossiê.");
      loadSignatures();
    } else {
      setMessage(data.message || "Erro ao gerar assinatura demo.");
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
      <h2 className="font-semibold text-slate-800 flex items-center gap-2">
        <FileSignature size={18} className="text-sky-600" />
        Assinatura técnica (PGR / PCMSO)
      </h2>
      <p className="text-sm text-slate-500">
        Registro de responsável ou assinatura ICP-Brasil (Lacuna). Sem Lacuna configurada, use assinatura demo para apresentações.
      </p>
      <form onSubmit={signMetadata} className="grid sm:grid-cols-2 gap-3">
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
        <input
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          placeholder="CPF do signatário (ICP)"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <select value={docType} onChange={(e) => setDocType(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="PGR_INVENTORY">Inventário PGR</option>
          <option value="GRO_CRITERIA">Critérios GRO</option>
          <option value="PCMSO">PCMSO</option>
        </select>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm sm:col-span-2">
          <option value="SST">SST / Segurança</option>
          <option value="MEDICO_TRABALHO">Médico do trabalho</option>
          <option value="ENG_SEGURANCA">Eng. Segurança</option>
        </select>
        <div className="sm:col-span-2 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            Registrar metadados
          </button>
          <button
            type="button"
            onClick={signIcp}
            disabled={icpBusy || !lacunaConfigured}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium disabled:opacity-50"
            title={!lacunaConfigured ? "Configure LACUNA_API_KEY para assinatura real" : undefined}
          >
            {icpBusy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            ICP-Brasil (Lacuna)
          </button>
          <button
            type="button"
            onClick={signDemo}
            disabled={demoBusy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-500 text-amber-800 text-sm font-medium disabled:opacity-50"
          >
            {demoBusy ? <Loader2 size={16} className="animate-spin" /> : null}
            Assinatura demo (apresentação)
          </button>
        </div>
      </form>
      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {signatures.length > 0 && (
        <ul className="text-xs space-y-1 border-t border-slate-100 pt-3">
          {signatures.slice(0, 5).map((s) => (
            <li key={s.id} className="flex justify-between gap-2 text-slate-600">
              <span>{s.docType} — {s.signedByName} ({s.signatureStatus})</span>
              {s.signatureStatus === "SIGNED" && (
                <a href={`/api/employer/documents/sign/${s.id}/pdf`} className="text-sky-600 hover:underline">
                  PDF assinado
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
