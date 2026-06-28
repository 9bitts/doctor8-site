"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { getProfessionLabel } from "@/lib/professions";
import type { PublicProfileData } from "@/lib/public-profile";
import PublicBookingPanel from "@/components/public/PublicBookingPanel";
import PublicProfileTracker from "@/components/public/PublicProfileTracker";
import AcuraVolunteerBadge from "@/components/acura/AcuraVolunteerBadge";
import { isAcuraVolunteerProvider } from "@/lib/acura-volunteer";

export default function EmbedBookingClient({ profile }: { profile: PublicProfileData }) {
  const { lang, t } = useI18n();
  const name = `${profile.firstName} ${profile.lastName}`.trim();
  const specialtyLabel = getProfessionLabel(lang, profile.specialty);
  const showAcuraBadge = isAcuraVolunteerProvider(profile.verified, profile.acuraVolunteer);

  return (
    <>
      <PublicProfileTracker slug={profile.slug} source="public_embed" />
      <div className="p-4 max-w-md mx-auto space-y-3">
        <div className="flex items-center gap-3 pb-1">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={name}
              className="w-11 h-11 rounded-xl object-cover shrink-0"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center font-bold shrink-0">
              {profile.firstName[0]}
              {profile.lastName[0]}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-slate-900 truncate">{name}</p>
            <p className="text-sm text-brand-600 truncate">{specialtyLabel}</p>
            {showAcuraBadge && (
              <div className="mt-1">
                <AcuraVolunteerBadge />
              </div>
            )}
          </div>
        </div>

        <PublicBookingPanel
          profile={profile}
          embed
          analyticsSource="public_embed"
          bookingFrom="public_embed"
        />

        <p className="text-center text-[10px] text-slate-400 pt-1">
          {t("pubEmbed.poweredBy")}{" "}
          <Link
            href={profile.publicPath}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand-500 hover:underline"
          >
            Doctor8
          </Link>
        </p>
      </div>
    </>
  );
}
