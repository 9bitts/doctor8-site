"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, FilePlus2, Sprout } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { mapProfessionalPathToPortal } from "@/lib/psychologist-portal";
import { INTEGRATIVE_STARTER_PROTOCOLS } from "@/lib/integrative-medicine/protocols";
import { professionalIntegrativePrescriptionHref, professionalIntegrativeProtocolHref } from "@/lib/integrative-medicine/professional-routes";
import { naturalMedicineBasePath } from "@/lib/natural-medicine/config";
import { canPrescribeCannabisMedicinal } from "@/lib/profession-label";
import { useSession } from "next-auth/react";

export default function IntegrativeProfessionalHubCockpit() {
  const { t } = useI18n();
  const pathname = usePathname();
  const { data: session } = useSession();
  const base = naturalMedicineBasePath("professional");

  const href = (path: string) => mapProfessionalPathToPortal(pathname, path);
  const canCannabis = canPrescribeCannabisMedicinal(session?.user?.professionalSpecialty);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            {t("nm.pro.hub.newRx")}
          </p>
          <p className="text-sm text-slate-600 mt-1">{t("nm.pro.hub.newRxHint")}</p>
        </div>
        <Link
          href={href(professionalIntegrativePrescriptionHref("phytotherapy"))}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition shrink-0"
        >
          <FilePlus2 size={18} />
          {t("nm.pro.hub.newRx")}
        </Link>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            {t("nm.pro.hub.protocolsTitle")}
          </h2>
          <p className="text-sm text-slate-500 mt-1">{t("nm.pro.hub.protocolsHint")}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {INTEGRATIVE_STARTER_PROTOCOLS.map((protocol) => (
            <div
              key={protocol.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-3"
            >
              <div className="flex-1">
                <p className="font-semibold text-slate-900">{t(protocol.titleKey)}</p>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">{t(protocol.descKey)}</p>
              </div>
              <Link
                href={href(professionalIntegrativeProtocolHref(protocol.presetId))}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-900"
              >
                {t("nm.pro.hub.useProtocol")} <ArrowRight size={16} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {canCannabis && (
        <section className="rounded-2xl border border-lime-200 bg-lime-50/80 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-lime-100 flex items-center justify-center shrink-0">
              <Sprout size={20} className="text-lime-800" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">{t("nm.pro.hub.cannabisBannerTitle")}</p>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">{t("nm.pro.hub.cannabisBanner")}</p>
            </div>
          </div>
          <Link
            href={href(`${base}/cannabis`)}
            className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl border border-lime-300 bg-white hover:bg-lime-50 text-lime-900 shrink-0"
          >
            {t("nm.pro.hub.cannabisAction")} <ArrowRight size={16} />
          </Link>
        </section>
      )}
    </div>
  );
}
