"use client";

// Leaflet map — imperative API avoids react-leaflet lifecycle issues in Next.js.

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapProfessional } from "./PatientMapClient";
import type { Lang } from "@/lib/i18n/translations";
import { getProfessionLabel } from "@/lib/professions";

interface Center { lat: number; lng: number }

function isValidCoord(lat: number | null, lng: number | null): boolean {
  return lat != null && lng != null
    && Number.isFinite(lat) && Number.isFinite(lng)
    && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function makeIcons() {
  return {
    online: L.divIcon({
      className: "",
      html: `<div style="width:28px;height:28px;border-radius:50%;background:#10b981;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.25);"></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    }),
    offline: L.divIcon({
      className: "",
      html: `<div style="width:24px;height:24px;border-radius:50%;background:#64748b;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.2);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    }),
    user: L.divIcon({
      className: "",
      html: `<div style="width:14px;height:14px;border-radius:50%;background:#3b82f6;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    }),
  };
}

export default function PatientMapView({
  mapCenter,
  center,
  radiusKm,
  pins,
  onSelect,
  lang,
}: {
  mapCenter: Center;
  center: Center | null;
  radiusKm: number;
  pins: MapProfessional[];
  onSelect: (pro: MapProfessional) => void;
  lang: Lang;
  renderPopup?: (pro: MapProfessional) => React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const onSelectRef = useRef(onSelect);
  const overlayRef = useRef<{
    markers: L.Marker[];
    circle: L.Circle | null;
    userMarker: L.Marker | null;
  }>({ markers: [], circle: null, userMarker: null });

  onSelectRef.current = onSelect;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, { scrollWheelZoom: false }).setView(
      [mapCenter.lat, mapCenter.lng],
      12,
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      overlayRef.current = { markers: [], circle: null, userMarker: null };
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const icons = makeIcons();
    const { markers, circle, userMarker } = overlayRef.current;

    markers.forEach((m) => m.remove());
    circle?.remove();
    userMarker?.remove();

    const nextMarkers: L.Marker[] = [];
    let nextCircle: L.Circle | null = null;
    let nextUserMarker: L.Marker | null = null;

    const viewCenter = center && isValidCoord(center.lat, center.lng)
      ? center
      : mapCenter;

    if (center && isValidCoord(center.lat, center.lng)) {
      if (radiusKm > 0) {
        nextCircle = L.circle([center.lat, center.lng], {
          radius: radiusKm * 1000,
          color: "#10b981",
          fillColor: "#10b981",
          fillOpacity: 0.06,
          weight: 2,
          dashArray: "6 4",
        }).addTo(map);

        try {
          const bounds = L.circle([center.lat, center.lng], { radius: radiusKm * 1000 }).getBounds();
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
        } catch {
          map.setView([viewCenter.lat, viewCenter.lng], 12);
        }
      } else {
        map.setView([viewCenter.lat, viewCenter.lng], 12);
      }

      nextUserMarker = L.marker([center.lat, center.lng], { icon: icons.user }).addTo(map);
    } else {
      map.setView([viewCenter.lat, viewCenter.lng], 12);
    }

    pins
      .filter((p) => isValidCoord(p.lat, p.lng))
      .forEach((pro) => {
        const marker = L.marker([pro.lat!, pro.lng!], {
          icon: pro.isOnline ? icons.online : icons.offline,
        }).addTo(map);

        marker.bindPopup(
          `<div style="font-size:13px;min-width:160px">
            <strong>${escapeHtml(pro.name || "")}</strong><br/>
            <span style="color:#64748b;font-size:12px">${escapeHtml(getProfessionLabel(lang, pro.specialty) || "")}</span>
          </div>`,
        );

        marker.on("click", () => onSelectRef.current(pro));
        nextMarkers.push(marker);
      });

    overlayRef.current = {
      markers: nextMarkers,
      circle: nextCircle,
      userMarker: nextUserMarker,
    };
  }, [center, radiusKm, pins, mapCenter, lang]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[360px] lg:h-[520px] z-0"
    />
  );
}
