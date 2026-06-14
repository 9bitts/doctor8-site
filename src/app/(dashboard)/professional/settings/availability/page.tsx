"use client";
// src/app/(dashboard)/professional/settings/availability/page.tsx
// Professional sets their weekly schedule here. i18n via useI18n().

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import { Save, Loader2, CheckCircle2 } from "lucide-react";

interface DaySlot {
  dayOfWeek: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
  slotDuration: number;
}

const defaultSlots = (): DaySlot[] =>
  Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    enabled: i >= 1 && i <= 5, // Mon–Fri by default
    startTime: "09:00",
    endTime: "17:00",
    slotDuration: 30,
  }));

export default function AvailabilityPage() {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);

  // Build the time options, formatting the label in the user's locale.
  const TIMES = Array.from({ length: 48 }, (_, i) => {
    const h = Math.floor(i / 2);
    const m = i % 2 === 0 ? "00" : "30";
    const value = `${String(h).padStart(2, "0")}:${m}`;
    const label = new Date(2000, 0, 1, h, Number(m)).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    return { value, label };
  });

  const [slots, setSlots] = useState<DaySlot[]>(defaultSlots());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { fetchAvailability(); }, []);

  async function fetchAvailability() {
    try {
      const res = await fetch("/api/professional/availability");
      if (res.ok) {
        const d = await res.json();
        if (d.slots?.length) {
          setSlots(defaultSlots().map((def) => {
            const existing = d.slots.find((s: DaySlot) => s.dayOfWeek === def.dayOfWeek);
            return existing ? { ...def, ...existing, enabled: true } : def;
          }));
        }
      }
    } finally { setLoading(false); }
  }

  function updateSlot(dayOfWeek: number, field: keyof DaySlot, value: unknown) {
    setSlots((prev) => prev.map((s) => s.dayOfWeek === dayOfWeek ? { ...s, [field]: value } : s));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/professional/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: slots.filter((s) => s.enabled) }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  }

  const totalWeeklySlots = slots
    .filter((s) => s.enabled)
    .reduce((acc, s) => {
      const [sh, sm] = s.startTime.split(":").map(Number);
      const [eh, em] = s.endTime.split(":").map(Number);
      const mins = (eh * 60 + em) - (sh * 60 + sm);
      return acc + Math.floor(mins / s.slotDuration);
    }, 0);

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-slate-400" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("avail.title")}</h1>
          <p className="text-slate-500 text-sm mt-1">{t("avail.subtitle")}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-emerald-600">{totalWeeklySlots}</p>
          <p className="text-xs text-slate-400">{t("avail.slotsPerWeek")}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
        {slots.map((slot) => (
          <div key={slot.dayOfWeek} className={`p-5 transition-colors ${slot.enabled ? "" : "opacity-50 bg-slate-50"}`}>
            <div className="flex items-center gap-4 flex-wrap">
              {/* Toggle */}
              <button type="button" onClick={() => updateSlot(slot.dayOfWeek, "enabled", !slot.enabled)}
                className={`w-11 h-6 rounded-full transition-colors shrink-0 ${slot.enabled ? "bg-emerald-500" : "bg-slate-200"}`}>
                <div className={`w-4 h-4 bg-white rounded-full mx-1 shadow transition-transform ${slot.enabled ? "translate-x-5" : ""}`} />
              </button>

              {/* Day name */}
              <p className="font-semibold text-slate-800 w-24 shrink-0">{t(`day.${slot.dayOfWeek}`)}</p>

              {slot.enabled ? (
                <>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400">{t("avail.from")}</label>
                    <select value={slot.startTime} onChange={(e) => updateSlot(slot.dayOfWeek, "startTime", e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white">
                      {TIMES.map((tm) => <option key={tm.value} value={tm.value}>{tm.label}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400">{t("avail.to")}</label>
                    <select value={slot.endTime} onChange={(e) => updateSlot(slot.dayOfWeek, "endTime", e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white">
                      {TIMES.map((tm) => <option key={tm.value} value={tm.value}>{tm.label}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400">{t("avail.slot")}</label>
                    <select value={slot.slotDuration} onChange={(e) => updateSlot(slot.dayOfWeek, "slotDuration", Number(e.target.value))}
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white">
                      <option value={15}>{t("avail.min15")}</option>
                      <option value={30}>{t("avail.min30")}</option>
                      <option value={45}>{t("avail.min45")}</option>
                      <option value={60}>{t("avail.hour1")}</option>
                    </select>
                  </div>

                  <p className="text-xs text-emerald-600 font-medium ml-auto shrink-0">
                    {(() => {
                      const [sh, sm] = slot.startTime.split(":").map(Number);
                      const [eh, em] = slot.endTime.split(":").map(Number);
                      const mins = (eh * 60 + em) - (sh * 60 + sm);
                      const count = Math.floor(mins / slot.slotDuration);
                      return count > 0 ? `${count} ${t("avail.slots")}` : t("avail.invalidRange");
                    })()}
                  </p>
                </>
              ) : (
                <p className="text-slate-400 text-sm">{t("avail.unavailable")}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3.5 rounded-xl transition disabled:opacity-50">
        {saving ? <Loader2 size={18} className="animate-spin" /> : saved ? <CheckCircle2 size={18} /> : <Save size={18} />}
        {saving ? t("avail.saving") : saved ? t("avail.saved") : t("avail.save")}
      </button>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <strong>{t("avail.noteBold")}</strong> {t("avail.noteText")}
      </div>
    </div>
  );
}
