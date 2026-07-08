"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Mail } from "lucide-react";

type Member = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  department: string | null;
  jobTitle: string | null;
  status: string;
  sessionsUsed: number;
  sessionsQuota: number | null;
  cpf: string | null;
  matriculaEsocial: string | null;
};

export default function ColaboradoresPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [department, setDepartment] = useState("");
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCpf, setEditCpf] = useState("");
  const [editMatricula, setEditMatricula] = useState("");
  const [savingSst, setSavingSst] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/employer/workforce");
    const data = await res.json();
    setMembers(data.members ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/employer/workforce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, firstName, lastName, department }),
    });
    setEmail("");
    setFirstName("");
    setLastName("");
    setDepartment("");
    load();
  }

  async function sendInvite(id: string) {
    setInvitingId(id);
    await fetch(`/api/employer/workforce/${id}/invite`, { method: "POST" });
    setInvitingId(null);
    load();
  }

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult("");
    const csv = await file.text();
    const res = await fetch("/api/employer/workforce/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv }),
    });
    const data = await res.json();
    if (!res.ok) {
      setImportResult(data.message || data.error || "Erro na importação.");
    } else {
      setImportResult(`${data.created} criados, ${data.updated} atualizados.`);
    }
    setImporting(false);
    e.target.value = "";
    load();
  }

  async function saveSstFields(id: string) {
    setSavingSst(true);
    await fetch(`/api/employer/workforce/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cpf: editCpf || null,
        matriculaEsocial: editMatricula || null,
      }),
    });
    setSavingSst(false);
    setEditingId(null);
    load();
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Colaboradores (EAP)</h1>
        <p className="text-slate-500 text-sm mt-1">
          Cadastro de elegibilidade para atendimento psicológico corporativo. Dados clínicos permanecem sigilosos.
        </p>
      </div>

      <form onSubmit={handleAdd} className="rounded-2xl border border-slate-200 bg-white p-6 grid sm:grid-cols-2 gap-3">
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Nome" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <input required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Sobrenome" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Setor" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <button type="submit" className="sm:col-span-2 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium">
          <Plus size={16} /> Adicionar colaborador
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
        <p className="text-sm font-medium text-slate-800">Importar CSV</p>
        <p className="text-xs text-slate-500">
          Colunas: email, nome, sobrenome, setor, cargo (opcionais). Para eSocial: informe CPF e matrícula na tabela abaixo.
        </p>
        <label className="inline-flex items-center gap-2 text-sm text-sky-600 cursor-pointer">
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvImport} disabled={importing} />
          {importing ? "Importando…" : "Selecionar arquivo CSV"}
        </label>
        {importResult && <p className="text-xs text-slate-600">{importResult}</p>}
      </div>

      {loading ? (
        <Loader2 className="animate-spin text-slate-400" />
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2">Nome</th>
                <th className="px-4 py-2">Setor</th>
                <th className="px-4 py-2">CPF / Matrícula</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Sessões</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{m.firstName} {m.lastName}</p>
                    <p className="text-xs text-slate-500">{m.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{m.department || "—"}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {editingId === m.id ? (
                      <div className="space-y-1">
                        <input
                          value={editCpf}
                          onChange={(e) => setEditCpf(e.target.value)}
                          placeholder="CPF"
                          className="w-full rounded border border-slate-200 px-2 py-1"
                        />
                        <input
                          value={editMatricula}
                          onChange={(e) => setEditMatricula(e.target.value)}
                          placeholder="Matrícula eSocial"
                          className="w-full rounded border border-slate-200 px-2 py-1"
                        />
                        <button
                          type="button"
                          disabled={savingSst}
                          onClick={() => saveSstFields(m.id)}
                          className="text-sky-600 hover:underline"
                        >
                          {savingSst ? "…" : "Salvar"}
                        </button>
                      </div>
                    ) : (
                      <>
                        <p>{m.cpf || "—"}</p>
                        <p className="text-slate-400">{m.matriculaEsocial || "sem matrícula"}</p>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(m.id);
                            setEditCpf(m.cpf ?? "");
                            setEditMatricula(m.matriculaEsocial ?? "");
                          }}
                          className="text-sky-600 hover:underline mt-1"
                        >
                          Editar SST
                        </button>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{m.status}</td>
                  <td className="px-4 py-3 text-slate-600">{m.sessionsUsed}{m.sessionsQuota ? ` / ${m.sessionsQuota}` : ""}</td>
                  <td className="px-4 py-3">
                    {m.status !== "ACTIVE" && (
                      <button
                        type="button"
                        disabled={invitingId === m.id}
                        onClick={() => sendInvite(m.id)}
                        className="inline-flex items-center gap-1 text-xs text-sky-600 hover:underline disabled:opacity-50"
                      >
                        {invitingId === m.id ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                        Enviar convite
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-500">
        Colaboradores ativam o benefício via e-mail e agendam sessões em /empresas/colaborador ou portal paciente.
        O RH vê apenas métricas agregadas de utilização.
      </p>
    </div>
  );
}
