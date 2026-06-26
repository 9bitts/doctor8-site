"use client";
// src/app/(dashboard)/professional/settings/availability/page.tsx
// Professional sets their weekly schedule here. i18n via useI18n().

import { useState, useEffect, useMemo } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf, formatSlotCount } from "@/lib/i18n/translations";
import { countSlotsInRange, generateSlotsInRange } from "@/lib/scheduling";
import { Save, Loader2, CheckCircle2, Plus, Trash2 } from "lucide-react";

interface TimeBlock {
  id: string;
  startTime: string;
  endTime: string;
  slotDuration: number;
  slotGap: number;
}

interface DaySchedule {
  dayOfWeek: number;
  enabled: boolean;
  blocks: TimeBlock[];
}

const GAP_OPTIONS = [0, 5, 10, 15, 20, 30];
const DURATION_OPTIONS = [15, 30, 45, 60];

const DURATION_LABEL_KEYS: Record<number, string> = {
  15: "avail.min15",
  30: "avail.min30",
  45: "avail.min45",
  60: "avail.hour1",
};

const GAP_LABEL_KEYS: Record<number, string> = {
  0: "avail.noGap",
  5: "avail.min5",
  10: "avail.min10",
  15: "avail.min15",
  20: "avail.min20",
  30: "avail.min30",
};

function newBlock(): TimeBlock {
  return {
    id: crypto.randomUUID(),
    startTime: "09:00",
    endTime: "12:00",
    slotDuration: 30,
    slotGap: 0,
  };
}

const defaultSchedules = (): DaySchedule[] =>
  Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    enabled: i >= 1 && i <= 5,
    blocks: [newBlock()],
  }));

