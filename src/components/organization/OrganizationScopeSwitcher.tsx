"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  readOrgProviderScopeCookie,
  writeOrgProviderScopeCookie,
} from "@/lib/work-context";

type ProviderOption = { scopeKey: string; name: string; specialty: string };

export default function OrganizationScopeSwitcher() {
  const { t } = useI18n();
  const router = useRouter();
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [selected, setSelected] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSelected(readOrgProviderScopeCookie());
    fetch("/api/organization/professionals")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data.providers) ? data.providers : data.professionals;
        if (Array.isArray(list)) {
          setProviders(
            list
              .filter((p: { status?: string }) => p.status === "ACTIVE")
              .map((p: { scopeKey?: string; professionalId: string; name: string; specialty?: string; providerType?: string }) => ({
                scopeKey: p.scopeKey || `HEALTH:${p.professionalId}`,
                name: p.name,
                specialty: p.specialty ?? "",
              })),
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || providers.length <= 1) return null;

  function onChange(value: string) {
    setSelected(value);
    writeOrgProviderScopeCookie(value);
    router.refresh();
  }

  return (
    <div className="relative hidden sm:flex items-center">
      <Building2 size={16} className="text-indigo-500 shrink-0 mr-1.5" />
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        aria-label={t("org.scope.label")}
        className="appearance-none bg-indigo-50 border border-indigo-200 text-indigo-900 text-sm font-medium rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 max-w-[220px] truncate"
      >
        <option value="">{t("org.scope.all")}</option>
        {providers.map((p) => (
          <option key={p.scopeKey} value={p.scopeKey}>
            {p.name}
            {p.specialty ? ` ? ${p.specialty}` : ""}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-2 text-indigo-400 pointer-events-none" />
    </div>
  );
}
