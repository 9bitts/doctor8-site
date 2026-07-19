"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  MessageCircle,
  Globe,
  ExternalLink,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  buildWhatsAppUrl,
  getThemeTokens,
  themeCssVars,
  type DoctorImageData,
  type SocialLinkKey,
} from "@/lib/doctor-image";

function SocialIcon({ platform }: { platform: SocialLinkKey }) {
  const size = 16;
  switch (platform) {
    case "instagram":
      return <Instagram size={size} />;
    case "facebook":
      return <Facebook size={size} />;
    case "linkedin":
      return <Linkedin size={size} />;
    case "youtube":
      return <Youtube size={size} />;
    case "tiktok":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.77a8.2 8.2 0 0 0 4.76 1.52V6.84a4.85 4.85 0 0 1-1-.15z" />
        </svg>
      );
    case "twitter":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
        </svg>
      );
    default:
      return <Globe size={size} />;
  }
}

export function PublicDoctorImageTheme({
  doctorImage,
  children,
}: {
  doctorImage: DoctorImageData;
  children: ReactNode;
}) {
  const tokens = getThemeTokens(doctorImage.themePreset, doctorImage.accentColor);
  return (
    <div
      className="pub-doctor-image-theme"
      data-theme={doctorImage.themePreset}
      style={{
        ...themeCssVars(tokens),
        fontFamily: "var(--pub-body-font)",
      }}
    >
      {children}
    </div>
  );
}

export function PublicDoctorImageHero({
  coverImageUrl,
  avatarUrl,
  name,
  initials,
  specialtyLabel,
  verified,
  headline,
  license,
  ratingSlot,
  badgeSlot,
}: {
  coverImageUrl: string | null;
  avatarUrl: string | null;
  name: string;
  initials: string;
  specialtyLabel: string;
  verified: boolean;
  headline: string | null;
  license: string | null;
  ratingSlot?: ReactNode;
  badgeSlot?: ReactNode;
}) {
  const hasCover = !!coverImageUrl;

  return (
    <div className="relative">
      {hasCover ? (
        <div
          className="relative overflow-hidden aspect-[21/9] sm:aspect-[3/1] -mx-6 -mt-6 mb-0"
          style={{ borderRadius: "var(--pub-cover-radius) var(--pub-cover-radius) 0 0" }}
        >
          <img
            src={coverImageUrl!}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{ background: "var(--pub-hero-overlay)" }}
          />
        </div>
      ) : (
        <div
          className="-mx-6 -mt-6 mb-0 h-16 sm:h-20"
          style={{
            borderRadius: "var(--pub-cover-radius) var(--pub-cover-radius) 0 0",
            background:
              "linear-gradient(135deg, var(--pub-accent-soft), var(--pub-accent-light))",
          }}
        />
      )}

      <div className={`relative px-0 ${hasCover ? "-mt-10 sm:-mt-12" : "-mt-6"}`}>
        <div className="flex items-end gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover shrink-0 ring-4 ring-white shadow-md"
              style={{ borderRadius: "var(--pub-card-radius)" }}
            />
          ) : (
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center text-2xl font-bold shrink-0 ring-4 ring-white shadow-md text-white"
              style={{
                borderRadius: "var(--pub-card-radius)",
                background: "var(--pub-accent)",
              }}
            >
              {initials}
            </div>
          )}
          <div className="min-w-0 pb-1 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <h1
                className="text-xl sm:text-2xl text-slate-900 truncate"
                style={{
                  fontFamily: "var(--pub-heading-font)",
                  fontWeight: "var(--pub-heading-weight)" as CSSProperties["fontWeight"],
                }}
              >
                {name}
              </h1>
              {verified && (
                <svg
                  className="shrink-0"
                  width={18}
                  height={18}
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <circle cx="12" cy="12" r="10" fill="var(--pub-accent)" />
                  <path
                    d="M8 12.5l2.5 2.5L16 9.5"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <p className="font-medium mt-0.5" style={{ color: "var(--pub-accent)" }}>
              {specialtyLabel}
            </p>
          </div>
        </div>

        {(badgeSlot || ratingSlot || license) && (
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            {badgeSlot}
            {ratingSlot}
            {license && <span className="text-xs text-slate-500">{license}</span>}
          </div>
        )}

        {headline && (
          <p
            className="mt-4 text-slate-600 italic text-sm sm:text-base pl-3 leading-relaxed"
            style={{
              borderLeft: "3px solid var(--pub-accent)",
              fontFamily: "var(--pub-heading-font)",
            }}
          >
            {headline}
          </p>
        )}
      </div>
    </div>
  );
}

