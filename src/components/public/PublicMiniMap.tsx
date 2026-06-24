"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function PublicMiniMap({
  lat,
  lng,
  label,
}: {
  lat: number;
  lng: number;
  label: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const map = L.map(el, {
      center: [lat, lng],
      zoom: 14,
      scrollWheelZoom: false,
      dragging: true,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);

    const icon = L.divIcon({
      className: "",
      html: `<div style="width:28px;height:28px;border-radius:50%;background:#216a86;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.25);"></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    L.marker([lat, lng], { icon }).addTo(map).bindPopup(label);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, label]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[200px] lg:h-full min-h-[200px] rounded-xl overflow-hidden border border-slate-100"
    />
  );
}
