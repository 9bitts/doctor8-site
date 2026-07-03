"use client";

import { useState } from "react";
import {
  Video, Clock, Globe, Languages, ExternalLink, Heart,
  MessageCircle, Mail, Copy, CheckCircle2,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { DoctorConnectionSeal } from "@/components/brand/DoctorConnectionSeal";
import type { MeetingRoomConfig } from "@/lib/meeting-rooms";

type RoomWithUrl = MeetingRoomConfig & { meetUrl: string | null; inviteUrl: string };

function formatTodaySchedule(room: MeetingRoomConfig): string {
  const h = String(room.scheduleHour).padStart(2, "0");
  const m = String(room.scheduleMinute).padStart(2, "0");
  const tzLabel = room.timezone === "America/Sao_Paulo" ? "Brasil" : room.timezone;
  return `${h}h${m} (${tzLabel})`;
}

function roomStatus(
  room: MeetingRoomConfig,
): "upcoming" | "live" | "ended" {
  const now = new Date();
  const brNow = new Date(
    now.toLocaleString("en-US", { timeZone: room.timezone }),
  );
  const start = new Date(brNow);
  start.setHours(room.scheduleHour, room.scheduleMinute, 0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + 2);

  if (brNow < start) return "upcoming";
  if (brNow >= start && brNow <= end) return "live";
  return "ended";
}

const STATUS_STYLES = {
  upcoming: "bg-sky-100 text-sky-800",
  live: "bg-emerald-100 text-emerald-800",
  ended: "bg-slate-100 text-slate-600",
} as const;

function shareMessage(
  t: (key: string) => string,
  roomTitle: string,
  subject: string,
  meetUrl: string,
  portalUrl: string,
): string {
  return t("meetRooms.shareMessage")
    .replace("{{title}}", roomTitle)
    .replace("{{subject}}", subject)
    .replace("{{meetUrl}}", meetUrl)
    .replace("{{portalUrl}}", portalUrl);
}

export default function MeetingRoomsClient({ rooms }: { rooms: RoomWithUrl[] }) {
  const { t } = useI18n();
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);

  async function copyLink(roomId: string, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedRoomId(roomId);
      setTimeout(() => setCopiedRoomId(null), 3000);
    } catch { /* ignore */ }
  }

  function shareWhatsApp(text: string) {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  function shareEmail(subject: string, body: string) {
    window.open(
      `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-2 text-brand-600 text-sm font-semibold mb-1">
          <Heart size={16} className="text-rose-500" />
          <span>{t("meetRooms.eyebrow")}</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          {t("meetRooms.title")}
        </h1>
        <p className="text-slate-500 mt-1 text-sm sm:text-base">
          {t("meetRooms.subtitle")}
        </p>
        <p className="text-emerald-700 font-medium text-sm sm:text-base mt-2">
          {t("meetRooms.permanentLinksNotice")}
        </p>
      </div>

      <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/80 to-white p-4 sm:p-5 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
          <Languages size={20} className="text-brand-600" />
        </div>
        <div>
          <p className="font-semibold text-slate-900 text-sm">
            {t("meetRooms.translationAuto")}
          </p>
          <p className="text-slate-600 text-xs sm:text-sm mt-1">
            {t("meetRooms.translationHint")}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {rooms.map((room) => {
          const status = roomStatus(room);
          const schedule = formatTodaySchedule(room);
          const roomTitle = t(room.titleKey);
          const subject = t(room.subjectKey);
          const audience = t(room.audienceKey);
          const shareText = shareMessage(t, roomTitle, subject, room.meetUrl!, room.inviteUrl);

          return (
            <article
              key={room.id}
              className="relative rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
            >
              <DoctorConnectionSeal
                compact
                className="absolute top-3 right-3 z-10 w-10 sm:hidden rotate-[7deg] origin-top-right bg-white/85 backdrop-blur-[2px] rounded-md p-0.5 ring-1 ring-slate-200/80"
              />
              <DoctorConnectionSeal
                className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 hidden sm:block w-16 md:w-20 rotate-[7deg] origin-top-right bg-white/85 backdrop-blur-[2px] rounded-md p-0.5 sm:p-1 ring-1 ring-slate-200/80"
              />
              <div className="p-5 sm:p-6 space-y-4">
                <div className="pr-11 sm:pr-16 md:pr-20 space-y-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center shrink-0">
                      <Video size={24} className="text-violet-600" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold text-slate-900 break-words">
                        {roomTitle}
                      </h2>
                      <div className="text-slate-600 text-sm mt-2 leading-relaxed space-y-1">
                        <p>
                          <span className="font-semibold text-slate-800">
                            {t("meetRooms.subject")}:
                          </span>{" "}
                          {subject}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">
                            {t("meetRooms.audience")}:
                          </span>{" "}
                          {audience}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${STATUS_STYLES[status]}`}
                    >
                      {t(`meetRooms.status.${status}`)}
                    </span>
                    {room.meetUrl && (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-violet-100 text-violet-800">
                        {t("meetRooms.permanentLink")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-700 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                    <Clock size={16} className="text-brand-500 shrink-0" />
                    <span>
                      <span className="text-slate-500">{t("meetRooms.todaySchedule")}: </span>
                      <span className="font-semibold">{schedule}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100 min-w-0">
                    <Globe size={16} className="text-brand-500 shrink-0" />
                    <span className="truncate">
                      <span className="text-slate-500">{t("meetRooms.local")}: </span>
                      <span className="font-semibold">Google Meet</span>
                    </span>
                  </div>
                </div>

                {room.meetUrl ? (
                  <div className="space-y-3">
                    <a
                      href={room.meetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl px-6 py-3 text-sm transition shadow-sm"
                    >
                      <Video size={18} />
                      {t("meetRooms.enterRoom")}
                      <ExternalLink size={14} className="opacity-80" />
                    </a>

                    <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => shareWhatsApp(shareText)}
                        disabled={!room.meetUrl}
                        className="inline-flex items-center justify-center gap-2 flex-1 sm:flex-none border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded-xl px-4 py-2.5 text-sm transition"
                      >
                        <MessageCircle size={16} />
                        {t("meetRooms.shareWhatsapp")}
                      </button>
                      <button
                        type="button"
                        onClick={() => shareEmail(subject, shareText)}
                        disabled={!room.meetUrl}
                        className="inline-flex items-center justify-center gap-2 flex-1 sm:flex-none border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold rounded-xl px-4 py-2.5 text-sm transition"
                      >
                        <Mail size={16} />
                        {t("meetRooms.shareEmail")}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyLink(room.id, room.meetUrl!)}
                        disabled={!room.meetUrl}
                        className="inline-flex items-center justify-center gap-2 flex-1 sm:flex-none border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-800 font-semibold rounded-xl px-4 py-2.5 text-sm transition"
                      >
                        {copiedRoomId === room.id ? (
                          <CheckCircle2 size={16} />
                        ) : (
                          <Copy size={16} />
                        )}
                        {copiedRoomId === room.id
                          ? t("meetRooms.linkCopied")
                          : t("meetRooms.copyLink")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {t("meetRooms.noLink")}
                  </div>
                )}
              </div>

              <div className="px-5 sm:px-6 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
                {t("meetRooms.waitingRoom")}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
