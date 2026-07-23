"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EsocialPartnerSection } from "@/components/employer/EsocialPartnerSection";
import { Loader2 } from "lucide-react";

type Member = { id: string; firstName: string; lastName: string; email: string };
type CatRecord = {
  id: string;
  occurrenceAt: string;
  catType: string;
  cidCode: string | null;
  workforceMember: Member;
};
type Certificate = {
  id: string;
  startDate: string;
  cidCode: string | null;
  workRelatedMental: boolean;
  days: number | null;
  workforceMember: Member;
};
type Transmission = {
  id: string;
  eventType: string;
  status: string;
  createdAt: string;
};

export default function EsocialPage() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [cats, setCats] = useState<CatRecord[]>([]);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [transmissions, setTransmissions] = useState<Transmission[]>([]);

  const [catMemberId, setCatMemberId] = useState("");
  const [catWhen, setCatWhen] = useState("");
  const [catCid, setCatCid] = useState("");
  const [certMemberId, setCertMemberId] = useState("");
  const [certStart, setCertStart] = useState("");
  const [certCid, setCertCid] = useState("");
  const [certDays, setCertDays] = useState("1");
  const [certMental, setCertMental] = useState(false);

  async function load() {
    setLoading(true);
    const [w, c, cert, t] = await Promise.all([
      fetch("/api/employer/workforce"),
      fetch("/api/employer/cat"),
      fetch("/api/employer/certificates"),
      fetch("/api/employer/esocial/transmissions"),
    ]);
    const wData = await w.json();
    const cData = await c.json();
    const certData = await cert.json();
    const tData = await t.json();
    if (w.ok) setMembers(wData.members ?? []);
    if (c.ok) setCats(cData.records ?? []);
    if (cert.ok) setCerts(certData.certificates ?? []);
    if (t.ok) setTransmissions(tData.transmissions ?? tData.items ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addCat(e: React.FormEvent) {
    e.preventDefault();
    if (!catMemberId || !catWhen) return;
    await fetch("/api/employer/cat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workforceMemberId: catMemberId,
        occurrenceAt: new Date(catWhen).toISOString(),
        cidCode: catCid || undefined,
      }),
    });
    setCatCid("");
    load();
  }

  async function addCert(e: React.FormEvent) {
    e.preventDefault();
    if (!certMemberId || !certStart) return;
    await fetch("/api/employer/certificates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workforceMemberId: certMemberId,
        startDate: new Date(certStart).toISOString(),
        days: Number(certDays) || 1,
        cidCode: certCid || undefined,
        workRelatedMental: certMental || undefined,
      }),
    });
    setCertCid("");
    setCertMental(false);
    load();
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">eSocial / SST</h1>
        <p className="text-slate-500 text-sm mt-1">
          Passo 4 — exames (S-2220), CAT (S-2210) e atestados/afastamentos (S-2230). Preparação para parceiro.
        </p>
        <Link href="/empresas/exames" className="text-sm text-sky-700 hover:underline mt-2 inline-block">
          Exames ocupacionais / ASO →
        </Link>
      </div>

      {loading ? (
        <Loader2 className="animate-spin text-slate-400" />
      ) : (
        <>
          <EsocialPartnerSection />

          <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="font-semibold text-slate-800">CAT (S-2210)</h2>
            <form onSubmit={addCat} className="grid sm:grid-cols-4 gap-2">
              <select
                value={catMemberId}
                onChange={(e) => setCatMemberId(e.target.value)}
                className="sm:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Colaborador</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                ))}
              </select>
              <input
                type="datetime-local"
                value={catWhen}
                onChange={(e) => setCatWhen(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <input
                  value={catCid}
                  onChange={(e) => setCatCid(e.target.value)}
                  placeholder="CID"
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <button type="submit" className="px-3 py-2 rounded-lg bg-sky-600 text-white text-sm">Salvar</button>
              </div>
            </form>
            <ul className="text-sm divide-y divide-slate-100">
              {cats.map((c) => (
                <li key={c.id} className="py-2 flex justify-between">
                  <span>
                    {c.workforceMember.firstName} {c.workforceMember.lastName}
                    <span className="text-slate-400 ml-2">{new Date(c.occurrenceAt).toLocaleString("pt-BR")}</span>
                  </span>
                  <span className="text-slate-500">{c.catType}{c.cidCode ? ` · ${c.cidCode}` : ""}</span>
                </li>
              ))}
              {cats.length === 0 && <li className="text-slate-400 py-2">Nenhuma CAT registrada.</li>}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="font-semibold text-slate-800">Atestados / afastamentos (S-2230)</h2>
            <form onSubmit={addCert} className="grid sm:grid-cols-2 gap-2">
              <select
                value={certMemberId}
                onChange={(e) => setCertMemberId(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Colaborador</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                ))}
              </select>
              <input
                type="date"
                value={certStart}
                onChange={(e) => setCertStart(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                value={certCid}
                onChange={(e) => setCertCid(e.target.value)}
                placeholder="CID (ex.: F32)"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={1}
                value={certDays}
                onChange={(e) => setCertDays(e.target.value)}
                placeholder="Dias"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <label className="sm:col-span-2 flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={certMental} onChange={(e) => setCertMental(e.target.checked)} />
                Relacionado ao trabalho / saúde mental (aciona encaminhamento EAP)
              </label>
              <button type="submit" className="sm:col-span-2 px-3 py-2 rounded-lg bg-sky-600 text-white text-sm">
                Registrar atestado
              </button>
            </form>
            <ul className="text-sm divide-y divide-slate-100">
              {certs.map((c) => (
                <li key={c.id} className="py-2 flex justify-between">
                  <span>
                    {c.workforceMember.firstName} {c.workforceMember.lastName}
                    <span className="text-slate-400 ml-2">{new Date(c.startDate).toLocaleDateString("pt-BR")}</span>
                    {c.workRelatedMental && (
                      <span className="ml-2 text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">CID mental / trabalho</span>
                    )}
                  </span>
                  <span className="text-slate-500">{c.cidCode || "—"}{c.days ? ` · ${c.days}d` : ""}</span>
                </li>
              ))}
              {certs.length === 0 && <li className="text-slate-400 py-2">Nenhum atestado registrado.</li>}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
            <h2 className="font-semibold text-slate-800">Fila de transmissões</h2>
            <ul className="text-sm divide-y divide-slate-100">
              {transmissions.slice(0, 20).map((t) => (
                <li key={t.id} className="py-2 flex justify-between">
                  <span>{t.eventType}</span>
                  <span className="text-slate-500">{t.status} · {new Date(t.createdAt).toLocaleString("pt-BR")}</span>
                </li>
              ))}
              {transmissions.length === 0 && (
                <li className="text-slate-400 py-2">Nenhuma transmissão na fila.</li>
              )}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
