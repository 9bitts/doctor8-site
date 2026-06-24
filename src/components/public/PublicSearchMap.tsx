"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PublicSearchResult } from "@/lib/public-search";

function isValidCoord(lat: number | null, lng: number | null): boolean {
  return lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
}

export default function PublicSearchMap({
  results,
  onSelect,
}: {
  results: PublicSearchResult[];
  onSelect: (pro: PublicSearchResult) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const pins = results.filter((p) => isValidCoord(p.clinicLatitude, p.clinicLongitude));

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const defaultCenter: L.LatLngExpression = [-22.9068, -43.1729];
    const map = L.map(el, { scrollWheelZoom: false }).setView(defaultCenter, 11);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    const icon = L.divIcon({
      className: "",
      html: `<div style="width:24px;height:24px;border-radius:50%;background:#216a86;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.25);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const bounds: L.LatLngExpression[] = [];
    for (const pro of pins) {
      const lat = pro.clinicLatitude!;
      const lng = pro.clinicLongitude!;
      bounds.push([lat, lng]);
      const marker = L.marker([lat, lng], { icon }).addTo(map);
      marker.bindPopup(`<strong>${pro.name}</strong>`);
      marker.on("click", () => onSelectRef.current(pro));
    }

    if (bounds.length === 1) {
      map.setView(bounds[0], 14);
    } else if (bounds.length > 1) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30] });
    }
  }, [pins]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[280px] lg:h-full min-h-[280px] rounded-xl overflow-hidden border border-slate-100"
    />
  );
}