function formatTimeLabel(time: string, locale: string): string {
  const [h, m] = time.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AvailabilityPage() {
  const { t, lang } = useI18n();
  const locale = localeOf(lang);

  const TIMES = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => {
        const h = Math.floor(i / 2);
        const m = i % 2 === 0 ? "00" : "30";
        const value = `${String(h).padStart(2, "0")}:${m}`;
        const label = formatTimeLabel(value, locale);
        return { value, label };
      }),
    [locale]
  );

  const [schedules, setSchedules] = useState<DaySchedule[]>(defaultSchedules());
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
          setSchedules(defaultSchedules().map((def) => {
            const daySlots = d.slots.filter(
              (s: { dayOfWeek: number }) => s.dayOfWeek === def.dayOfWeek
            );
            if (daySlots.length === 0) return def;

            return {
              ...def,
              enabled: true,
              blocks: daySlots.map((s: {
                startTime: string;
                endTime: string;
                slotDuration?: number;
                slotDurationMins?: number;
                slotGap?: number;
                slotGapMins?: number;
              }) => ({
                id: crypto.randomUUID(),
                startTime: s.startTime,
                endTime: s.endTime,
                slotDuration: s.slotDuration ?? s.slotDurationMins ?? 30,
                slotGap: s.slotGap ?? s.slotGapMins ?? 0,
              })),
            };
          }));
        }
      }
    } finally { setLoading(false); }
  }

  function updateSchedule(dayOfWeek: number, updater: (s: DaySchedule) => DaySchedule) {
    setSchedules((prev) => prev.map((s) => s.dayOfWeek === dayOfWeek ? updater(s) : s));
  }

  function updateBlock(dayOfWeek: number, blockId: string, field: keyof TimeBlock, value: unknown) {
    updateSchedule(dayOfWeek, (s) => ({
      ...s,
      blocks: s.blocks.map((b) => b.id === blockId ? { ...b, [field]: value } : b),
    }));
  }

  function addBlock(dayOfWeek: number) {
    updateSchedule(dayOfWeek, (s) => ({
      ...s,
      blocks: [...s.blocks, { ...newBlock(), startTime: "14:00", endTime: "17:00" }],
    }));
  }

  function removeBlock(dayOfWeek: number, blockId: string) {
    updateSchedule(dayOfWeek, (s) => {
      const blocks = s.blocks.filter((b) => b.id !== blockId);
      return { ...s, blocks: blocks.length > 0 ? blocks : [newBlock()] };
    });
  }

  function getDaySlots(schedule: DaySchedule) {
    return schedule.blocks
      .flatMap((b) =>
        generateSlotsInRange(b.startTime, b.endTime, b.slotDuration, b.slotGap)
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const slots = schedules
        .filter((s) => s.enabled)
        .flatMap((s) =>
          s.blocks.map((b) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: b.startTime,
            endTime: b.endTime,
            slotDuration: b.slotDuration,
            slotGap: b.slotGap,
          }))
        );

      await fetch("/api/professional/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  }

  const totalWeeklySlots = schedules
    .filter((s) => s.enabled)
    .reduce((acc, s) => acc + getDaySlots(s).length, 0);

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-slate-400" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("avail.title")}</h1>
          <p className="text-slate-500 text-sm mt-1">{t("avail.subtitle")}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-brand-500">{totalWeeklySlots}</p>
          <p className="text-xs text-slate-400">{t("avail.slotsPerWeek")}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
        {schedules.map((schedule) => {
          const daySlots = schedule.enabled ? getDaySlots(schedule) : [];

          return (
            <div key={schedule.dayOfWeek} className={`p-5 transition-colors ${schedule.enabled ? "" : "opacity-50 bg-slate-50"}`}>
              <div className="flex items-center gap-4 flex-wrap">
                <button type="button" onClick={() => updateSchedule(schedule.dayOfWeek, (s) => ({ ...s, enabled: !s.enabled }))}
                  className={`w-11 h-6 rounded-full transition-colors shrink-0 ${schedule.enabled ? "bg-brand-500" : "bg-slate-200"}`}>
                  <div className={`w-4 h-4 bg-white rounded-full mx-1 shadow transition-transform ${schedule.enabled ? "translate-x-5" : ""}`} />
                </button>

                <p className="font-semibold text-slate-800 w-24 shrink-0">{t(`day.${schedule.dayOfWeek}`)}</p>

                {!schedule.enabled && (
                  <p className="text-slate-400 text-sm">{t("avail.unavailable")}</p>
                )}

                {schedule.enabled && daySlots.length > 0 && (
                  <p className="text-xs text-brand-500 font-medium ml-auto">
                    {formatSlotCount(lang, daySlots.length)}
                  </p>
                )}
              </div>

              {schedule.enabled && (
                <div className="mt-4 space-y-3 pl-15">
                  {schedule.blocks.map((block, blockIdx) => {
                    const count = countSlotsInRange(
                      block.startTime,
                      block.endTime,
                      block.slotDuration,
                      block.slotGap
                    );
                    return (
                      <div key={block.id} className="flex items-center gap-2 flex-wrap bg-slate-50 rounded-xl p-3 border border-slate-100">
                        {schedule.blocks.length > 1 && (
                          <span className="text-xs font-semibold text-slate-400 w-6 shrink-0">
                            {blockIdx + 1}.
                          </span>
                        )}

                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-400">{t("avail.from")}</label>
                          <select value={block.startTime} onChange={(e) => updateBlock(schedule.dayOfWeek, block.id, "startTime", e.target.value)}
                            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white">
                            {TIMES.map((tm) => <option key={tm.value} value={tm.value}>{tm.label}</option>)}
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-400">{t("avail.to")}</label>
                          <select value={block.endTime} onChange={(e) => updateBlock(schedule.dayOfWeek, block.id, "endTime", e.target.value)}
                            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white">
                            {TIMES.map((tm) => <option key={tm.value} value={tm.value}>{tm.label}</option>)}
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-400">{t("avail.consultDuration")}</label>
                          <select value={block.slotDuration} onChange={(e) => updateBlock(schedule.dayOfWeek, block.id, "slotDuration", Number(e.target.value))}
                            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white">
                            {DURATION_OPTIONS.map((mins) => (
                              <option key={mins} value={mins}>
                                {t(DURATION_LABEL_KEYS[mins])}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-400">{t("avail.gapBetween")}</label>
                          <select value={block.slotGap} onChange={(e) => updateBlock(schedule.dayOfWeek, block.id, "slotGap", Number(e.target.value))}
                            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white">
                            {GAP_OPTIONS.map((mins) => (
                              <option key={mins} value={mins}>
                                {t(GAP_LABEL_KEYS[mins])}
                              </option>
                            ))}
                          </select>
                        </div>

                        <p className="text-xs text-slate-500 font-medium ml-auto shrink-0">
                          {count > 0 ? formatSlotCount(lang, count) : t("avail.invalidRange")}
                        </p>

                        {schedule.blocks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeBlock(schedule.dayOfWeek, block.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 transition shrink-0"
                            title={t("avail.removeBlock")}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => addBlock(schedule.dayOfWeek)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-brand-500 hover:text-brand-600 transition"
                  >
                    <Plus size={14} /> {t("avail.addBlock")}
                  </button>

                  {daySlots.length > 0 ? (
                    <div className="mt-2 p-3 bg-brand-50/60 rounded-xl border border-brand-100">
                      <p className="text-xs font-semibold text-brand-600 mb-2">
                        {t("avail.preview")} · {formatSlotCount(lang, daySlots.length)}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {daySlots.map((slot, i) => (
                          <span
                            key={`${slot.startTime}-${i}`}
                            className="text-xs bg-white border border-brand-200 text-brand-700 px-2 py-1 rounded-lg tabular-nums"
                          >
                            {formatTimeLabel(slot.startTime, locale)} – {formatTimeLabel(slot.endTime, locale)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">{t("avail.previewEmpty")}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 text-white font-semibold py-3.5 rounded-xl transition disabled:opacity-50">
        {saving ? <Loader2 size={18} className="animate-spin" /> : saved ? <CheckCircle2 size={18} /> : <Save size={18} />}
        {saving ? t("avail.saving") : saved ? t("avail.saved") : t("avail.save")}
      </button>

      <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-sm text-brand-600">
        <strong>{t("avail.noteBold")}</strong> {t("avail.noteText")}
      </div>
    </div>
  );
}
