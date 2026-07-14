"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";
import type { StatusRegulatorio } from "@/lib/medicina-natural/item-types";

const STATUS_STYLES: Record<StatusRegulatorio, string> = {
  MEDICAMENTO_REGISTRADO: "bg-blue-100 text-blue-800 border-blue-200",
  PRODUTO_TRADICIONAL_NOTIFICADO: "bg-teal-100 text-teal-800 border-teal-200",
  USO_TRADICIONAL_SEM_REGISTRO: "bg-amber-100 text-amber-800 border-amber-200",
  PRATICA_INTEGRATIVA_NAO_REGULADA: "bg-slate-100 text-slate-700 border-slate-200",
  PRODUTO_AUTORIZADO_ANVISA: "bg-lime-100 text-lime-900 border-lime-300",
};

export default function StatusRegulatorioBadge({
  status,
  className = "",
}: {
  status: StatusRegulatorio;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <span
      className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[status]} ${className}`}
    >
      {t(`nm.status.${status}`)}
    </span>
  );
}
