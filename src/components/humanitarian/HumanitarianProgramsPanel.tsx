"use client";

import HumanitarianIntakesPanel from "@/components/humanitarian/HumanitarianIntakesPanel";
import HumanitarianAngelsAdminPanel from "@/components/humanitarian/HumanitarianAngelsAdminPanel";
import AngelTrainingRequirementsPanel from "@/components/humanitarian/AngelTrainingRequirementsPanel";
import HumanitarianMissionsAdminPanel from "@/components/humanitarian/HumanitarianMissionsAdminPanel";
import HumanitarianAngelCoordinationPanel from "@/components/humanitarian/HumanitarianAngelCoordinationPanel";
import Link from "next/link";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";

/** Angels, missions — secondary to live ops. Acura volunteers live in dedicated admin page. */
export default function HumanitarianProgramsPanel({
  slug = VENEZUELA_CAMPAIGN_SLUG,
}: {
  slug?: string;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-600">
        Programas auxiliares (fichas, Angels). Voluntários AcuraBrasil ficam em{" "}
        <Link href="/admin/acura-volunteers" className="font-medium text-sky-700 hover:underline">
          Voluntários AcuraBrasil
        </Link>
        . Não confundir com voluntários online na fila JIT — veja a aba <strong>Ao vivo</strong>.
      </div>
      <HumanitarianIntakesPanel slug={slug} />
      <AngelTrainingRequirementsPanel />
      <HumanitarianMissionsAdminPanel />
      <HumanitarianAngelCoordinationPanel />
      <HumanitarianAngelsAdminPanel />
    </div>
  );
}
