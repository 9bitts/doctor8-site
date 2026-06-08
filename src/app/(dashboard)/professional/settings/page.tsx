"use client";
// src/app/(dashboard)/professional/settings/availability/page.tsx
// Professional sets their weekly schedule here — required for appointments to work

import { useState, useEffect } from "react";
import { Save, Loader2, CheckCircle2 } from "lucide-react";

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const TIMES = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { value: `${String(h).padStart(2,"0")}:${m}`, label: `${h12}:${m} ${ampm}` };
});

interface DaySlot {
  dayOfWeek: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
  slotDuration: number;
}

const defaultSlots = (): DaySlot[] =>
  DAYS.map((_, i) => ({
    dayOfWeek: i,
    enabled: i >= 1 && i <= 5, // Mon–Fri by default
    startTime: "09:00",
    endTime: "17:00",
    slotDuration: 30,
  }));

export default function AvailabilityPage() {
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
          <h1 className="text-2xl font-bold text-slate-900">Availability</h1>
          <p className="text-slate-500 text-sm mt-1">Set your weekly schedule. Patients can only book during these hours.</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-emerald-600">{totalWeeklySlots}</p>
          <p className="text-xs text-slate-400">slots/week</p>
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
              <p className="font-semibold text-slate-800 w-24 shrink-0">{DAYS[slot.dayOfWeek]}</p>

              {slot.enabled ? (
                <>
                  {/* Start time */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400">From</label>
                    <select value={slot.startTime} onChange={(e) => updateSlot(slot.dayOfWeek, "startTime", e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white">
                      {TIMES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>

                  {/* End time */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400">To</label>
                    <select value={slot.endTime} onChange={(e) => updateSlot(slot.dayOfWeek, "endTime", e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white">
                      {TIMES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>

                  {/* Duration */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400">Slot</label>
                    <select value={slot.slotDuration} onChange={(e) => updateSlot(slot.dayOfWeek, "slotDuration", Number(e.target.value))}
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white">
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>1 hour</option>
                    </select>
                  </div>

                  {/* Slots count */}
                  <p className="text-xs text-emerald-600 font-medium ml-auto shrink-0">
                    {(() => {
                      const [sh, sm] = slot.startTime.split(":").map(Number);
                      const [eh, em] = slot.endTime.split(":").map(Number);
                      const mins = (eh * 60 + em) - (sh * 60 + sm);
                      const count = Math.floor(mins / slot.slotDuration);
                      return count > 0 ? `${count} slots` : "Invalid range";
                    })()}
                  </p>
                </>
              ) : (
                <p className="text-slate-400 text-sm">Unavailable</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3.5 rounded-xl transition disabled:opacity-50">
        {saving ? <Loader2 size={18} className="animate-spin" /> : saved ? <CheckCircle2 size={18} /> : <Save size={18} />}
        {saving ? "Saving..." : saved ? "Saved!" : "Save availability"}
      </button>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <strong>Note:</strong> Changes take effect immediately. Patients who already have confirmed bookings will not be affected.
      </div>
    </div>
  );
}
