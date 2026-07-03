"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf, formatSlotCount } from "@/lib/i18n/translations";
import { countSlotsInRange, generateSlotsInRange } from "@/lib/scheduling";
import { validateAvailabilityBlocks } from "@/lib/availability-validation";
import { DEFAULT_TIME_ZONE, listTimeZoneOptions } from "@/lib/timezone";
import { Save, Loader2, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface TimeBlock {
  id: string;
  startTime: string;
  endTime: string;
  slotDuration: number;
  slotGap: number;
  volunteerOnly: boolean;
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

function newBlock(volunteerOnly = false): TimeBlock {
  return {
    id: crypto.randomUUID(),
    startTime: "09:00",
    endTime: "12:00",
    slotDuration: 30,
    slotGap: 0,
    volunteerOnly,
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

export type AvailabilitySettingsProps = {
  apiPath?: string;
  embedded?: boolean;
  autoSave?: boolean;
  hideSaveButton?: boolean;
  onSaved?: () => void;
};

export default function AvailabilitySettings({
  apiPath = "/api/professional/availability",
  embedded = false,
  autoSave = false,
  hideSaveButton = false,
  onSaved,
}: AvailabilitySettingsProps) {
  const { t, lang } = useI18n();
  const toast = useToast();
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
    [locale],
  );

  const [schedules, setSchedules] = useState<DaySchedule[]>(defaultSchedules());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [badgeVisible, setBadgeVisible] = useState(false);
  const [timezone, setTimezone] = useState(DEFAULT_TIME_ZONE);
  const timeZoneOptions = useMemo(() => listTimeZoneOptions(), []);
  const readyRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAvailability = useCallback(async () => {
    try {
      const res = await fetch(apiPath);
      if (res.ok) {
        const d = await res.json();
        setBadgeVisible(!!d.badgeVisible);
        if (d.timezone) setTimezone(d.timezone);
        if (d.slots?.length) {
          setSchedules(
            defaultSchedules().map((def) => {
              const daySlots = d.slots.filter(
                (s: { dayOfWeek: number }) => s.dayOfWeek === def.dayOfWeek,
              );
              if (daySlots.length === 0) return def;
              return {
                ...def,
                enabled: true,
                blocks: daySlots.map(
                  (s: {
                    startTime: string;
                    endTime: string;
                    slotDuration?: number;
                    slotDurationMins?: number;
                    slotGap?: number;
                    slotGapMins?: number;
                    volunteerOnly?: boolean;
                  }) => ({
                    id: crypto.randomUUID(),
                    startTime: s.startTime,
                    endTime: s.endTime,
                    slotDuration: s.slotDuration ?? s.slotDurationMins ?? 30,
                    slotGap: s.slotGap ?? s.slotGapMins ?? 0,
                    volunteerOnly: !!s.volunteerOnly,
                  }),
                ),
              };
            }),
          );
        }
      }
    } finally {
      setLoading(false);
      readyRef.current = true;
    }
  }, [apiPath]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  function updateSchedule(dayOfWeek: number, updater: (s: DaySchedule) => DaySchedule) {
    setSchedules((prev) => prev.map((s) => (s.dayOfWeek === dayOfWeek ? updater(s) : s)));
  }

  function updateBlock(dayOfWeek: number, blockId: string, field: keyof TimeBlock, value: unknown) {
    updateSchedule(dayOfWeek, (s) => ({
      ...s,
      blocks: s.blocks.map((b) => (b.id === blockId ? { ...b, [field]: value } : b)),
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
        generateSlotsInRange(b.startTime, b.endTime, b.slotDuration, b.slotGap).map((slot) => ({
          ...slot,
          volunteerOnly: b.volunteerOnly,
        })),
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  const persist = useCallback(async () => {
    setSaving(true);
    setSaveError("");
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
            volunteerOnly: b.volunteerOnly,
          })),
        );

      const overlapKey = validateAvailabilityBlocks(slots);
      if (overlapKey) {
        setSaveError(t(overlapKey));
        return;
      }

      const res = await fetch(apiPath, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots, timezone }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const key = typeof data.error === "string" ? data.error : "avail.overlapError";
        setSaveError(t(key));
        toast.error(t(key));
        return;
      }
      setSaved(true);
      toast.success(t("avail.saved"));
      setTimeout(() => setSaved(false), 3000);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }, [schedules, timezone, apiPath, t, onSaved, toast]);

  useEffect(() => {
    if (!autoSave || !readyRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void persist();
    }, 1500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [schedules, timezone, autoSave, persist]);

  const totalWeeklySlots = schedules
    .filter((s) => s.enabled)
    .reduce((acc, s) => acc + getDaySlots(s).length, 0);

  if (loading) {
    return (
      <div className={`flex justify-center ${embedded ? "py-8" : "py-16"}`}>
        <Loader2 size={28} className="animate-spin text-slate-400" />
      </div>
    );
  }

  const showSaveButton = !hideSaveButton && !autoSave;

  return (
    <div className={embedded ? "space-y-4" : "max-w-3xl mx-auto space-y-6"}>
      {!embedded && (
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
      )}

      {embedded && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="text-slate-500">{t("avail.subtitle")}</p>
          <div className="text-right shrink-0">
            <span className="font-bold text-brand-500">{totalWeeklySlots}</span>
            <span className="text-xs text-slate-400 ml-1">{t("avail.slotsPerWeek")}</span>
          </div>
        </div>
      )}

      {autoSave && (saving || saved) && (
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          {saving ? (
            <>
              <Loader2 size={12} className="animate-spin" /> {t("set.autoSaving")}
            </>
          ) : (
            <>
              <CheckCircle2 size={12} className="text-emerald-500" /> {t("set.autoSaved")}
            </>
          )}
        </p>
      )}

      <div className={`${embedded ? "" : "bg-white rounded-2xl border border-slate-200 shadow-sm "}p-0 space-y-3`}>
        {!embedded && (
          <div className="p-5 space-y-3">
            <label className="block text-sm font-semibold text-slate-800">{t("avail.timezoneLabel")}</label>
            <p className="text-xs text-slate-500">{t("avail.timezoneHelp")}</p>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white"
            >
              {timeZoneOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        )}
        {embedded && (
          <div className="space-y-1.5 mb-3">
            <label className="block text-sm font-medium text-slate-700">{t("avail.timezoneLabel")}</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white"
            >
              {timeZoneOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className={`${embedded ? "border border-slate-200 rounded-xl" : "bg-white rounded-2xl border border-slate-200 shadow-sm"} overflow-hidden divide-y divide-slate-100`}>
        {schedules.map((schedule) => {
          const daySlots = schedule.enabled ? getDaySlots(schedule) : [];

          return (
            <div
              key={schedule.dayOfWeek}
              className={`p-4 sm:p-5 transition-colors ${schedule.enabled ? "" : "opacity-50 bg-slate-50"}`}
            >
              <div className="flex items-center gap-4 flex-wrap">
                <button
                  type="button"
                  onClick={() =>
                    updateSchedule(schedule.dayOfWeek, (s) => ({ ...s, enabled: !s.enabled }))
                  }
                  className={`w-11 h-6 rounded-full transition-colors shrink-0 ${schedule.enabled ? "bg-brand-500" : "bg-slate-200"}`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full mx-1 shadow transition-transform ${schedule.enabled ? "translate-x-5" : ""}`}
                  />
                </button>
                <p className="font-semibold text-slate-800 w-24 shrink-0">{t(`day.${schedule.dayOfWeek}`)}</p>
                {!schedule.enabled && <p className="text-slate-400 text-sm">{t("avail.unavailable")}</p>}
                {schedule.enabled && daySlots.length > 0 && (
                  <p className="text-xs text-brand-500 font-medium ml-auto">
                    {formatSlotCount(lang, daySlots.length)}
                  </p>
                )}
              </div>

              {schedule.enabled && (
                <div className="mt-4 space-y-3">
                  {schedule.blocks.map((block, blockIdx) => {
                    const count = countSlotsInRange(
                      block.startTime,
                      block.endTime,
                      block.slotDuration,
                      block.slotGap,
                    );
                    return (
                      <div
                        key={block.id}
                        className="flex items-center gap-2 flex-wrap bg-slate-50 rounded-xl p-3 border border-slate-100"
                      >
                        {schedule.blocks.length > 1 && (
                          <span className="text-xs font-semibold text-slate-400 w-6 shrink-0">
                            {blockIdx + 1}.
                          </span>
                        )}
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-400">{t("avail.from")}</label>
                          <select
                            value={block.startTime}
                            onChange={(e) =>
                              updateBlock(schedule.dayOfWeek, block.id, "startTime", e.target.value)
                            }
                            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white"
                          >
                            {TIMES.map((tm) => (
                              <option key={tm.value} value={tm.value}>
                                {tm.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-400">{t("avail.to")}</label>
                          <select
                            value={block.endTime}
                            onChange={(e) =>
                              updateBlock(schedule.dayOfWeek, block.id, "endTime", e.target.value)
                            }
                            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white"
                          >
                            {TIMES.map((tm) => (
                              <option key={tm.value} value={tm.value}>
                                {tm.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-400">{t("avail.consultDuration")}</label>
                          <select
                            value={block.slotDuration}
                            onChange={(e) =>
                              updateBlock(
                                schedule.dayOfWeek,
                                block.id,
                                "slotDuration",
                                Number(e.target.value),
                              )
                            }
                            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white"
                          >
                            {DURATION_OPTIONS.map((mins) => (
                              <option key={mins} value={mins}>
                                {t(DURATION_LABEL_KEYS[mins])}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-400">{t("avail.gapBetween")}</label>
                          <select
                            value={block.slotGap}
                            onChange={(e) =>
                              updateBlock(schedule.dayOfWeek, block.id, "slotGap", Number(e.target.value))
                            }
                            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white"
                          >
                            {GAP_OPTIONS.map((mins) => (
                              <option key={mins} value={mins}>
                                {t(GAP_LABEL_KEYS[mins])}
                              </option>
                            ))}
                          </select>
                        </div>
                        {badgeVisible ? (
                          <label className="flex items-center gap-2 text-xs text-green-800 bg-green-50 border border-green-200 rounded-lg px-2 py-1.5 w-full sm:w-auto">
                            <input
                              type="checkbox"
                              checked={block.volunteerOnly}
                              onChange={(e) =>
                                updateBlock(
                                  schedule.dayOfWeek,
                                  block.id,
                                  "volunteerOnly",
                                  e.target.checked,
                                )
                              }
                            />
                            <span>{t("avail.volunteerBlock")}</span>
                          </label>
                        ) : (
                          <p className="text-xs text-slate-400 w-full">{t("avail.volunteerBlockDisabled")}</p>
                        )}
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
                        {t("avail.preview")} ? {formatSlotCount(lang, daySlots.length)}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {daySlots.map((slot, i) => (
                          <span
                            key={`${slot.startTime}-${i}`}
                            className={`text-xs px-2 py-1 rounded-lg tabular-nums border ${
                              slot.volunteerOnly
                                ? "bg-green-50 border-green-300 text-green-800"
                                : "bg-white border-brand-200 text-brand-700"
                            }`}
                          >
                            {formatTimeLabel(slot.startTime, locale)} ?{" "}
                            {formatTimeLabel(slot.endTime, locale)}
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

      {saveError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {saveError}
        </p>
      )}

      {showSaveButton && (
        <button
          onClick={() => void persist()}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 text-white font-semibold py-3.5 rounded-xl transition disabled:opacity-50"
        >
          {saving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : saved ? (
            <CheckCircle2 size={18} />
          ) : (
            <Save size={18} />
          )}
          {saving ? t("avail.saving") : saved ? t("avail.saved") : t("avail.save")}
        </button>
      )}

      <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-sm text-brand-600 space-y-2">
        <p>
          <strong>{t("avail.noteBold")}</strong> {t("avail.noteText")}
        </p>
        {badgeVisible && <p className="text-green-700">{t("avail.volunteerBlockHint")}</p>}
      </div>
    </div>
  );
}
