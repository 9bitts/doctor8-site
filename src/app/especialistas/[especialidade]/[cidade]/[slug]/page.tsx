// Public professional profile ? SEO URL: /especialistas/[especialidade]/[cidade]/[slug]

import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Video, Building2, Star, CheckCircle2, Stethoscope, Award, MapPin, ExternalLink,
} from "lucide-react";
import { cookies } from "next/headers";
import { normalizeLang, translate } from "@/lib/i18n/translations";
import { getProfessionLabel } from "@/lib/professions";
import {
  getLivePublicProfileBySlug,
  buildPublicProfilePath,
  buildPublicProfileUrl,
  buildPhysicianJsonLd,
} from "@/lib/public-profile";
import PublicBookingPanel from "@/components/public/PublicBookingPanel";
import PublicProfilePlaces from "@/components/public/PublicProfilePlaces";
import PublicServicesList from "@/components/public/PublicServicesList";
import PublicReviewsSection from "@/components/public/PublicReviewsSection";
import PublicProfileTracker from "@/components/public/PublicProfileTracker";
import AcuraVolunteerBadge from "@/components/acura/AcuraVolunteerBadge";
import { isAcuraVolunteerProvider } from "@/lib/acura-volunteer";

export async function generateMetadata({
  params,
}: {
  params: { especialidade: string; cidade: string; slug: string };
}) {
  const profile = await getLivePublicProfileBySlug(params.slug);
  if (!profile) return { title: "Não encontrado — Doctor8" };

  const lang = normalizeLang(cookies().get("doctor8.lang")?.value);
  const specialtyLabel = getProfessionLabel(lang, profile.specialty);
  const name = `${profile.firstName} ${profile.lastName}`.trim();
  const city = profile.clinicCity || params.cidade.replace(/-/g, " ");

  return {
    title: `${name} — ${specialtyLabel} em ${city} | Doctor8`,
    description:
      profile.bio?.slice(0, 160) ||
      `Agende consulta com ${name}, ${specialtyLabel} em ${city}.`,
    alternates: {
      canonical: buildPublicProfileUrl(profile),
    },
    openGraph: {
      title: `${name} — ${specialtyLabel}`,
      description: profile.bio?.slice(0, 160) || `Agende sua consulta no Doctor8`,
      url: buildPublicProfileUrl(profile),
      type: "profile",
      ...(profile.avatarUrl ? { images: [{ url: profile.avatarUrl }] } : {}),
    },
  };
}

function StarRating({ avg, count }: { avg: number | null; count: number }) {
  if (!avg || count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-amber-500">
      <Star size={14} fill="currentColor" />
      <span className="text-sm font-semibold text-slate-700">{avg.toFixed(1)}</span>
      <span className="text-xs text-slate-400">({count})</span>
    </span>
  );
}

