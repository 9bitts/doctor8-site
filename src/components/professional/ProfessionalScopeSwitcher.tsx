"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Users, ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  readProScopeCookie,
  writeProScopeCookie,
  type ProScope,
} from "@/lib/work-context";

type WorkContexts = {
  clinic: { id: string; name: string } | null;
  organizations: { id: string; nomeFantasia: string }[];
};

export default function ProfessionalScopeSwitcher() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [contexts, setContexts] = useState<WorkContexts | null>(null);
  const [scope, setScope] = useState<ProScope>("solo");

  useEffect(() => {
    setScope(readProScopeCookie());
    fetch("/api/professional/work-contexts")
      .then((r) => r.json())
      .then((data) => setContexts(data))
      .catch(() => setContexts({ clinic: null, organizations: [] }));
  }, []);

  if (!contexts) return null;
  const hasClinic = !!contexts.clinic;
  const hasOrg = contexts.organizations.length > 0;
  if (!hasClinic && !hasOrg) return null;

  function onScopeChange(value: ProScope) {
    setScope(value);
    writeProScopeCookie(value);
  }

  const orgLabel = contexts.organizations.map((o) => o.nomeFantasia).join(", ");

  return (
    <div className="hidden sm:flex items-center gap-2">
      {hasClinic && (
        <div className="relative flex items-center">
          <Users size={16} className="text-brand-500 shrink-0 mr-1.5" />
          <select
            value={scope}
            onChange={(e) => onScopeChange(e.target.value as ProScope)}
            aria-label={t("pro.scope.label")}
            className="appearance-none bg-brand-50 border border-brand-200 text-brand-900 text-sm font-medium rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30 max-w-[180px] truncate"
          >
            <option value="solo">{t("pro.scope.solo")}</option>
            <option value="clinic">
              {t("pro.scope.clinic").replace("{{name}}", contexts.clinic!.name)}
            </option>
          </select>
          <ChevronDown size={14} className="absolute right-2 text-brand-400 pointer-events-none" />
        </div>
      )}

      {scope === "clinic" && hasClinic && !pathname.startsWith("/professional/shared") && (
        <Link
          href="/professional/shared"
          className="text-xs font-medium text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-1.5 rounded-lg hover:bg-brand-100 transition whitespace-nowrap"
        >
          {t("pro.scope.openShared")}
        </Link>
      )}

      {hasOrg && (
        <span
          className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg max-w-[160px] truncate"
          title={orgLabel}
        >
          <Building2 size={12} className="shrink-0" />
          {t("pro.scope.orgLinked").replace("{{name}}", contexts.organizations[0].nomeFantasia)}
          {contexts.organizations.length > 1 ? ` +${contexts.organizations.length - 1}` : ""}
        </span>
      )}
    </div>
  );
}
