import Link from "next/link";
import { ClipboardList, ScrollText, Upload } from "lucide-react";

type Props = {
  t: (key: string) => string;
};

export default function PatientSendToProfessionalsBanner({ t }: Props) {
  return (
    <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-sky-50 shadow-sm overflow-hidden">
      <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
          <Upload size={22} className="text-brand-600" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-base">{t("pdash.send.title")}</p>
          <p className="text-sm text-slate-600 mt-0.5">{t("pdash.send.desc")}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
          <Link
            href="/patient/documents"
            className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
          >
            <ClipboardList size={16} aria-hidden />
            {t("pdash.send.docs")}
          </Link>
          <Link
            href="/patient/assinar-termos"
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-brand-700 border border-brand-200 text-sm font-semibold px-4 py-2.5 rounded-xl transition min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
          >
            <ScrollText size={16} aria-hidden />
            {t("pdash.send.terms")}
          </Link>
        </div>
      </div>
    </div>
  );
}
