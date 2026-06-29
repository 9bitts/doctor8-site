"use client";

import { useState, useEffect, useCallback } from "react";
import { Building2, Loader2, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

type OrgLink = { id: string; nomeFantasia: string };

type Props = {
  listEndpoint: string;
  joinEndpoint: string;
};

export default function OrganizationJoinSettings({
  listEndpoint,
  joinEndpoint,
}: Props) {
  const { t } = useI18n();
  const [organizations, setOrganizations] = useState<OrgLink[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(listEndpoint);
      const data = await res.json();
      if (res.ok) setOrganizations(data.organizations || []);
    } catch {
      /* ignore */
    }
  }, [listEndpoint]);

  useEffect(() => {
    load();
  }, [load]);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setJoining(true);
    setMsg("");
    setOk(false);
    try {
      const res = await fetch(joinEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      });
      const data = await res.json();
      if (res.status === 201) {
        setOk(true);
        setInviteCode("");
        await load();
        return;
      }
      if (data.error === "ORG_NOT_FOUND") setMsg(t("org.join.notFound"));
      else if (data.error === "ALREADY_LINKED") setMsg(t("org.join.alreadyLinked"));
      else setMsg(t("org.join.failed"));
    } catch {
      setMsg(t("org.join.failed"));
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          <Building2 size={18} className="text-indigo-600" />
          {t("org.join.title")}
        </h2>
        <p className="text-sm text-slate-500 mt-1">{t("org.join.desc")}</p>
      </div>

      {organizations.length > 0 && (
        <ul className="space-y-2">
          {organizations.map((o) => (
            <li
              key={o.id}
              className="flex items-center gap-2 text-sm text-slate-700 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2"
            >
              <CheckCircle2 size={14} className="text-indigo-600 shrink-0" />
              {o.nomeFantasia}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={join} className="flex flex-col sm:flex-row gap-2">
        <input
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          placeholder={t("org.join.codePlaceholder")}
          className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
        <button
          type="submit"
          disabled={joining || !inviteCode.trim()}
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          {joining && <Loader2 size={14} className="animate-spin" />}
          {t("org.join.cta")}
        </button>
      </form>

      {ok && <p className="text-sm text-emerald-700">{t("org.join.success")}</p>}
      {msg && <p className="text-sm text-red-600">{msg}</p>}
    </div>
  );
}
