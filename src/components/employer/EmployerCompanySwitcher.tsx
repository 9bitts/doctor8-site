"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Building2 } from "lucide-react";
import { readEmployerCompanyCookie, writeEmployerCompanyCookie } from "@/lib/work-context";

type Membership = {
  employerCompanyId: string;
  nomeFantasia: string;
  cnpj: string;
};

export default function EmployerCompanySwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [selected, setSelected] = useState("");
  const [loaded, setLoaded] = useState(false);

  const isEmployerArea =
    pathname.startsWith("/empresas") && !pathname.startsWith("/empresas/medico");

  useEffect(() => {
    if (!isEmployerArea) return;
    setSelected(readEmployerCompanyCookie());
    fetch("/api/employer/memberships")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.memberships)) {
          setMemberships(data.memberships);
          if (data.selectedCompanyId) {
            setSelected(data.selectedCompanyId);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [isEmployerArea]);

  if (!isEmployerArea || !loaded || memberships.length <= 1) return null;

  function onChange(value: string) {
    setSelected(value);
    writeEmployerCompanyCookie(value);
    router.refresh();
  }

  return (
    <div className="relative flex items-center mb-4 px-1">
      <Building2 size={16} className="text-indigo-500 shrink-0 mr-1.5" />
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Selecionar empresa"
        className="appearance-none bg-indigo-50 border border-indigo-200 text-indigo-900 text-sm font-medium rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 max-w-[280px] truncate"
      >
        {memberships.map((m) => (
          <option key={m.employerCompanyId} value={m.employerCompanyId}>
            {m.nomeFantasia}
          </option>
        ))}
      </select>
    </div>
  );
}
