// Public professional profile ? SEO URL: /especialistas/[especialidade]/[cidade]/[slug]

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  Video, Building2, Star, Stethoscope, Award, MapPin, ExternalLink, Calendar,
} from "lucide-react";
import { BrandLogoLink } from "@/components/brand/BrandLogo";
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
import {
  PublicDoctorImageTheme,
  PublicDoctorImageHero,
  PublicDoctorImageSocial,
  PublicDoctorImageGallery,
  PublicDoctorImageVideo,
  PublicDoctorImageBlocks,
} from "@/components/public/PublicDoctorImageContent";
import { getSiteUrl } from "@/lib/site-metadata";

function absoluteMediaUrl(url: string | null | undefined): string | undefined {
  if (!url || url.startsWith("data:")) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${getSiteUrl()}${url}`;
  return undefined;
}

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
  const ogImage =
    absoluteMediaUrl(profile.doctorImage.coverImageUrl) ||
    absoluteMediaUrl(profile.avatarUrl);

  return {
    title: `${name} — ${specialtyLabel} em ${city} | Doctor8`,
    description:
      profile.headline ||
      profile.bio?.slice(0, 160) ||
      `Agende consulta com ${name}, ${specialtyLabel} em ${city}.`,
    alternates: {
      canonical: buildPublicProfileUrl(profile),
    },
    openGraph: {
      title: `${name} — ${specialtyLabel}`,
      description:
        profile.headline ||
        profile.bio?.slice(0, 160) ||
        `Agende sua consulta no Doctor8`,
      url: buildPublicProfileUrl(profile),
      type: "profile",
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
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

  const showAcuraBadge = isAcuraVolunteerProvider(profile.verified, profile.acuraVolunteer);
  const isModern = profile.doctorImage.themePreset === "modern";

  return (
    <>
      <PublicProfileTracker slug={profile.slug} source="public_profile" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=IBM+Plex+Sans:wght@400;600&family=Nunito:wght@400;600;700&family=Source+Sans+3:wght@400;600&display=swap"
      />

      <PublicDoctorImageTheme doctorImage={profile.doctorImage}>
      <div
        className="min-h-screen"
        style={{
          backgroundColor: "var(--pub-page-bg)",
          backgroundImage: "var(--pub-page-bg-image)",
        }}
      >
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-white/10 bg-d8-dark text-white">
          <div
            className="h-0.5 w-full"
            style={{ background: "var(--pub-accent)" }}
          />
          <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
            <BrandLogoLink href="/" variant="on-dark" size="md" />
            <div className="flex items-center gap-3 text-sm">
              <Link href="/login" className="text-white/80 transition hover:text-white">
                {t("pub.headerLogin")}
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-accent-500 px-4 py-2 font-semibold text-white transition hover:bg-accent-600"
              >
                {t("pub.headerRegister")}
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-6 lg:py-8 pb-24 lg:pb-8">
          <div className="grid lg:grid-cols-[1fr_340px_280px] gap-5">
            {/* Left — profile info */}
            <div
              className="border p-6 space-y-5"
              style={{
                background: "var(--pub-card-bg)",
                borderColor: "var(--pub-card-border)",
                borderRadius: "var(--pub-card-radius)",
                boxShadow: "var(--pub-card-shadow)",
              }}
            >
              <PublicDoctorImageHero
                coverImageUrl={profile.doctorImage.coverImageUrl}
                avatarUrl={profile.avatarUrl}
                name={name}
                initials={initials}
                specialtyLabel={specialtyLabel}
                verified={profile.verified}
                headline={profile.headline}
                license={profile.license}
                ratingSlot={
                  <StarRating avg={profile.ratingAvg} count={profile.ratingCount} />
                }
                badgeSlot={
                  showAcuraBadge ? <AcuraVolunteerBadge size="md" /> : null
                }
              />

              <div className="space-y-2">
                {profile.yearsOfPractice != null && profile.yearsOfPractice > 0 && (
                  <p className="flex items-center gap-2 text-sm text-slate-600">
                    <Stethoscope
                      size={15}
                      className="shrink-0"
                      style={{ color: "var(--pub-accent)" }}
                    />
                    {t("pub.yearsExp").replace("{n}", String(profile.yearsOfPractice))}
                  </p>
                )}
                {profile.trainingInstitution && (
                  <p className="flex items-center gap-2 text-sm text-slate-600">
                    <Award
                      size={15}
                      className="shrink-0"
                      style={{ color: "var(--pub-accent)" }}
                    />
                    {profile.trainingInstitution}
                  </p>
                )}
                {profile.subspecialties.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {profile.subspecialties.map((s) => (
                      <span
                        key={s}
                        className="text-xs px-2.5 py-1"
                        style={{
                          background: "var(--pub-accent-light)",
                          color: "var(--pub-accent)",
                          borderRadius: "var(--pub-chip-radius)",
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {profile.bio && (
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {profile.bio}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {profile.acceptsTeleconsult && (
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5"
                    style={{
                      color: "var(--pub-accent)",
                      background: "var(--pub-accent-light)",
                      borderRadius: "var(--pub-chip-radius)",
                    }}
                  >
                    <Video size={13} /> {t("pub.teleconsult")}
                  </span>
                )}
                {profile.acceptsInPerson && (
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 px-3 py-1.5"
                    style={{ borderRadius: "var(--pub-chip-radius)" }}
                  >
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
                  className="inline-flex items-center gap-2 text-sm font-medium transition hover:opacity-80"
                  style={{ color: "var(--pub-accent)" }}
                >
                  <MapPin size={15} />
                  {t("pub.viewOnGoogle")}
                  <ExternalLink size={13} className="opacity-60" />
                </a>
              )}

              <PublicDoctorImageSocial doctorImage={profile.doctorImage} providerName={name} />

              <PublicDoctorImageGallery images={profile.doctorImage.galleryImages} />

              <PublicDoctorImageVideo videoUrl={profile.doctorImage.videoUrl} />

              <PublicDoctorImageBlocks blocks={profile.doctorImage.contentBlocks} />

              <PublicReviewsSection slug={profile.slug} />
            </div>

            {/* Center — booking */}
            <div className="lg:sticky lg:top-20 lg:self-start">
              <PublicBookingPanel profile={profile} />
            </div>

            {/* Right — locations + map */}
            <div className={isModern ? "[&_*]:text-slate-800" : undefined}>
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
          </div>
        </main>

        {/* Sticky mobile CTA */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-slate-200/80 bg-white/95 backdrop-blur px-4 py-3 safe-area-pb">
          <a
            href="#public-booking"
            className="flex items-center justify-center gap-2 w-full text-white font-semibold py-3 rounded-xl text-sm shadow-lg transition hover:opacity-90"
            style={{
              background: "var(--pub-accent)",
              borderRadius: "var(--pub-chip-radius)",
            }}
          >
            <Calendar size={18} />
            {t("pub.bookCta")}
          </a>
        </div>

        <footer
          className={`text-center text-xs py-8 ${isModern ? "text-white/50" : "text-slate-400"}`}
        >
          Powered by{" "}
          <Link
            href="/register"
            className="font-black"
            style={{ color: isModern ? "#5eead4" : undefined }}
          >
            <span className={isModern ? undefined : "text-brand-500"}>Doctor8</span>
          </Link>
        </footer>
      </div>
      </PublicDoctorImageTheme>
    </>
  );
}
