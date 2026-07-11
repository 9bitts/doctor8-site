"use client";

import { useState, useEffect, useCallback } from "react";
import { Building2, Loader2, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  isIntegrativeTherapistVariant,
  isPsychoanalystVariant,
  variantI18nKey,
  type ProviderSettingsVariant,
} from "@/lib/provider-settings-variant";

type OrgLink = { id: string; nomeFantasia: string };

type Props = {
  listEndpoint: string;
  joinEndpoint: string;
  variant?: ProviderSettingsVariant;
};

export default function OrganizationJoinSettings({
  listEndpoint,
  joinEndpoint,
  variant,
}: Props) {
  const { t } = useI18n();
  const isPa = isPsychoanalystVariant(variant);
  const isIt = isIntegrativeTherapistVariant(variant);
  const tk = (defaultKey: string, paKey: string, itKey?: string) =>
    t(variantI18nKey(variant, defaultKey, paKey, itKey));
  const iconClass = isPa ? "text-violet-600" : isIt ? "text-teal-600" : "text-indigo-600";
  const listClass = isPa
    ? "bg-violet-50 border-violet-100"
    : isIt
      ? "bg-teal-50 border-teal-100"
      : "bg-indigo-50 border-indigo-100";
  const listIcon = isPa ? "text-violet-600" : isIt ? "text-teal-600" : "text-indigo-600";
  const btnClass = isPa
    ? "bg-violet-600 hover:bg-violet-500 focus:ring-violet-500/30"
    : isIt
      ? "bg-teal-600 hover:bg-teal-500 focus:ring-teal-500/30"
      : "bg-indigo-600 hover:bg-indigo-500 focus:ring-indigo-500/30";
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
          <Building2 size={18} className={iconClass} />
          {tk("org.join.title", "pa.settings.orgTitle", "it.settings.orgTitle")}
        </h2>
        <p className="text-sm text-slate-500 mt-1">{tk("org.join.desc", "pa.settings.orgDesc", "it.settings.orgDesc")}</p>
      </div>

      {organizations.length > 0 && (
        <ul className="space-y-2">
          {organizations.map((o) => (
            <li
              key={o.id}
              className={`flex items-center gap-2 text-sm text-slate-700 border rounded-xl px-3 py-2 ${listClass}`}
            >
              <CheckCircle2 size={14} className={`${listIcon} shrink-0`} />
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
          className={`flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
            isPa ? "focus:ring-violet-500/30" : isIt ? "focus:ring-teal-500/30" : "focus:ring-indigo-500/30"
          }`}
        />
        <button
          type="submit"
          disabled={joining || !inviteCode.trim()}
          className={`inline-flex items-center justify-center gap-2 ${btnClass} disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition`}
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
