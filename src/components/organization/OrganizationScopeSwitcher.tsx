"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  readOrgProfessionalCookie,
  writeOrgProfessionalCookie,
} from "@/lib/work-context";

type Prof = { professionalId: string; name: string };

export default function OrganizationScopeSwitcher() {
  const { t } = useI18n();
  const router = useRouter();
  const [professionals, setProfessionals] = useState<Prof[]>([]);
  const [selected, setSelected] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSelected(readOrgProfessionalCookie());
    fetch("/api/organization/professionals")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.professionals)) {
          setProfessionals(
            data.professionals
              .filter((p: { status?: string }) => p.status === "ACTIVE")
              .map((p: { professionalId: string; name: string }) => ({
                professionalId: p.professionalId,
                name: p.name,
              })),
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || professionals.length <= 1) return null;

  function onChange(value: string) {
    setSelected(value);
    writeOrgProfessionalCookie(value);
    router.refresh();
  }

  return (
    <div className="relative hidden sm:flex items-center">
      <Building2 size={16} className="text-indigo-500 shrink-0 mr-1.5" />
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        aria-label={t("org.scope.label")}
        className="appearance-none bg-indigo-50 border border-indigo-200 text-indigo-900 text-sm font-medium rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 max-w-[200px] truncate"
      >
        <option value="">{t("org.scope.all")}</option>
        {professionals.map((p) => (
          <option key={p.professionalId} value={p.professionalId}>
            {p.name}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-2 text-indigo-400 pointer-events-none" />
    </div>
  );
}
