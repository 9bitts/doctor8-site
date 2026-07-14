"use client";

import { Loader2 } from "lucide-react";
import { keepFocusOnPointerDown } from "@/lib/combobox-interaction";
import {
  displayNameInitials,
  splitDisplayName,
  type ImportablePatient,
  type PlatformMatch,
} from "@/app/(dashboard)/professional/prescriptions/components/shared";

export type PlatformPatientResultsProps = {
  t: (k: string) => string;
  importable: ImportablePatient[];
  platformMatches: PlatformMatch[];
  requestingLinkId?: string | null;
  importingPatientId?: string | null;
  showPrescribe?: boolean;
  onImportPatient: (item: ImportablePatient) => void;
  onRequestLink: (match: PlatformMatch) => void;
  onSelectPlatformForRx?: (match: PlatformMatch) => void;
};

export function PlatformPatientResults({
  t,
  importable,
  platformMatches,
  requestingLinkId = null,
  importingPatientId = null,
  showPrescribe = false,
  onImportPatient,
  onRequestLink,
  onSelectPlatformForRx,
}: PlatformPatientResultsProps) {
  if (importable.length === 0 && platformMatches.length === 0) return null;

  return (
    <>
      {importable.map((item) => (
        <button
          key={`import-${item.patientProfileId}`}
          type="button"
          onMouseDown={keepFocusOnPointerDown}
          onClick={() => onImportPatient(item)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 transition text-left disabled:opacity-50"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center font-bold text-emerald-700 text-xs shrink-0">
            {item.firstName[0]}{item.lastName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-800 text-sm">{item.firstName} {item.lastName}</p>
            <p className="text-xs text-emerald-600">{t("rx2.importPatientBadge")}</p>
            {item.email && <p className="text-xs text-slate-400 truncate">{item.email}</p>}
          </div>
          {importingPatientId === item.patientProfileId ? (
            <Loader2 size={16} className="animate-spin text-emerald-500 shrink-0" />
          ) : (
            <span className="text-xs font-semibold text-emerald-600 shrink-0">{t("rx2.importPatientChart")}</span>
          )}
        </button>
      ))}

      {platformMatches.map((match) => (
        <div
          key={match.patientProfileId}
          className="px-4 py-3 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center gap-2"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs shrink-0">
              {displayNameInitials(match.displayName)}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-slate-800 text-sm">{match.displayName}</p>
              {match.city && <p className="text-xs text-slate-400">{match.city}</p>}
              <p className="text-xs text-slate-500">
                {match.linkStatus === "ACCEPTED"
                  ? t("link.statusAccepted")
                  : match.linkStatus === "PENDING"
                    ? t("link.statusPending")
                    : t("link.platformBadge")}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">
            {match.linkStatus !== "ACCEPTED" && match.linkStatus !== "PENDING" && (
              <button
                type="button"
                disabled={requestingLinkId === match.patientUserId}
                onMouseDown={keepFocusOnPointerDown}
                onClick={() => onRequestLink(match)}
                className="text-xs font-semibold border border-brand-200 text-brand-600 px-2.5 py-1.5 rounded-lg disabled:opacity-50 min-h-[44px]"
              >
                {requestingLinkId === match.patientUserId ? (
                  <Loader2 size={14} className="animate-spin inline" />
                ) : (
                  t("link.requestConnection")
                )}
              </button>
            )}
            {showPrescribe && onSelectPlatformForRx && (
              <button
                type="button"
                onMouseDown={keepFocusOnPointerDown}
                onClick={() => onSelectPlatformForRx(match)}
                className="text-xs font-semibold bg-brand-500 text-white px-2.5 py-1.5 rounded-lg min-h-[44px]"
              >
                {t("link.prescribeWithoutChart")}
              </button>
            )}
            {match.hasLink && (
              <button
                type="button"
                disabled={importingPatientId === match.patientProfileId}
                onMouseDown={keepFocusOnPointerDown}
                onClick={() => {
                  const { firstName, lastName } = splitDisplayName(match.displayName);
                  onImportPatient({
                    patientProfileId: match.patientProfileId,
                    userId: match.patientUserId,
                    firstName,
                    lastName,
                    email: null,
                    hasAccount: true,
                    source: "appointment",
                  });
                }}
                className="text-xs font-semibold border border-emerald-200 text-emerald-700 px-2.5 py-1.5 rounded-lg disabled:opacity-50 min-h-[44px]"
              >
                {importingPatientId === match.patientProfileId ? (
                  <Loader2 size={14} className="animate-spin inline" />
                ) : (
                  t("rx2.importPatientChart")
                )}
              </button>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