export default async function PublicSpecialistPage({
  params,
}: {
  params: { especialidade: string; cidade: string; slug: string };
}) {
  const profile = await getLivePublicProfileBySlug(params.slug);
  if (!profile) notFound();

  const canonicalPath = buildPublicProfilePath(profile);
  const requestedPath = `/especialistas/${params.especialidade}/${params.cidade}/${params.slug}`;
  if (requestedPath !== canonicalPath) {
    redirect(canonicalPath);
  }

  const lang = normalizeLang(cookies().get("doctor8.lang")?.value);
  const t = (key: string) => translate(lang, key);
  const specialtyLabel = getProfessionLabel(lang, profile.specialty);
  const name = `${profile.firstName} ${profile.lastName}`.trim();
  const initials = `${profile.firstName[0] || ""}${profile.lastName[0] || ""}`;

  const jsonLd = buildPhysicianJsonLd(profile, buildPublicProfileUrl(profile));

  const currency = profile.currency || "BRL";
  const showAcuraBadge = isAcuraVolunteerProvider(profile.verified, profile.acuraVolunteer);

  return (
    <>
      <PublicProfileTracker slug={profile.slug} source="public_profile" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <header className="bg-brand-500 text-white">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="inline-flex shrink-0">
              <Image
                src="/branding/doctor8-logo.png"
                alt="Doctor8"
                width={160}
                height={44}
                className="h-9 w-auto mix-blend-screen"
                priority
              />
            </Link>
            <div className="flex items-center gap-3 text-sm">
              <Link href="/login" className="hover:underline opacity-90">
                {t("pub.headerLogin")}
              </Link>
              <Link
                href="/register"
                className="bg-white text-brand-600 font-semibold px-4 py-2 rounded-full hover:bg-brand-50 transition"
              >
                {t("pub.headerRegister")}
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-6 lg:py-8">
          <div className="grid lg:grid-cols-[1fr_340px_280px] gap-5">
            {/* Left ? profile info */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
              <div className="flex items-start gap-4">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={name}
                    className="w-20 h-20 rounded-2xl object-cover border border-slate-100 shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-brand-100 text-brand-600 flex items-center justify-center text-2xl font-bold shrink-0">
                    {initials}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-bold text-slate-900">{name}</h1>
                    {profile.verified && (
                      <CheckCircle2 size={18} className="text-brand-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-brand-600 font-medium mt-0.5">{specialtyLabel}</p>
                  {showAcuraBadge && (
                    <div className="mt-2">
                      <AcuraVolunteerBadge size="md" />
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <StarRating avg={profile.ratingAvg} count={profile.ratingCount} />
                    {profile.license && (
                      <span className="text-xs text-slate-500">{profile.license}</span>
                    )}
                  </div>
                </div>
              </div>

              {profile.headline && (
                <p className="text-slate-600 italic text-sm border-l-2 border-brand-200 pl-3">
                  {profile.headline}
                </p>
              )}

              <div className="space-y-2">
                {profile.yearsOfPractice != null && profile.yearsOfPractice > 0 && (
                  <p className="flex items-center gap-2 text-sm text-slate-600">
                    <Stethoscope size={15} className="text-brand-400 shrink-0" />
                    {t("pub.yearsExp").replace("{n}", String(profile.yearsOfPractice))}
                  </p>
                )}
                {profile.trainingInstitution && (
                  <p className="flex items-center gap-2 text-sm text-slate-600">
                    <Award size={15} className="text-brand-400 shrink-0" />
                    {profile.trainingInstitution}
                  </p>
                )}
                {profile.subspecialties.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {profile.subspecialties.map((s) => (
                      <span
                        key={s}
                        className="text-xs bg-brand-50 text-brand-600 px-2.5 py-1 rounded-full"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {profile.bio && (
                <p className="text-sm text-slate-600 leading-relaxed">{profile.bio}</p>
              )}

              <div className="flex flex-wrap gap-2">
                {profile.acceptsTeleconsult && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 px-3 py-1.5 rounded-full">
                    <Video size={13} /> {t("pub.teleconsult")}
                  </span>
                )}
                {profile.acceptsInPerson && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full">
                    <Building2 size={13} /> {t("pub.inPerson")}
                  </span>
                )}
              </div>

              <PublicServicesList
                services={profile.services}
                defaultPrice={profile.consultPrice}
                currency={profile.currency}
              />

              {profile.googleBusinessUrl && (
                <a
                  href={profile.googleBusinessUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-500 transition"
                >
                  <MapPin size={15} />
                  {t("pub.viewOnGoogle")}
                  <ExternalLink size={13} className="opacity-60" />
                </a>
              )}

              <PublicReviewsSection slug={profile.slug} />
            </div>

            {/* Center ? booking */}
            <PublicBookingPanel profile={profile} />

            {/* Right ? locations + map */}
            <PublicProfilePlaces
              locations={profile.locations}
              fallback={{
                clinicName: profile.clinicName,
                clinicAddress: profile.clinicAddress,
                clinicCity: profile.clinicCity,
                clinicState: profile.clinicState,
                clinicCountry: profile.clinicCountry,
                clinicLatitude: profile.clinicLatitude,
                clinicLongitude: profile.clinicLongitude,
                acceptsTeleconsult: profile.acceptsTeleconsult,
              }}
              providerName={name}
            />
          </div>
        </main>

        <footer className="text-center text-xs text-slate-400 py-8">
          Powered by{" "}
          <Link href="/register" className="font-black text-brand-500">
            Doctor8
          </Link>
        </footer>
      </div>
    </>
  );
}