export function PublicDoctorImageSocial({
  doctorImage,
  providerName,
}: {
  doctorImage: DoctorImageData;
  providerName: string;
}) {
  const { t } = useI18n();
  const links = Object.entries(doctorImage.socialLinks).filter(([, url]) => url);
  const hasWhatsApp = !!doctorImage.whatsappNumber;
  const hasWebsite = !!doctorImage.website;

  if (!links.length && !hasWhatsApp && !hasWebsite) return null;

  const chipBase =
    "inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 border transition";

  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {hasWebsite && (
        <a
          href={doctorImage.website!}
          target="_blank"
          rel="noopener noreferrer"
          className={`${chipBase} border-slate-200 text-slate-700 hover:border-[var(--pub-accent)] hover:text-[var(--pub-accent)] hover:bg-[var(--pub-accent-light)]`}
          style={{ borderRadius: "var(--pub-chip-radius)" }}
        >
          <Globe size={13} /> {t("doctorImagePub.website")}
        </a>
      )}
      {hasWhatsApp && (
        <a
          href={buildWhatsAppUrl(
            doctorImage.whatsappNumber!,
            t("doctorImagePub.whatsappMsg").replace("{name}", providerName)
          )}
          target="_blank"
          rel="noopener noreferrer"
          className={`${chipBase} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
          style={{ borderRadius: "var(--pub-chip-radius)" }}
        >
          <MessageCircle size={13} /> WhatsApp
        </a>
      )}
      {links.map(([platform, url]) => (
        <a
          key={platform}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${chipBase} border-slate-200 text-slate-700 hover:border-[var(--pub-accent)] hover:text-[var(--pub-accent)] hover:bg-[var(--pub-accent-light)] capitalize`}
          style={{ borderRadius: "var(--pub-chip-radius)" }}
        >
          <SocialIcon platform={platform as SocialLinkKey} />
          {t(`doctorImage.social.${platform}`)}
          <ExternalLink size={10} className="opacity-50" />
        </a>
      ))}
    </div>
  );
}

export function PublicDoctorImageGallery({ images }: { images: string[] }) {
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (active === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setActive(null);
      if (e.key === "ArrowRight") setActive((i) => (i === null ? i : (i + 1) % images.length));
      if (e.key === "ArrowLeft")
        setActive((i) => (i === null ? i : (i - 1 + images.length) % images.length));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, images.length]);

  if (!images.length) return null;

  return (
    <>
      <div className="space-y-2 pt-4 border-t border-slate-100">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className="aspect-[4/3] overflow-hidden border border-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--pub-accent)]/40 group"
              style={{ borderRadius: "var(--pub-cover-radius)" }}
            >
              <img
                src={img}
                alt=""
                className="w-full h-full object-cover transition group-hover:scale-[1.03]"
              />
            </button>
          ))}
        </div>
      </div>

      {active !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setActive(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setActive(null)}
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 text-white hover:bg-white/20"
            aria-label="Close"
          >
            <X size={20} />
          </button>
          <img
            src={images[active]}
            alt=""
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          {images.length > 1 && (
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
              {active + 1} / {images.length}
            </p>
          )}
        </div>
      )}
    </>
  );
}

