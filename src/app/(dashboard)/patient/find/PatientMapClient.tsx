"use client";

// Interactive map of verified professionals for patients.

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  MapContainer, TileLayer, Marker, Popup, Circle, useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useT } from "@/lib/i18n/I18nProvider";
import {
  Search, Loader2, MapPin, Radio, Calendar, X, Navigation,
  Stethoscope, ChevronRight, AlertCircle,
} from "lucide-react";

export interface MapProfessional {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  specialty: string;
  professionType: string;
  license: string;
  avatarUrl: string | null;
  consultPrice: number;
  currency: string;
  acceptsTeleconsult: boolean;
  acceptsInPerson: boolean;
  clinicCity: string | null;
  clinicState: string | null;
  lat: number | null;
  lng: number | null;
  distanceKm: number | null;
  isOnline: boolean;
  jitSessionId: string | null;
}

interface Center {
  lat: number;
  lng: number;
}

// Custom marker icons (Leaflet default paths break in bundlers)
const onlineIcon = L.divIcon({
  className: "",
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#10b981;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.25);"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const offlineIcon = L.divIcon({
  className: "",
  html: `<div style="width:24px;height:24px;border-radius:50%;background:#64748b;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.2);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function MapRecenter({ center }: { center: Center }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom());
  }, [center.lat, center.lng, map]);
  return null;
}

function professionLabel(t: (k: string) => string, type: string): string {
  const key = `map.profession.${type}`;
  const v = t(key);
  return v !== key ? v : t("map.profession.professional");
}

export default function PatientMapClient() {
  const t = useT();
  const [professionals, setProfessionals] = useState<MapProfessional[]>([]);
  const [center, setCenter]               = useState<Center | null>(null);
  const [loading, setLoading]             = useState(true);
  const [geoLoading, setGeoLoading]       = useState(false);
  const [error, setError]                 = useState("");
  const [searchQuery, setSearchQuery]     = useState("");
  const [selected, setSelected]           = useState<MapProfessional | null>(null);
  const [filterOnline, setFilterOnline]   = useState(false);
  const [mounted, setMounted]             = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const loadProfessionals = useCallback(async (lat?: number, lng?: number, q?: string) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (lat != null && lng != null) {
        params.set("lat", String(lat));
        params.set("lng", String(lng));
      }
      if (q) params.set("q", q);
      const res = await fetch(`/api/patient/professionals-map?${params}`);
      if (!res.ok) { setError(t("map.err.load")); return; }
      const data = await res.json();
      setProfessionals(data.professionals || []);
      if (data.center) setCenter(data.center);
    } catch {
      setError(t("map.err.network"));
    }
    setLoading(false);
  }, [t]);

  // Initial: browser geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      loadProfessionals(undefined, undefined, "São Paulo, Brazil");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(c);
        loadProfessionals(c.lat, c.lng);
        setGeoLoading(false);
      },
      () => {
        loadProfessionals(undefined, undefined, "São Paulo, Brazil");
        setGeoLoading(false);
      },
      { timeout: 8000, maximumAge: 300000 }
    );
  }, [loadProfessionals]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setGeoLoading(true);
    loadProfessionals(undefined, undefined, searchQuery.trim()).finally(() => setGeoLoading(false));
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(c);
        setSearchQuery("");
        loadProfessionals(c.lat, c.lng);
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { timeout: 8000 }
    );
  }

  const filtered = useMemo(
    () => (filterOnline ? professionals.filter((p) => p.isOnline) : professionals),
    [professionals, filterOnline]
  );

  const mapCenter: Center = center ?? { lat: -23.5505, lng: -46.6333 };
  const withLocation = filtered.filter((p) => p.lat != null && p.lng != null);

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <MapPin size={24} className="text-emerald-500" />
          {t("map.title")}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{t("map.subtitle")}</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("map.searchPlaceholder")}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
          />
        </div>
        <button
          type="submit"
          disabled={geoLoading}
          className="px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
        >
          {geoLoading ? <Loader2 size={18} className="animate-spin" /> : t("map.search")}
        </button>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={geoLoading}
          className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Navigation size={16} /> {t("map.myLocation")}
        </button>
      </form>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap text-sm">
        <button
          onClick={() => setFilterOnline(false)}
          className={`px-3 py-1.5 rounded-full font-medium transition ${!filterOnline ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        >
          {t("map.filter.all")} ({professionals.length})
        </button>
        <button
          onClick={() => setFilterOnline(true)}
          className={`px-3 py-1.5 rounded-full font-medium transition inline-flex items-center gap-1.5 ${filterOnline ? "bg-emerald-500 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
        >
          <span className="w-2 h-2 rounded-full bg-current" />
          {t("map.filter.online")} ({professionals.filter((p) => p.isOnline).length})
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Map */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-h-[360px] lg:min-h-[520px] relative">
          {(loading || geoLoading) && (
            <div className="absolute inset-0 bg-white/80 z-[500] flex items-center justify-center">
              <Loader2 size={32} className="animate-spin text-slate-400" />
            </div>
          )}
          {mounted && (
            <MapContainer
              center={[mapCenter.lat, mapCenter.lng]}
              zoom={12}
              className="w-full h-[360px] lg:h-[520px]"
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {center && (
                <>
                  <Circle
                    center={[center.lat, center.lng]}
                    radius={500}
                    pathOptions={{ color: "#10b981", fillColor: "#10b981", fillOpacity: 0.08, weight: 1 }}
                  />
                  <Marker
                    position={[center.lat, center.lng]}
                    icon={L.divIcon({
                      className: "",
                      html: `<div style="width:14px;height:14px;border-radius:50%;background:#3b82f6;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3);"></div>`,
                      iconSize: [14, 14],
                      iconAnchor: [7, 7],
                    })}
                  />
                  <MapRecenter center={center} />
                </>
              )}
              {withLocation.map((pro) => (
                <Marker
                  key={pro.id}
                  position={[pro.lat!, pro.lng!]}
                  icon={pro.isOnline ? onlineIcon : offlineIcon}
                  eventHandlers={{ click: () => setSelected(pro) }}
                >
                  <Popup>
                    <div className="text-sm min-w-[160px]">
                      <p className="font-bold">{pro.name}</p>
                      <p className="text-slate-500 text-xs">{pro.specialty}</p>
                      <button
                        onClick={() => setSelected(pro)}
                        className="mt-2 text-emerald-600 font-semibold text-xs"
                      >
                        {t("map.viewProfile")} →
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>

        {/* List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col max-h-[520px]">
          <div className="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-700">
            {t("map.listTitle")} ({filtered.length})
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filtered.length === 0 && !loading ? (
              <p className="text-center text-slate-400 text-sm py-12 px-4">{t("map.empty")}</p>
            ) : (
              filtered.map((pro) => (
                <button
                  key={pro.id}
                  onClick={() => setSelected(pro)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 transition flex items-start gap-3"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold ${pro.isOnline ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {pro.firstName?.[0]}{pro.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800 text-sm truncate">{pro.name}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${pro.isOnline ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {pro.isOnline ? t("map.online") : t("map.offline")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{professionLabel(t, pro.professionType)} · {pro.specialty}</p>
                    {pro.license && <p className="text-xs text-slate-400 mt-0.5">{pro.license}</p>}
                    {pro.distanceKm != null && (
                      <p className="text-xs text-emerald-600 mt-0.5">{pro.distanceKm} km</p>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-slate-300 shrink-0 mt-2" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-900 text-lg">{selected.name}</h2>
                <p className="text-sm text-slate-500">{professionLabel(t, selected.professionType)} · {selected.specialty}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {selected.license && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Stethoscope size={16} className="text-slate-400" />
                  <span>{selected.license}</span>
                </div>
              )}

              {(selected.clinicCity || selected.clinicState) && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin size={16} className="text-slate-400" />
                  <span>{[selected.clinicCity, selected.clinicState].filter(Boolean).join(", ")}</span>
                </div>
              )}

              <div className={`inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-full ${selected.isOnline ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                <span className={`w-2 h-2 rounded-full ${selected.isOnline ? "bg-emerald-500" : "bg-slate-400"}`} />
                {selected.isOnline ? t("map.onlineNow") : t("map.offlineNow")}
              </div>

              {selected.distanceKm != null && (
                <p className="text-sm text-slate-500">{t("map.distance")}: <strong>{selected.distanceKm} km</strong></p>
              )}

              <div className="grid grid-cols-1 gap-3 pt-2">
                <Link
                  href={selected.isOnline && selected.jitSessionId
                    ? `/urgent?sessionId=${selected.jitSessionId}`
                    : "/urgent"}
                  className={`flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition ${
                    selected.isOnline
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-400 pointer-events-none"
                  }`}
                  onClick={(e) => { if (!selected.isOnline) e.preventDefault(); }}
                >
                  <Radio size={18} />
                  {t("map.action.now")}
                </Link>

                <Link
                  href={`/patient/appointments?pro=${selected.id}`}
                  className="flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-emerald-500 text-emerald-700 hover:bg-emerald-50 font-semibold text-sm transition"
                  onClick={() => setSelected(null)}
                >
                  <Calendar size={18} />
                  {t("map.action.schedule")}
                </Link>
              </div>

              {!selected.isOnline && (
                <p className="text-xs text-slate-400 text-center">{t("map.offlineHint")}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
