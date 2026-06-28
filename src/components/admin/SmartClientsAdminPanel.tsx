"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

type ClientRow = {
  id: string;
  clientId: string;
  name: string;
  redirectUris: string;
  active: boolean;
};

export default function SmartClientsAdminPanel() {
  const { t } = useI18n();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState("");
  const [name, setName] = useState("");
  const [redirectUris, setRedirectUris] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/smart-clients");
      const data = await res.json();
      if (res.ok) setClients(data.clients || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addClient(e: React.FormEvent) {
    e.preventDefault();
    setWorking(true);
    setError("");
    try {
      const res = await fetch("/api/admin/smart-clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, name, redirectUris }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setClientId("");
      setName("");
      setRedirectUris("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setWorking(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/admin/smart-clients?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setClients((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div>
        <p className="font-semibold text-slate-800 text-sm">{t("admin.int.smartClientsTitle")}</p>
        <p className="text-xs text-slate-500 mt-1">{t("admin.int.smartClientsHint")}</p>
      </div>

      {loading ? (
        <Loader2 className="animate-spin text-slate-400" size={20} />
      ) : clients.length > 0 ? (
        <ul className="space-y-2 text-xs">
          {clients.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-2 border border-slate-100 rounded-xl p-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800">{c.name}</p>
                <p className="font-mono text-slate-500">{c.clientId}</p>
                <p className="text-slate-400 mt-1 break-all">{c.redirectUris}</p>
              </div>
              <button type="button" onClick={() => remove(c.id)} className="text-rose-600 p-1 shrink-0">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-400">{t("admin.int.smartClientsEmpty")}</p>
      )}

      <form onSubmit={addClient} className="space-y-2 border-t border-slate-100 pt-4">
        <input
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          placeholder="client_id"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"
          required
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("admin.int.smartClientName")}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"
          required
        />
        <input
          value={redirectUris}
          onChange={(e) => setRedirectUris(e.target.value)}
          placeholder="https://app.example/callback,https://localhost:3001/callback"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"
          required
        />
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <button
          type="submit"
          disabled={working}
          className="inline-flex items-center gap-1.5 text-xs font-semibold bg-brand-500 text-white px-3 py-2 rounded-lg disabled:opacity-50"
        >
          {working ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          {t("admin.int.smartClientAdd")}
        </button>
      </form>
    </div>
  );
}
