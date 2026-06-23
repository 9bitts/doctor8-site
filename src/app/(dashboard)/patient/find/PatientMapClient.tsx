"use client";

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
  Stethoscope, ChevronRight, AlertCircle, Star, Heart, Clock, DollarSign,
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
  showOnMap: boolean;
  teleconsultOnly: boolean;
  distanceKm: number | null;
  isOnline: boolean;
  isFavorite: boolean;
  jitSessionId: string | null;
  jitIsFree: boolean;
  jitPriceAmount: number;
  jitQueueCount: number;
  estimatedWaitMinutes: number | null;
  displayPriceCents: number;
  ratingAvg: number | null;
  ratingCount: number;
  canReview: boolean;
}

interface Center { lat: number; lng: number }

const RADIUS_OPTIONS = [0, 5, 10, 50] as const;

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

function MapRecenter({ center, radiusKm }: { center: Center; radiusKm: number }) {
  const map = useMap();
  useEffect(() => {
    if (radiusKm > 0) {
      const bounds = L.circle([center.lat, center.lng], { radius: radiusKm * 1000 }).getBounds();
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    } else {
      map.setView([center.lat, center.lng], 12);
    }
  }, [center.lat, center.lng, radiusKm, map]);
  return null;
}

function professionLabel(t: (k: string) => string, type: string): string {
  const key = `map.profession.${type}`;
  const v = t(key);
  return v !== key ? v : t("map.profession.professional");
}

function StarRating({ avg, count, size = 12 }: { avg: number | null; count: number; size?: number }) {
  if (!avg || count === 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500">
      <Star size={size} fill="currentColor" />
      <span className="text-xs font-semibold text-slate-700">{avg.toFixed(1)}</span>
      <span className="text-[10px] text-slate-400">({count})</span>
    </span>
  );
}

function fmtPrice(cents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency || "BRL",
  }).format(cents / 100);
}

