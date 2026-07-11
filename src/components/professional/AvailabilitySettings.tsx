"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf, formatSlotCount } from "@/lib/i18n/translations";
import { countSlotsInRange, generateSlotsInRange } from "@/lib/scheduling";
import { validateAvailabilityBlocks, validatePaidVolunteerOverlap } from "@/lib/availability-validation";
import { interpolate } from "@/lib/notification-i18n";
import { DEFAULT_TIME_ZONE, listTimeZoneOptions } from "@/lib/timezone";
import type { DateAvailabilityBlock, VolunteerWeeklyBlock } from "@/lib/availability-exceptions";
import { Save, Loader2, CheckCircle2, Plus, Trash2, AlertTriangle, X } from "lucide-react";
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
  50: "avail.min50",
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

function newBlock(slotDuration = 30, volunteerOnly = false): TimeBlock {
  return {
    id: crypto.randomUUID(),
    startTime: "09:00",
    endTime: "12:00",
    slotDuration,
    slotGap: 0,
    volunteerOnly,
  };
}

function newVolunteerBlock(dayOfWeek = 1): VolunteerWeeklyBlock {
  return {
    id: crypto.randomUUID(),
    dayOfWeek,
    startTime: "09:00",
    endTime: "12:00",
    slotDuration: 30,
    slotGap: 0,
  };
}

const defaultSchedules = (slotDuration = 30): DaySchedule[] =>
  Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    enabled: i >= 1 && i <= 5,
    blocks: [newBlock(slotDuration)],
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
  hideAdvancedSections?: boolean;
  durationOptions?: number[];
  defaultSlotDuration?: number;
  onSaved?: () => void;
};

type VolunteerBlockConflict = {
  appointmentId: string;
  scheduledAt: string;
  dateLabel: string;
  timeLabel: string;
  patientFirstName: string;
};

type PersistOptions = {
  confirmVolunteerBlockRemoval?: boolean;
  cancelAppointmentIds?: string[];
};

