import Link from "next/link";
import { AlertTriangle, Heart, Phone, ChevronRight } from "lucide-react";

type Props = {
  t: (key: string) => string;
  allergies: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
};

export default function PatientHealthSnapshot({
  t,
  allergies,
  emergencyContactName,
  emergencyContactPhone,
}: Props) {
  const hasAllergies = Boolean(allergies?.trim());
  const hasEmergency = Boolean(emergencyContactName?.trim() || emergencyContactPhone?.trim());
  const incomplete = !hasAllergies || !hasEmergency;

  return (
    <div
      className={`rounded-2xl border shadow-sm overflow-hidden ${
        hasAllergies
          ? "bg-rose-50/80 border-rose-200"
          : incomplete
            ? "bg-amber-50/70 border-amber-200"
            : "bg-white border-slate-100"
      }`}
      role={hasAllergies ? "alert" : undefined}
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-inherit">
        <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
          <Heart size={16} className={hasAllergies ? "text-rose-600" : "text-brand-500"} aria-hidden />
          {t("pdash.health.title")}
        </div>
        <Link
          href="/patient/history"
          className="text-xs text-brand-600 hover:text-brand-500 font-medium flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 rounded"
        >
          {t("pdash.health.action")} <ChevronRight size={14} aria-hidden />
        </Link>
      </div>
      <div className="p-5 grid sm:grid-cols-2 gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <AlertTriangle
            size={18}
            className={`shrink-0 mt-0.5 ${hasAllergies ? "text-rose-600" : "text-slate-400"}`}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t("pdash.health.allergies")}
            </p>
            {hasAllergies ? (
              <p className="text-sm font-semibold text-rose-900 mt-0.5 break-words">{allergies}</p>
            ) : (
              <Link href="/patient/history" className="text-sm text-amber-800 mt-0.5 hover:underline">
                {t("pdash.health.allergiesEmpty")}
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-start gap-3 min-w-0">
          <Phone size={18} className={`shrink-0 mt-0.5 ${hasEmergency ? "text-brand-500" : "text-slate-400"}`} aria-hidden />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t("pdash.health.emergency")}
            </p>
            {hasEmergency ? (
              <p className="text-sm font-medium text-slate-800 mt-0.5 break-words">
                {[emergencyContactName, emergencyContactPhone].filter(Boolean).join(" · ")}
              </p>
            ) : (
              <Link href="/patient/history" className="text-sm text-amber-800 mt-0.5 hover:underline">
                {t("pdash.health.emergencyEmpty")}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