function ProListItem({
  pro, t, onSelect, onToggleFavorite, locale,
}: {
  pro: MapProfessional;
  t: (k: string) => string;
  onSelect: () => void;
  onToggleFavorite: (id: string) => void;
  locale: string;
}) {
  return (
    <div className="flex items-start gap-2 px-4 py-3 hover:bg-slate-50 transition">
      <button type="button" onClick={() => onSelect()} className="flex items-start gap-3 flex-1 min-w-0 text-left">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold ${pro.isOnline ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
          {pro.firstName?.[0]}{pro.lastName?.[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-800 text-sm truncate">{pro.name}</p>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${pro.isOnline ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
              {pro.isOnline ? t("map.online") : t("map.offline")}
            </span>
            {pro.teleconsultOnly && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {t("map.teleconsultOnly")}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">{professionLabel(t, pro.professionType)} · {pro.specialty}</p>
          {pro.license && <p className="text-xs text-slate-400 mt-0.5">{pro.license}</p>}
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <StarRating avg={pro.ratingAvg} count={pro.ratingCount} />
            {pro.distanceKm != null && (
              <span className="text-xs text-emerald-600">{pro.distanceKm} km</span>
            )}
            {pro.isOnline && (
              <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                <DollarSign size={10} />
                {pro.jitIsFree ? t("map.free") : fmtPrice(pro.displayPriceCents, pro.currency, locale)}
              </span>
            )}
            {pro.isOnline && pro.estimatedWaitMinutes != null && pro.estimatedWaitMinutes > 0 && (
              <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                <Clock size={10} /> ~{pro.estimatedWaitMinutes} {t("map.mins")}
              </span>
            )}
          </div>
        </div>
        <ChevronRight size={16} className="text-slate-300 shrink-0 mt-2" />
      </button>
      <button
        type="button"
        onClick={() => onToggleFavorite(pro.id)}
        className="p-2 shrink-0 text-rose-400 hover:text-rose-500"
        aria-label={t("map.favorite")}
      >
        <Heart size={18} fill={pro.isFavorite ? "currentColor" : "none"} />
      </button>
    </div>
  );
}

export default function PatientMapClient() {
  const t = useT();
  const locale = typeof navigator !== "undefined" && navigator.language?.startsWith("en") ? "en-US" : "pt-BR";

  const [professionals, setProfessionals] = useState<MapProfessional[]>([]);
  const [specialties, setSpecialties]     = useState<string[]>([]);
  const [center, setCenter]               = useState<Center | null>(null);
  const [loading, setLoading]             = useState(true);
  const [geoLoading, setGeoLoading]       = useState(false);
  const [error, setError]                 = useState("");
  const [searchQuery, setSearchQuery]     = useState("");
  const [selected, setSelected]           = useState<MapProfessional | null>(null);
  const [filterMode, setFilterMode]       = useState<"all" | "online" | "favorites">("all");
  const [specialty, setSpecialty]         = useState("");
  const [radiusKm, setRadiusKm]           = useState<number>(10);
  const [mounted, setMounted]             = useState(false);
  const [reviewRating, setReviewRating]   = useState(5);
  const [reviewSaving, setReviewSaving]   = useState(false);
  const [reviewMsg, setReviewMsg]         = useState("");

  useEffect(() => { setMounted(true); }, []);

  const loadProfessionals = useCallback(async (
    lat?: number, lng?: number, q?: string,
    spec?: string, radius?: number,
  ) => {
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
      const res = await fetch(`/api/patient/professionals-map?${params}`);
      if (!res.ok) { setError(t("map.err.load")); return; }
      const data = await res.json();
      setProfessionals(data.professionals || []);
      if (data.specialties) setSpecialties(data.specialties);
      if (data.center) setCenter(data.center);

      const proId = new URLSearchParams(window.location.search).get("pro");
      if (proId) {
        const pro = (data.professionals || []).find((p: MapProfessional) => p.id === proId);
        if (pro) setSelected(pro);
      }
    } catch {
      setError(t("map.err.network"));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    if (!navigator.geolocation) {
      loadProfessionals(undefined, undefined, "São Paulo, Brazil", specialty, radiusKm);
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
        loadProfessionals(undefined, undefined, "São Paulo, Brazil", specialty, radiusKm);
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
    loadProfessionals(undefined, undefined, searchQuery.trim(), specialty, radiusKm)
      .finally(() => setGeoLoading(false));
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

  async function toggleFavorite(professionalId: string) {
    const pro = professionals.find((p) => p.id === professionalId);
    if (!pro) return;
    try {
      if (pro.isFavorite) {
        await fetch(`/api/patient/favorites?professionalId=${professionalId}`, { method: "DELETE" });
      } else {
        await fetch("/api/patient/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ professionalId, notifyOnline: true }),
        });
      }
      setProfessionals((prev) =>
        prev.map((p) => p.id === professionalId ? { ...p, isFavorite: !p.isFavorite } : p)
      );
      if (selected?.id === professionalId) {
        setSelected((s) => s ? { ...s, isFavorite: !s.isFavorite } : s);
      }
    } catch { /* ignore */ }
  }

  async function submitReview() {
    if (!selected) return;
    setReviewSaving(true);
    setReviewMsg("");
    try {
      const res = await fetch("/api/patient/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professionalId: selected.id, rating: reviewRating }),
      });
      if (!res.ok) {
        setReviewMsg(t("map.review.err"));
        return;
      }
      setReviewMsg(t("map.review.ok"));
      setProfessionals((prev) =>
        prev.map((p) =>
          p.id === selected.id
            ? { ...p, ratingAvg: reviewRating, ratingCount: Math.max(p.ratingCount, 1) }
            : p
        )
      );
    } catch {
      setReviewMsg(t("map.err.network"));
    }
    setReviewSaving(false);
  }

  const filtered = useMemo(() => {
    let list = professionals;
    if (filterMode === "online") list = list.filter((p) => p.isOnline);
    if (filterMode === "favorites") list = list.filter((p) => p.isFavorite);
    return list;
  }, [professionals, filterMode]);

  const mapPins = filtered.filter((p) => p.showOnMap && p.lat != null && p.lng != null);
  const teleconsultList = filtered.filter((p) => p.teleconsultOnly && p.isOnline);
  const regularList = filtered.filter((p) => !(p.teleconsultOnly && p.isOnline) || p.showOnMap);

  const mapCenter: Center = center ?? { lat: -23.5505, lng: -46.6333 };

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <MapPin size={24} className="text-emerald-500" />
          {t("map.title")}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{t("map.subtitle")}</p>
      </div>

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
        <button type="submit" disabled={geoLoading}
          className="px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50">
          {geoLoading ? <Loader2 size={18} className="animate-spin" /> : t("map.search")}
        </button>
        <button type="button" onClick={useMyLocation} disabled={geoLoading}
          className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <Navigation size={16} /> {t("map.myLocation")}
        </button>
      </form>

      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="">{t("map.specialty.all")}</option>
          {specialties.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 font-medium">{t("map.radius")}:</span>
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRadiusKm(r)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                radiusKm === r ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {r === 0 ? t("map.radius.all") : `${r} km`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap text-sm">
        {(["all", "online", "favorites"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setFilterMode(mode)}
            className={`px-3 py-1.5 rounded-full font-medium transition inline-flex items-center gap-1.5 ${
              filterMode === mode
                ? mode === "online" ? "bg-emerald-500 text-white" : mode === "favorites" ? "bg-rose-500 text-white" : "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {mode === "favorites" && <Heart size={12} />}
            {t(`map.filter.${mode}`)}
            ({mode === "all" ? professionals.length : mode === "online" ? professionals.filter((p) => p.isOnline).length : professionals.filter((p) => p.isFavorite).length})
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-h-[360px] lg:min-h-[520px] relative">
          {(loading || geoLoading) && (
            <div className="absolute inset-0 bg-white/80 z-[500] flex items-center justify-center">
              <Loader2 size={32} className="animate-spin text-slate-400" />
            </div>
          )}
          {mounted && (
            <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={12}
              className="w-full h-[360px] lg:h-[520px]" scrollWheelZoom>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {center && (
                <>
                  {radiusKm > 0 && (
                    <Circle
                      center={[center.lat, center.lng]}
                      radius={radiusKm * 1000}
                      pathOptions={{ color: "#10b981", fillColor: "#10b981", fillOpacity: 0.06, weight: 2, dashArray: "6 4" }}
                    />
                  )}
                  <Marker
                    position={[center.lat, center.lng]}
                    icon={L.divIcon({
                      className: "",
                      html: `<div style="width:14px;height:14px;border-radius:50%;background:#3b82f6;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3);"></div>`,
                      iconSize: [14, 14],
                      iconAnchor: [7, 7],
                    })}
                  />
                  <MapRecenter center={center} radiusKm={radiusKm} />
                </>
              )}
              {mapPins.map((pro) => (
                <Marker
                  key={pro.id}
                  position={[pro.lat!, pro.lng!]}
                  icon={pro.isOnline ? onlineIcon : offlineIcon}
                  eventHandlers={{ click: () => setSelected(pro) }}
                >
                  <Popup>
                    <div className="text-sm min-w-[180px] space-y-1">
                      <p className="font-bold">{pro.name}</p>
                      <p className="text-slate-500 text-xs">{pro.specialty}</p>
                      <StarRating avg={pro.ratingAvg} count={pro.ratingCount} />
                      {pro.isOnline && (
                        <p className="text-xs text-emerald-600 font-medium">
                          {pro.jitIsFree ? t("map.free") : fmtPrice(pro.displayPriceCents, pro.currency, locale)}
                          {pro.estimatedWaitMinutes != null && pro.estimatedWaitMinutes > 0 && (
                            <> · ~{pro.estimatedWaitMinutes} {t("map.mins")}</>
                          )}
                        </p>
                      )}
                      <button onClick={() => setSelected(pro)} className="mt-1 text-emerald-600 font-semibold text-xs">
                        {t("map.viewProfile")} →
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col max-h-[520px]">
          <div className="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-700">
            {t("map.listTitle")} ({filtered.length})
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filtered.length === 0 && !loading ? (
              <p className="text-center text-slate-400 text-sm py-12 px-4">{t("map.empty")}</p>
            ) : (
              <>
                {teleconsultList.length > 0 && (
                  <div>
                    <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-blue-600 bg-blue-50">
                      {t("map.teleconsultSection")} ({teleconsultList.length})
                    </p>
                    {teleconsultList.map((pro) => (
                      <ProListItem key={pro.id} pro={pro} t={t} onSelect={() => setSelected(pro)}
                        onToggleFavorite={toggleFavorite} locale={locale} />
                    ))}
                  </div>
                )}
                {regularList.map((pro) => (
                  <ProListItem key={pro.id} pro={pro} t={t} onSelect={() => setSelected(pro)}
                    onToggleFavorite={toggleFavorite} locale={locale} />
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-slate-900 text-lg">{selected.name}</h2>
                  <button type="button" onClick={() => toggleFavorite(selected.id)} className="text-rose-400 hover:text-rose-500">
                    <Heart size={20} fill={selected.isFavorite ? "currentColor" : "none"} />
                  </button>
                </div>
                <p className="text-sm text-slate-500">{professionLabel(t, selected.professionType)} · {selected.specialty}</p>
                <div className="mt-1"><StarRating avg={selected.ratingAvg} count={selected.ratingCount} size={14} /></div>
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

              {selected.isOnline && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <DollarSign size={16} className="text-emerald-600 mx-auto mb-1" />
                    <p className="text-sm font-bold text-slate-800">
                      {selected.jitIsFree ? t("map.free") : fmtPrice(selected.displayPriceCents, selected.currency, locale)}
                    </p>
                    <p className="text-[10px] text-slate-400">{t("map.priceLabel")}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <Clock size={16} className="text-blue-600 mx-auto mb-1" />
                    <p className="text-sm font-bold text-slate-800">
                      {selected.estimatedWaitMinutes != null && selected.estimatedWaitMinutes > 0
                        ? `~${selected.estimatedWaitMinutes} ${t("map.mins")}`
                        : t("map.noWait")}
                    </p>
                    <p className="text-[10px] text-slate-400">{t("map.waitLabel")}</p>
                  </div>
                </div>
              )}

              {selected.distanceKm != null && (
                <p className="text-sm text-slate-500">{t("map.distance")}: <strong>{selected.distanceKm} km</strong></p>
              )}

              {selected.isFavorite && (
                <p className="text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{t("map.favoriteNotify")}</p>
              )}

              {selected.canReview && (
                <div className="border border-slate-100 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-semibold text-slate-700">{t("map.review.title")}</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" onClick={() => setReviewRating(n)}>
                        <Star size={22} className={n <= reviewRating ? "text-amber-400 fill-amber-400" : "text-slate-300"} />
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={submitReview}
                    disabled={reviewSaving}
                    className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                  >
                    {reviewSaving ? t("map.review.saving") : t("map.review.submit")}
                  </button>
                  {reviewMsg && <p className="text-xs text-slate-500">{reviewMsg}</p>}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 pt-2">
                <Link
                  href={selected.isOnline && selected.jitSessionId ? `/urgent?sessionId=${selected.jitSessionId}` : "/urgent"}
                  className={`flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition ${
                    selected.isOnline ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-slate-100 text-slate-400 pointer-events-none"
                  }`}
                  onClick={(e) => { if (!selected.isOnline) e.preventDefault(); }}
                >
                  <Radio size={18} /> {t("map.action.now")}
                </Link>
                <Link
                  href={`/patient/appointments?pro=${selected.id}`}
                  className="flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-emerald-500 text-emerald-700 hover:bg-emerald-50 font-semibold text-sm transition"
                  onClick={() => setSelected(null)}
                >
                  <Calendar size={18} /> {t("map.action.schedule")}
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