export default function AvailabilitySettings({
  apiPath = "/api/professional/availability",
  embedded = false,
  autoSave = false,
  hideSaveButton = false,
  hideAdvancedSections = false,
  durationOptions = DURATION_OPTIONS,
  defaultSlotDuration = 30,
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

  const [schedules, setSchedules] = useState<DaySchedule[]>(() => defaultSchedules(defaultSlotDuration));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [badgeVisible, setBadgeVisible] = useState(false);
  const [timezone, setTimezone] = useState(DEFAULT_TIME_ZONE);
  const [dateBlocks, setDateBlocks] = useState<DateAvailabilityBlock[]>([]);
  const [volunteerBlocks, setVolunteerBlocks] = useState<VolunteerWeeklyBlock[]>([]);
  const [blockConflicts, setBlockConflicts] = useState<VolunteerBlockConflict[]>([]);
  const [showBlockConflictModal, setShowBlockConflictModal] = useState(false);
  const [confirmingBlockRemoval, setConfirmingBlockRemoval] = useState(false);
  const volunteerBlocksSnapshotRef = useRef<VolunteerWeeklyBlock[]>([]);
  const [blockStartDate, setBlockStartDate] = useState("");
  const [blockEndDate, setBlockEndDate] = useState("");
  const [blockStartTime, setBlockStartTime] = useState("");
  const [blockEndTime, setBlockEndTime] = useState("");
  const [blockLabel, setBlockLabel] = useState("");
  const timeZoneOptions = useMemo(() => listTimeZoneOptions(), []);
  const readyRef = useRef(false);
  const skipAutoSaveRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const durationLabelKeys = useMemo(() => {
    const keys = { ...DURATION_LABEL_KEYS };
    for (const mins of durationOptions) {
      if (!keys[mins]) {
        keys[mins] = mins === 60 ? "avail.hour1" : `avail.min${mins}`;
      }
    }
    return keys;
  }, [durationOptions]);

  const fetchAvailability = useCallback(async () => {
    try {
      const res = await fetch(apiPath);
      if (res.ok) {
        const d = await res.json();
        setBadgeVisible(!!d.badgeVisible);
        if (d.timezone) setTimezone(d.timezone);
        if (Array.isArray(d.dateBlocks)) setDateBlocks(d.dateBlocks);
        if (Array.isArray(d.volunteerBlocks)) setVolunteerBlocks(d.volunteerBlocks);
        if (Array.isArray(d.slots)) {
          skipAutoSaveRef.current = true;
          if (d.slots.length === 0) {
            setSchedules(defaultSchedules(defaultSlotDuration));
          } else {
            setSchedules(
              defaultSchedules(defaultSlotDuration).map((def) => {
                const daySlots = d.slots.filter(
                  (s: { dayOfWeek: number }) => s.dayOfWeek === def.dayOfWeek,
                );
                if (daySlots.length === 0) {
                  return {
                    ...def,
                    enabled: false,
                    blocks: [newBlock(defaultSlotDuration)],
                  };
                }
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
                      slotDuration: s.slotDuration ?? s.slotDurationMins ?? defaultSlotDuration,
                      slotGap: s.slotGap ?? s.slotGapMins ?? 0,
                      volunteerOnly: !!s.volunteerOnly,
                    }),
                  ),
                };
              }),
            );
          }
        }
      }
    } finally {
      setLoading(false);
      readyRef.current = true;
    }
  }, [apiPath, defaultSlotDuration]);

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
      blocks: [...s.blocks, { ...newBlock(defaultSlotDuration), startTime: "14:00", endTime: "17:00" }],
    }));
  }

  function removeBlock(dayOfWeek: number, blockId: string) {
    updateSchedule(dayOfWeek, (s) => {
      const blocks = s.blocks.filter((b) => b.id !== blockId);
      return { ...s, blocks: blocks.length > 0 ? blocks : [newBlock(defaultSlotDuration)] };
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

  const persist = useCallback(async (opts?: PersistOptions) => {
    setSaving(true);
    setSaveError("");
    volunteerBlocksSnapshotRef.current = volunteerBlocks;
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

      const paidVolunteerOverlap = validatePaidVolunteerOverlap(slots, volunteerBlocks);
      if (paidVolunteerOverlap) {
        setSaveError(t(paidVolunteerOverlap));
        return;
      }

      const res = await fetch(apiPath, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          hideAdvancedSections
            ? { slots }
            : {
                slots,
                timezone,
                dateBlocks,
                volunteerBlocks,
                confirmVolunteerBlockRemoval: opts?.confirmVolunteerBlockRemoval,
                cancelAppointmentIds: opts?.cancelAppointmentIds,
              },
        ),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (
          !opts?.confirmVolunteerBlockRemoval &&
          Array.isArray(data.conflicts) &&
          data.conflicts.length > 0
        ) {
          setBlockConflicts(data.conflicts as VolunteerBlockConflict[]);
          setShowBlockConflictModal(true);
          return;
        }
        if (Array.isArray(data.conflicts) && data.conflicts.length > 0) {
          const lines = (
            data.conflicts as { dateLabel: string; timeLabel: string; patientFirstName: string }[]
          ).map((c) =>
            interpolate(t("avail.volunteerBlockConflictItem"), {
              date: c.dateLabel,
              time: c.timeLabel,
              name: c.patientFirstName,
            }),
          );
          const msg = [t("avail.volunteerBlockConflictIntro"), ...lines, t("avail.volunteerBlockConflictHint")].join(
            "\n",
          );
          setSaveError(msg);
          toast.error(t("avail.volunteerBlockConflictTitle"));
          return;
        }
        const key = typeof data.error === "string" ? data.error : "avail.overlapError";
        setSaveError(t(key));
        toast.error(t(key));
        return;
      }
      setShowBlockConflictModal(false);
      setBlockConflicts([]);
      setSaved(true);
      if (!autoSave) {
        toast.success(t("avail.saved"));
      }
      setTimeout(() => setSaved(false), 3000);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }, [schedules, timezone, dateBlocks, volunteerBlocks, apiPath, hideAdvancedSections, autoSave, t, onSaved, toast]);

  async function confirmVolunteerBlockRemoval() {
    setConfirmingBlockRemoval(true);
    try {
      await persist({
        confirmVolunteerBlockRemoval: true,
        cancelAppointmentIds: blockConflicts.map((c) => c.appointmentId),
      });
    } finally {
      setConfirmingBlockRemoval(false);
    }
  }

  function dismissVolunteerBlockConflict() {
    setVolunteerBlocks(volunteerBlocksSnapshotRef.current);
    setShowBlockConflictModal(false);
    setBlockConflicts([]);
    setSaveError("");
  }

  useEffect(() => {
    if (!autoSave || !readyRef.current) return;
    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void persist();
    }, 1500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [schedules, timezone, dateBlocks, volunteerBlocks, autoSave, persist]);

  function addDateBlock() {
    if (!blockStartDate) return;
    const end = blockEndDate || blockStartDate;
    if (end < blockStartDate) return;
    if (blockStartTime && blockEndTime && blockEndTime <= blockStartTime) return;
    if ((blockStartTime && !blockEndTime) || (!blockStartTime && blockEndTime)) return;

    setDateBlocks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        startDate: blockStartDate,
        endDate: end !== blockStartDate ? end : undefined,
        startTime: blockStartTime || undefined,
        endTime: blockEndTime || undefined,
        label: blockLabel.trim() || undefined,
      },
    ]);
    setBlockStartDate("");
    setBlockEndDate("");
    setBlockStartTime("");
    setBlockEndTime("");
    setBlockLabel("");
  }

  function removeDateBlock(id: string) {
    setDateBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  function formatBlockRange(block: DateAvailabilityBlock): string {
    const end = block.endDate && block.endDate !== block.startDate ? block.endDate : null;
    const datePart = end ? `${block.startDate} - ${end}` : block.startDate;
    if (block.startTime && block.endTime) {
      return `${datePart} / ${formatTimeLabel(block.startTime, locale)} - ${formatTimeLabel(block.endTime, locale)}`;
    }
    return datePart;
  }

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

      {!hideAdvancedSections && (
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
      )}

      {!hideAdvancedSections && (
      <div className={`${embedded ? "border border-slate-200 rounded-xl p-4" : "bg-white rounded-2xl border border-slate-200 shadow-sm p-5"} space-y-4`}>
        <div>
          <h2 className="text-sm font-semibold text-slate-800">{t("avail.blocksTitle")}</h2>
          <p className="text-xs text-slate-500 mt-1">{t("avail.blocksHelp")}</p>
        </div>

        {dateBlocks.length > 0 && (
          <ul className="space-y-2">
            {dateBlocks.map((block) => (
              <li
                key={block.id}
                className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {block.label || t("avail.blockDefaultLabel")}
                  </p>
                  <p className="text-xs text-slate-500">{formatBlockRange(block)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeDateBlock(block.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 transition shrink-0"
                  title={t("avail.removeBlock")}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">{t("avail.blockStartDate")}</label>
            <input
              type="date"
              value={blockStartDate}
              onChange={(e) => setBlockStartDate(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">{t("avail.blockEndDate")}</label>
            <input
              type="date"
              value={blockEndDate}
              onChange={(e) => setBlockEndDate(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">{t("avail.blockStartTime")}</label>
            <select
              value={blockStartTime}
              onChange={(e) => setBlockStartTime(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white"
            >
              <option value="">{t("avail.blockFullDay")}</option>
              {TIMES.map((tm) => (
                <option key={tm.value} value={tm.value}>
                  {tm.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">{t("avail.blockEndTime")}</label>
            <select
              value={blockEndTime}
              onChange={(e) => setBlockEndTime(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white"
            >
              <option value="">{t("avail.blockFullDay")}</option>
              {TIMES.map((tm) => (
                <option key={tm.value} value={tm.value}>
                  {tm.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-500 mb-1">{t("avail.blockLabel")}</label>
            <input
              type="text"
              value={blockLabel}
              onChange={(e) => setBlockLabel(e.target.value)}
              placeholder={t("avail.blockLabelPlaceholder")}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={addDateBlock}
          disabled={!blockStartDate}
          className="flex items-center gap-1.5 text-xs font-semibold text-brand-500 hover:text-brand-600 transition disabled:opacity-40"
        >
          <Plus size={14} /> {t("avail.addDateBlock")}
        </button>
      </div>
      )}

      {!hideAdvancedSections && (
      <div className={`${embedded ? "border border-green-200 rounded-xl p-4 bg-green-50/40" : "bg-green-50/50 rounded-2xl border border-green-200 shadow-sm p-5"} space-y-4`}>
        <div>
          <h2 className="text-sm font-semibold text-green-900">{t("avail.voluntaryHoursTitle")}</h2>
          <p className="text-xs text-green-800/80 mt-1">{t("avail.voluntaryHoursHelp")}</p>
        </div>

        {volunteerBlocks.length > 0 && (
          <ul className="space-y-3">
            {volunteerBlocks.map((block) => {
              const count = countSlotsInRange(
                block.startTime,
                block.endTime,
                block.slotDuration ?? 30,
                block.slotGap ?? 0,
              );
              return (
                <li
                  key={block.id}
                  className="flex items-center gap-2 flex-wrap bg-white rounded-xl p-3 border border-green-200"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wide text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-full">
                    {t("avail.voluntaryBadge")}
                  </span>
                  <select
                    value={block.dayOfWeek}
                    onChange={(e) =>
                      setVolunteerBlocks((prev) =>
                        prev.map((b) =>
                          b.id === block.id ? { ...b, dayOfWeek: Number(e.target.value) } : b,
                        ),
                      )
                    }
                    className="border border-green-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30"
                  >
                    {Array.from({ length: 7 }, (_, i) => (
                      <option key={i} value={i}>
                        {t(`day.${i}`)}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-green-800/70">{t("avail.from")}</label>
                    <select
                      value={block.startTime}
                      onChange={(e) =>
                        setVolunteerBlocks((prev) =>
                          prev.map((b) =>
                            b.id === block.id ? { ...b, startTime: e.target.value } : b,
                          ),
                        )
                      }
                      className="border border-green-200 rounded-lg px-2 py-1.5 text-sm bg-white"
                    >
                      {TIMES.map((tm) => (
                        <option key={tm.value} value={tm.value}>
                          {tm.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-green-800/70">{t("avail.to")}</label>
                    <select
                      value={block.endTime}
                      onChange={(e) =>
                        setVolunteerBlocks((prev) =>
                          prev.map((b) =>
                            b.id === block.id ? { ...b, endTime: e.target.value } : b,
                          ),
                        )
                      }
                      className="border border-green-200 rounded-lg px-2 py-1.5 text-sm bg-white"
                    >
                      {TIMES.map((tm) => (
                        <option key={tm.value} value={tm.value}>
                          {tm.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-green-800/70">{t("avail.consultDuration")}</label>
                    <select
                      value={block.slotDuration ?? 30}
                      onChange={(e) =>
                        setVolunteerBlocks((prev) =>
                          prev.map((b) =>
                            b.id === block.id
                              ? { ...b, slotDuration: Number(e.target.value) }
                              : b,
                          ),
                        )
                      }
                      className="border border-green-200 rounded-lg px-2 py-1.5 text-sm bg-white"
                    >
                      {DURATION_OPTIONS.map((mins) => (
                        <option key={mins} value={mins}>
                          {t(DURATION_LABEL_KEYS[mins])}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-green-800 font-medium ml-auto shrink-0">
                    {count > 0 ? formatSlotCount(lang, count) : t("avail.invalidRange")}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setVolunteerBlocks((prev) => prev.filter((b) => b.id !== block.id))
                    }
                    className="p-1.5 text-green-700/50 hover:text-red-500 transition shrink-0"
                    title={t("avail.removeBlock")}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <button
          type="button"
          onClick={() => setVolunteerBlocks((prev) => [...prev, newVolunteerBlock()])}
          className="flex items-center gap-1.5 text-xs font-semibold text-green-800 hover:text-green-900 transition"
        >
          <Plus size={14} /> {t("avail.voluntaryHoursAdd")}
        </button>
      </div>
      )}

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
                            {durationOptions.map((mins) => (
                              <option key={mins} value={mins}>
                                {t(durationLabelKeys[mins] ?? `avail.min${mins}`)}
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

      {showBlockConflictModal && blockConflicts.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={22} />
                <div>
                  <h3 className="font-semibold text-slate-900">{t("avail.volunteerBlockConflictModalTitle")}</h3>
                  <p className="text-sm text-slate-600 mt-1">{t("avail.volunteerBlockConflictModalBody")}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={dismissVolunteerBlockConflict}
                className="text-slate-400 hover:text-slate-600"
                aria-label={t("avail.volunteerBlockConflictKeep")}
              >
                <X size={18} />
              </button>
            </div>
            <ul className="text-sm text-slate-700 space-y-1 bg-amber-50 border border-amber-100 rounded-xl p-3">
              {blockConflicts.map((c) => (
                <li key={c.appointmentId}>
                  {interpolate(t("avail.volunteerBlockConflictItem"), {
                    date: c.dateLabel,
                    time: c.timeLabel,
                    name: c.patientFirstName,
                  })}
                </li>
              ))}
            </ul>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                onClick={dismissVolunteerBlockConflict}
                disabled={confirmingBlockRemoval}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t("avail.volunteerBlockConflictKeep")}
              </button>
              <button
                type="button"
                onClick={() => void confirmVolunteerBlockRemoval()}
                disabled={confirmingBlockRemoval}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {confirmingBlockRemoval && <Loader2 size={16} className="animate-spin" />}
                {t("avail.volunteerBlockConflictConfirmCancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
