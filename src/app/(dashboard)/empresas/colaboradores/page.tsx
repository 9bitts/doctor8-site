"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";

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
};

export default function ColaboradoresPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [department, setDepartment] = useState("");

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

      {loading ? (
        <Loader2 className="animate-spin text-slate-400" />
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2">Nome</th>
                <th className="px-4 py-2">Setor</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Sessões</th>
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
                  <td className="px-4 py-3 text-slate-600">{m.status}</td>
                  <td className="px-4 py-3 text-slate-600">{m.sessionsUsed}{m.sessionsQuota ? ` / ${m.sessionsQuota}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-500">
        Colaboradores agendam sessões com psicólogos Doctor8 via portal paciente (conta vinculada por convite — próxima fase).
        O RH vê apenas métricas agregadas de utilização.
      </p>
    </div>
  );
}
