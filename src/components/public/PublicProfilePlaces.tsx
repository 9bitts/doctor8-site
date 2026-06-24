"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { PracticeLocationDto } from "@/lib/practice";

const PublicMiniMap = dynamic(() => import("@/components/public/PublicMiniMap"), {
  ssr: false,
  loading: () => <div className="w-full h-[200px] bg-slate-50 rounded-xl animate-pulse" />,
});

type Fallback = {
  clinicName: string | null;
  clinicAddress: string | null;
  clinicCity: string | null;
  clinicState: string | null;
  clinicCountry: string | null;
  clinicLatitude: number | null;
  clinicLongitude: number | null;
  acceptsTeleconsult: boolean;
};

export default function PublicProfilePlaces({
  locations,
  fallback,
  providerName,
}: {
  locations: PracticeLocationDto[];
  fallback: Fallback;
  providerName: string;
}) {
  const { t } = useI18n();
  const [activeIdx, setActiveIdx] = useState(0);

  const effectiveLocations: PracticeLocationDto[] =
    locations.length > 0
      ? locations
      : fallback.clinicAddress || fallback.clinicCity
        ? [{
            id: "legacy",
            name: fallback.clinicName || t("pubPhase3.primaryLocation"),
            address: fallback.clinicAddress || "",
            city: fallback.clinicCity || "",
            state: fallback.clinicState,
            country: fallback.clinicCountry,
            zip: null,
            latitude: fallback.clinicLatitude,
            longitude: fallback.clinicLongitude,
            isPrimary: true,
            sortOrder: 0,
          }]
        : [];

  const active = effectiveLocations[activeIdx] ?? null;
  const hasCoords =
    active?.latitude != null &&
    active?.longitude != null &&
    Number.isFinite(active.latitude) &&
    Number.isFinite(active.longitude);

  return (
    <div className="space-y-4">
      {effectiveLocations.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          {effectiveLocations.length > 1 && (
            <div className="flex gap-1 overflow-x-auto mb-4 border-b border-slate-100 pb-2">
              {effectiveLocations.map((loc, i) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => setActiveIdx(i)}
                  className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                    i === activeIdx
                      ? "bg-brand-500 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {loc.name || `${t("pubPhase3.addressTab")} ${i + 1}`}
                </button>
              ))}
            </div>
          )}

          {active && (
            <div>
              {active.name && effectiveLocations.length === 1 && (
                <p className="font-semibold text-slate-800 text-sm mb-1">{active.name}</p>
              )}
              <p className="flex items-start gap-2 text-sm text-slate-600">
                <MapPin size={15} className="text-brand-400 shrink-0 mt-0.5" />
                <span>
                  {[active.address, active.city, active.state, active.country].filter(Boolean).join(", ")}
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        {hasCoords && active ? (
          <PublicMiniMap
            lat={active.latitude!}
            lng={active.longitude!}
            label={active.name || providerName}
          />
        ) : (
          <div className="h-[200px] lg:min-h-[200px] bg-slate-50 rounded-xl flex items-center justify-center text-sm text-slate-400 text-center px-4">
            {fallback.acceptsTeleconsult ? t("pub.teleconsultOnly") : t("pub.noMap")}
          </div>
        )}
      </div>
    </div>
  );
}
