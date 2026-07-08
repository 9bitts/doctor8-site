"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, Stethoscope } from "lucide-react";

type ChecklistItem = { id: string; label: string; done: boolean };

type InviteLink = {
  email: string;
  fullName: string | null;
  status: string;
  invitedAt: string;
  joinedAt: string | null;
};

export default function PcmsoPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteLink, setInviteLink] = useState<InviteLink | null>(null);
  const [coordinatorName, setCoordinatorName] = useState("");
  const [coordinatorEmail, setCoordinatorEmail] = useState("");
  const [coordinatorCrm, setCoordinatorCrm] = useState("");
  const [notes, setNotes] = useState("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [completionPercent, setCompletionPercent] = useState(0);

  async function load() {
    setLoading(true);
    const [pcmsoRes, inviteRes] = await Promise.all([
      fetch("/api/employer/pcmso"),
      fetch("/api/employer/pcmso/invite"),
    ]);
    const data = await pcmsoRes.json();
    const inviteData = await inviteRes.json();
    if (pcmsoRes.ok) {
      setCoordinatorName(data.config?.coordinatorName ?? "");
      setCoordinatorEmail(data.config?.coordinatorEmail ?? "");
      setCoordinatorCrm(data.config?.coordinatorCrm ?? "");
      setNotes(data.config?.notes ?? "");
      setChecklist(data.checklist ?? []);
      setCompletionPercent(data.completionPercent ?? 0);
    }
    if (inviteRes.ok) {
      setInviteLink(inviteData.link ?? null);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/employer/pcmso", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coordinatorName,
        coordinatorEmail,
        coordinatorCrm,
        notes,
        checklist,
      }),
    });
    setSaving(false);
    load();
  }

  async function handleInvite() {
    if (!coordinatorEmail.trim()) {
      setInviteMessage("Informe o e-mail do médico coordenador.");
      return;
    }
    setInviting(true);
    setInviteMessage("");
    const res = await fetch("/api/employer/pcmso/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: coordinatorEmail.trim(),
        fullName: coordinatorName.trim() || undefined,
        crm: coordinatorCrm.trim() || undefined,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setInviteMessage(data.message || "Convite enviado.");
    } else {
      setInviteMessage(data.error === "ALREADY_ACTIVE" ? "Este médico já possui acesso ativo." : (data.error || "Erro ao enviar convite."));
    }
    setInviting(false);
    load();
  }

  function toggleItem(id: string) {
    setChecklist((prev) => prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-sky-500" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Integração PCMSO (NR-7)</h1>
        <p className="text-slate-500 text-sm mt-1">
          Vincule o médico coordenador e acompanhe a integração PGR ↔ PCMSO para riscos psicossociais.
        </p>
      </div>

      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 flex items-center gap-3">
        <Stethoscope className="text-sky-700" size={24} />
        <div>
          <p className="font-medium text-sky-900">Checklist NR-7: {completionPercent}% concluído</p>
          <p className="text-xs text-sky-700">Nota Técnica SEI nº 4655/2024/MTE</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">Médico coordenador PCMSO</h2>
          <input
            value={coordinatorName}
            onChange={(e) => setCoordinatorName(e.target.value)}
            placeholder="Nome completo"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              type="email"
              value={coordinatorEmail}
              onChange={(e) => setCoordinatorEmail(e.target.value)}
              placeholder="E-mail"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              value={coordinatorCrm}
              onChange={(e) => setCoordinatorCrm(e.target.value)}
              placeholder="CRM"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="rounded-xl border border-teal-100 bg-teal-50/80 p-4 space-y-3">
            <p className="text-sm text-teal-900 font-medium flex items-center gap-2">
              <Mail size={16} />
              Acesso portal médico do trabalho
            </p>
            <p className="text-xs text-teal-800">
              Envie convite para o coordenador PCMSO acessar alertas de risco e checklist (sem EAP/denúncias).
            </p>
            {inviteLink && (
              <p className="text-xs text-slate-600">
                Status: <strong>{inviteLink.status === "ACTIVE" ? "Ativo" : "Convite pendente"}</strong>
                {inviteLink.joinedAt ? ` · desde ${new Date(inviteLink.joinedAt).toLocaleDateString("pt-BR")}` : ""}
              </p>
            )}
            <button
              type="button"
              onClick={handleInvite}
              disabled={inviting || !coordinatorEmail.trim()}
              className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium disabled:opacity-50"
            >
              {inviting ? "Enviando…" : "Enviar convite de acesso"}
            </button>
            {inviteMessage && <p className="text-xs text-teal-900">{inviteMessage}</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
          <h2 className="font-semibold text-slate-900">Checklist integração</h2>
          {checklist.map((item) => (
            <label key={item.id} className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggleItem(item.id)}
                className="mt-1"
              />
              {item.label}
            </label>
          ))}
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observações internas (SST / médico do trabalho)…"
          rows={3}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-sky-600 text-white font-medium disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salvar PCMSO"}
        </button>
      </form>
    </div>
  );
}
