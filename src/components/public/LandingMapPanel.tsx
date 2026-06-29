"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import { getProfessionLabel } from "@/lib/professions";
import {
  Search,
  Loader2,
  MapPin,
  Navigation,
  X,
  Star,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import type { MapProfessional } from "@/app/(dashboard)/patient/find/PatientMapClient";

const PatientMapView = dynamic(
  () => import("@/app/(dashboard)/patient/find/PatientMapView"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[320px] w-full items-center justify-center bg-slate-50 sm:h-[420px]">
        <Loader2 size={28} className="animate-spin text-slate-400" />
      </div>
    ),
  }
);

interface Center {
  lat: number;
  lng: number;
}

const RADIUS_OPTIONS = [0, 5, 10, 50] as const;

function StarRating({ avg, count }: { avg: number | null; count: number }) {
  const n = avg != null ? Number(avg) : 0;
  if (!Number.isFinite(n) || n <= 0 || count === 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500">
      <Star size={12} fill="currentColor" />
      <span className="text-xs font-semibold text-slate-700">{n.toFixed(1)}</span>
      <span className="text-[10px] text-slate-400">({count})</span>
    </span>
  );
}

type Props = {
  defaultQuery?: string;
};

export default function LandingMapPanel({ defaultQuery = "Rio de Janeiro" }: Props) {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);

  const [searchQuery, setSearchQuery] = useState(defaultQuery);
  const [specialty, setSpecialty] = useState("");
  const [radiusKm, setRadiusKm] = useState<number>(0);
  const [center, setCenter] = useState<Center | null>(null);
  const [professionals, setProfessionals] = useState<MapProfessional[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<MapProfessional | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    setMapReady(true);
  }, []);

  const loadProfessionals = useCallback(
    async (lat?: number, lng?: number, q?: string, spec?: string, radius?: number) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (lat != null && lng != null) {
          params.set("lat", String(lat));
          params.set("lng", String(lng));
        }
        if (q) params.set("q", q);
        if (spec) params.set("specialty", spec);
        if (radius) params.set("radiusKm", String(radius));
        const res = await fetch(`/api/public/professionals-map?${params}`);
        if (!res.ok) {
          setError(t("map.err.load"));
          return;
        }
        const data = await res.json();
        setProfessionals(data.professionals || []);
        if (data.specialties) setSpecialties(data.specialties);
        if (data.center) setCenter(data.center);
      } catch {
        setError(t("map.err.network"));
      }
      setLoading(false);
    },
    [t]
  );

  useEffect(() => {
    if (!navigator.geolocation) {
      loadProfessionals(undefined, undefined, defaultQuery, specialty, radiusKm);
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(c);
        loadProfessionals(c.lat, c.lng, undefined, specialty, radiusKm);
        setGeoLoading(false);
      },
      () => {
        loadProfessionals(undefined, undefined, defaultQuery, specialty, radiusKm);
        setGeoLoading(false);
      },
      { timeout: 8000, maximumAge: 300000 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!center) return;
    loadProfessionals(center.lat, center.lng, searchQuery || undefined, specialty, radiusKm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialty, radiusKm]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setGeoLoading(true);
    loadProfessionals(undefined, undefined, searchQuery.trim(), specialty, radiusKm).finally(() =>
      setGeoLoading(false)
    );
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(c);
        setSearchQuery("");
        loadProfessionals(c.lat, c.lng, undefined, specialty, radiusKm);
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { timeout: 8000 }
    );
  }

  const mapPins = useMemo(
    () => professionals.filter((p) => p.showOnMap && p.lat != null && p.lng != null),
    [professionals]
  );

  const mapCenter: Center = center ?? { lat: -22.9068, lng: -43.1729 };

  const registerHref = `/register?callbackUrl=${encodeURIComponent("/patient/find")}`;

  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 shadow-2xl sm:p-5">
      <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("map.searchPlaceholder")}
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-accent-500/40"
          />
        </div>
        <button
          type="submit"
          disabled={geoLoading}
          className="rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-600 disabled:opacity-50"
        >
          {geoLoading ? <Loader2 size={16} className="animate-spin" /> : t("map.search")}
        </button>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={geoLoading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <Navigation size={15} /> {t("map.myLocation")}
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent-500/40"
        >
          <option value="">{t("map.specialty.all")}</option>
          {specialties.map((s) => (
            <option key={s} value={s}>
              {getProfessionLabel(lang, s)}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs font-medium text-slate-500">{t("map.radius")}:</span>
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRadiusKm(r)}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                radiusKm === r ? "bg-accent-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {r === 0 ? t("map.radius.all") : `${r} km`}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-5">
        <div className="relative min-h-[320px] overflow-hidden rounded-xl border border-slate-100 lg:col-span-3 lg:min-h-[420px]">
          {(loading || geoLoading) && (
            <div className="absolute inset-0 z-[500] flex items-center justify-center bg-white/80">
              <Loader2 size={28} className="animate-spin text-slate-400" />
            </div>
          )}
          {mapReady && (
            <PatientMapView
              mapCenter={mapCenter}
              center={center}
              radiusKm={radiusKm}
              pins={mapPins}
              onSelect={setSelected}
              lang={lang}
              renderPopup={(pro) => (
                <div className="min-w-[160px] space-y-1 text-sm">
                  <p className="font-bold">{pro.name}</p>
                  <p className="text-xs text-slate-500">{getProfessionLabel(lang, pro.specialty)}</p>
                  <StarRating avg={pro.ratingAvg} count={pro.ratingCount} />
                  <button
                    type="button"
                    onClick={() => setSelected(pro)}
                    className="mt-1 text-xs font-semibold text-accent-600"
                  >
                    {t("map.viewProfile")} ?
                  </button>
                </div>
              )}
            />
          )}
        </div>

        <div className="flex max-h-[320px] flex-col overflow-hidden rounded-xl border border-slate-100 lg:col-span-2 lg:max-h-[420px]">
          <div className="border-b border-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
            {t("map.listTitle")} ({professionals.length})
          </div>
          <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">
            {professionals.length === 0 && !loading ? (
              <p className="px-4 py-10 text-center text-sm text-slate-400">{t("map.empty")}</p>
            ) : (
              professionals.slice(0, 40).map((pro) => (
                <button
                  key={pro.id}
                  type="button"
                  onClick={() => setSelected(pro)}
                  className="flex w-full items-start gap-2 px-3 py-2.5 text-left transition hover:bg-slate-50"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      pro.isOnline ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {pro.firstName?.[0]}
                    {pro.lastName?.[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{pro.name}</p>
                    <p className="truncate text-xs text-slate-500">{getProfessionLabel(lang, pro.specialty)}</p>
                    {pro.distanceKm != null && (
                      <p className="text-[10px] text-slate-400">
                        {pro.distanceKm} km · {pro.isOnline ? t("map.online") : t("map.offline")}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-slate-300" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400">{t("landingMap.signUpHint")}</p>

      {selected && (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div className="min-w-0 flex-1 pr-2">
                <h2 className="text-lg font-bold text-slate-900">{selected.name}</h2>
                <p className="text-sm text-slate-500">{getProfessionLabel(lang, selected.specialty)}</p>
                <div className="mt-1">
                  <StarRating avg={selected.ratingAvg} count={selected.ratingCount} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3 p-5">
              {(selected.clinicCity || selected.clinicState) && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin size={16} className="text-slate-400" />
                  <span>{[selected.clinicCity, selected.clinicState].filter(Boolean).join(", ")}</span>
                </div>
              )}
              {selected.distanceKm != null && (
                <p className="text-sm text-slate-500">
                  {t("map.distance")}: <strong>{selected.distanceKm} km</strong>
                </p>
              )}
              <div className="grid gap-2 pt-1">
                <Link
                  href={registerHref}
                  className="flex items-center justify-center rounded-xl bg-accent-500 py-3 text-sm font-semibold text-white transition hover:bg-accent-600"
                  onClick={() => setSelected(null)}
                >
                  {t("landingMap.bookCta")}
                </Link>
                <Link
                  href="/login/paciente"
                  className="flex items-center justify-center rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={() => setSelected(null)}
                >
                  {t("landingMap.loginCta")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