export function PublicDoctorImageVideo({ videoUrl }: { videoUrl: string | null }) {
  if (!videoUrl) return null;
  return (
    <div className="pt-4 border-t border-slate-100">
      <div
        className="aspect-video overflow-hidden border border-slate-100 bg-slate-900"
        style={{ borderRadius: "var(--pub-cover-radius)" }}
      >
        <iframe
          src={videoUrl}
          title="Video"
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}

export function PublicDoctorImageBlocks({ blocks }: { blocks: DoctorImageData["contentBlocks"] }) {
  const visible = blocks.filter((b) => b.title.trim());
  if (!visible.length) return null;

  return (
    <div className="space-y-5 pt-4 border-t border-slate-100">
      {visible.map((block) => (
        <article
          key={block.id}
          className="rounded-xl p-4 -mx-1"
          style={{ background: "var(--pub-accent-light)" }}
        >
          <h2
            className="text-base mb-2"
            style={{
              color: "var(--pub-accent)",
              fontFamily: "var(--pub-heading-font)",
              fontWeight: "var(--pub-heading-weight)" as CSSProperties["fontWeight"],
            }}
          >
            {block.title}
          </h2>
          {block.body && (
            <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
              {block.body}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

/** Mini live preview for the settings editor. */
export function DoctorImageLivePreview({
  data,
  name = "Dr. Nome",
  specialty = "Especialidade",
}: {
  data: DoctorImageData;
  name?: string;
  specialty?: string;
}) {
  const tokens = getThemeTokens(data.themePreset, data.accentColor);
  return (
    <div
      className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
      style={themeCssVars(tokens)}
    >
      <div
        className="p-3 min-h-[220px]"
        style={{
          background: "var(--pub-page-bg)",
          backgroundImage: "var(--pub-page-bg-image)",
          fontFamily: "var(--pub-body-font)",
        }}
      >
        <div
          className="overflow-hidden border shadow-sm"
          style={{
            background: "var(--pub-card-bg)",
            borderColor: "var(--pub-card-border)",
            borderRadius: "var(--pub-card-radius)",
            boxShadow: "var(--pub-card-shadow)",
          }}
        >
          {data.coverImageUrl ? (
            <div className="h-16 relative">
              <img src={data.coverImageUrl} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: "var(--pub-hero-overlay)" }} />
            </div>
          ) : (
            <div
              className="h-10"
              style={{
                background:
                  "linear-gradient(135deg, var(--pub-accent-soft), var(--pub-accent-light))",
              }}
            />
          )}
          <div className="p-3 -mt-5 relative">
            <div
              className="w-12 h-12 rounded-xl ring-2 ring-white flex items-center justify-center text-white text-sm font-bold mb-2"
              style={{ background: "var(--pub-accent)" }}
            >
              {name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0])
                .join("")
                .toUpperCase() || "DR"}
            </div>
            <p
              className="text-sm text-slate-900 truncate"
              style={{
                fontFamily: "var(--pub-heading-font)",
                fontWeight: "var(--pub-heading-weight)" as CSSProperties["fontWeight"],
              }}
            >
              {name}
            </p>
            <p className="text-xs font-medium" style={{ color: "var(--pub-accent)" }}>
              {specialty}
            </p>
            {data.headline && (
              <p
                className="mt-2 text-[11px] italic text-slate-600 pl-2 line-clamp-2"
                style={{ borderLeft: "2px solid var(--pub-accent)" }}
              >
                {data.headline}
              </p>
            )}
            <div className="mt-3 flex gap-1.5 flex-wrap">
              <span
                className="text-[10px] px-2 py-0.5 text-white"
                style={{
                  background: "var(--pub-accent)",
                  borderRadius: "var(--pub-chip-radius)",
                }}
              >
                Agendar
              </span>
              {data.whatsappNumber && (
                <span
                  className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200"
                  style={{ borderRadius: "var(--pub-chip-radius)" }}
                >
                  WhatsApp
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** @deprecated Use PublicDoctorImageHero — kept for any external imports. */
export function PublicDoctorImageCover({ coverImageUrl }: { coverImageUrl: string | null }) {
  if (!coverImageUrl) return null;
  return (
    <div
      className="overflow-hidden border border-slate-100 mb-5 aspect-[3/1]"
      style={{ borderRadius: "var(--pub-cover-radius)" }}
    >
      <img src={coverImageUrl} alt="" className="w-full h-full object-cover" />
    </div>
  );
}
