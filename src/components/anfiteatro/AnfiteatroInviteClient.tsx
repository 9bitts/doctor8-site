"use client";

import Link from "next/link";
import { Video, Heart, UserPlus, LogIn } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { MeetingRoomConfig } from "@/lib/meeting-rooms";
import { BrandLogo } from "@/components/brand/BrandLogo";

const MEETING_ROOMS_CALLBACK = "/professional/meeting-rooms";

export default function AnfiteatroInviteClient({ room }: { room: MeetingRoomConfig }) {
  const { t } = useI18n();
  const roomTitle = t(room.titleKey);
  const subject = t(room.subjectKey);
  const audience = t(room.audienceKey);
  const callback = encodeURIComponent(MEETING_ROOMS_CALLBACK);
  const registerHref = `/register/professional/signup?region=VE&callbackUrl=${callback}`;
  const loginHref = `/login?callbackUrl=${callback}`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b border-slate-200 bg-white px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <BrandLogo size="sm" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-emerald-700">{t("meetRooms.eyebrow")}</p>
            <p className="text-sm font-bold text-slate-900 truncate">{t("meetRooms.title")}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center shrink-0">
              <Video size={24} className="text-violet-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{roomTitle}</h1>
              <div className="text-slate-600 text-sm mt-2 space-y-1">
                <p>
                  <span className="font-semibold text-slate-800">{t("meetRooms.subject")}:</span>{" "}
                  {subject}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">{t("meetRooms.audience")}:</span>{" "}
                  {audience}
                </p>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            {t("meetRooms.invite.desc")}
          </p>

          <div className="space-y-3">
            <Link
              href={registerHref}
              className="flex items-center justify-center gap-2 w-full bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl px-6 py-3 text-sm transition"
            >
              <UserPlus size={18} />
              {t("meetRooms.invite.register")}
            </Link>
            <Link
              href={loginHref}
              className="flex items-center justify-center gap-2 w-full border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold rounded-xl px-6 py-3 text-sm transition"
            >
              <LogIn size={18} />
              {t("meetRooms.invite.login")}
            </Link>
          </div>

          <p className="text-xs text-slate-500 text-center flex items-center justify-center gap-1.5">
            <Heart size={12} className="text-rose-500 shrink-0" />
            {t("meetRooms.invite.footer")}
          </p>
        </div>
      </main>
    </div>
  );
}
