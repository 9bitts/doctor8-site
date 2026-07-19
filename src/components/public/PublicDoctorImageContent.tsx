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
  parseVideoEmbedUrl,
  themeCssVars,
  type DoctorImageData,
  type SocialLinkKey,
} from "@/lib/doctor-image";
import type { DoctorImageBookingPreview } from "@/lib/doctor-image-booking-preview";
import { localeOf } from "@/lib/i18n/translations";

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

function fmtPreviewPrice(cents: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency || "BRL",
    }).format(cents / 100);
  } catch {
    return `R$ ${(cents / 100).toFixed(2)}`;
  }
}

/** Full live preview for the settings editor — mirrors public Doctor Image content. */
export function DoctorImageLivePreview({
  data,
  bookingPreview = null,
  name = "Dr. Nome",
  specialty = "Especialidade",
}: {
  data: DoctorImageData;
  bookingPreview?: DoctorImageBookingPreview | null;
  name?: string;
  specialty?: string;
}) {
  const { lang, t } = useI18n();
  const locale = localeOf(lang);
  const tokens = getThemeTokens(data.themePreset, data.accentColor);
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "DR";
  const socialEntries = Object.entries(data.socialLinks).filter(([, url]) => url);
  const blocks = data.contentBlocks.filter((b) => b.title.trim());
  const videoEmbed = parseVideoEmbedUrl(data.videoUrl);
  const videoSrc = typeof videoEmbed === "string" ? videoEmbed : null;
  const chipClass =
    "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 border border-slate-200 text-slate-700";

  return (
    <div
      className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
      style={themeCssVars(tokens)}
    >
      <div
        className="p-2.5 max-h-[min(70vh,640px)] overflow-y-auto"
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
          {/* Cover / hero strip */}
          {data.coverImageUrl ? (
            <div className="h-20 sm:h-24 relative">
              <img src={data.coverImageUrl} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: "var(--pub-hero-overlay)" }} />
            </div>
          ) : (
            <div
              className="h-12"
              style={{
                background:
                  "linear-gradient(135deg, var(--pub-accent-soft), var(--pub-accent-light))",
              }}
            />
          )}

          <div className="p-3 -mt-6 relative space-y-3">
            {/* Identity */}
            <div>
              <div
                className="w-14 h-14 rounded-xl ring-2 ring-white flex items-center justify-center text-white text-sm font-bold mb-2 shadow-sm"
                style={{
                  background: "var(--pub-accent)",
                  borderRadius: "var(--pub-card-radius)",
                }}
              >
                {initials}
              </div>
              <p
                className="text-sm text-slate-900"
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
            </div>

            {data.headline && (
              <p
                className="text-[11px] italic text-slate-600 pl-2 leading-relaxed whitespace-pre-wrap"
                style={{
                  borderLeft: "3px solid var(--pub-accent)",
                  fontFamily: "var(--pub-heading-font)",
                }}
              >
                {data.headline}
              </p>
            )}

            {/* Contact + social */}
            {(data.website || data.whatsappNumber || socialEntries.length > 0) && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {data.website && (
                  <span
                    className={chipClass}
                    style={{ borderRadius: "var(--pub-chip-radius)" }}
                    title={data.website}
                  >
                    <Globe size={11} /> {t("doctorImagePub.website")}
                  </span>
                )}
                {data.whatsappNumber && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 border border-emerald-200 bg-emerald-50 text-emerald-700"
                    style={{ borderRadius: "var(--pub-chip-radius)" }}
                  >
                    <MessageCircle size={11} /> WhatsApp
                  </span>
                )}
                {socialEntries.map(([platform]) => (
                  <span
                    key={platform}
                    className={`${chipClass} capitalize`}
                    style={{ borderRadius: "var(--pub-chip-radius)" }}
                  >
                    <SocialIcon platform={platform as SocialLinkKey} />
                    {t(`doctorImage.social.${platform}`)}
                  </span>
                ))}
              </div>
            )}

            {/* Gallery */}
            {data.galleryImages.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <p className="text-[10px] font-medium text-slate-400">
                  {t("doctorImage.gallery")} ({data.galleryImages.length})
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {data.galleryImages.map((img, i) => (
                    <div
                      key={i}
                      className="aspect-square overflow-hidden border border-slate-100"
                      style={{ borderRadius: "calc(var(--pub-cover-radius) * 0.6)" }}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Video */}
            {videoSrc && (
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <p className="text-[10px] font-medium text-slate-400">{t("doctorImage.video")}</p>
                <div
                  className="aspect-video overflow-hidden border border-slate-100 bg-slate-900"
                  style={{ borderRadius: "calc(var(--pub-cover-radius) * 0.6)" }}
                >
                  <iframe
                    src={videoSrc}
                    title="Video preview"
                    className="w-full h-full pointer-events-none"
                    tabIndex={-1}
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              </div>
            )}

            {/* Content blocks */}
            {blocks.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                {blocks.map((block) => (
                  <article
                    key={block.id}
                    className="rounded-lg p-2.5"
                    style={{ background: "var(--pub-accent-light)" }}
                  >
                    <h3
                      className="text-xs mb-1"
                      style={{
                        color: "var(--pub-accent)",
                        fontFamily: "var(--pub-heading-font)",
                        fontWeight: "var(--pub-heading-weight)" as CSSProperties["fontWeight"],
                      }}
                    >
                      {block.title}
                    </h3>
                    {block.body && (
                      <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap line-clamp-4">
                        {block.body}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}

            {/* Services & prices */}
            {bookingPreview && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                  {t("pubPhase3.servicesTitle")}
                </p>
                {bookingPreview.services.length > 0 ? (
                  <ul className="space-y-1.5">
                    {bookingPreview.services.map((svc) => (
                      <li
                        key={svc.id}
                        className="flex items-center justify-between gap-2 text-[11px]"
                      >
                        <span className="text-slate-700 truncate">{svc.name}</span>
                        <span
                          className="font-semibold shrink-0"
                          style={{ color: "var(--pub-accent)" }}
                        >
                          {svc.priceCents === 0
                            ? t("consultServices.volunteerPrice")
                            : svc.priceCents != null
                              ? fmtPreviewPrice(
                                  svc.priceCents,
                                  svc.currency || bookingPreview.currency,
                                  locale
                                )
                              : t("pubPhase3.priceUnavailable")}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : bookingPreview.consultPrice > 0 ? (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-600">{t("pub.consultPrice")}</span>
                    <span className="font-semibold" style={{ color: "var(--pub-accent)" }}>
                      {fmtPreviewPrice(
                        bookingPreview.consultPrice,
                        bookingPreview.currency,
                        locale
                      )}
                    </span>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">
                    {t("doctorImage.previewNoPrices")}
                  </p>
                )}
              </div>
            )}

            {/* Upcoming slots */}
            {bookingPreview && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                    {t("pub.bookTitle")}
                  </p>
                  {bookingPreview.services[0]?.priceCents != null &&
                    bookingPreview.services[0].priceCents > 0 && (
                      <span
                        className="text-[11px] font-bold"
                        style={{ color: "var(--pub-accent)" }}
                      >
                        {fmtPreviewPrice(
                          bookingPreview.services[0].priceCents,
                          bookingPreview.services[0].currency || bookingPreview.currency,
                          locale
                        )}
                      </span>
                    )}
                </div>
                {bookingPreview.days.some((d) => d.slots.some((s) => s.available)) ? (
                  <div className="space-y-2">
                    {bookingPreview.days.map((day) => {
                      const available = day.slots.filter((s) => s.available);
                      if (!available.length) return null;
                      return (
                        <div key={day.date}>
                          <p className="text-[10px] font-medium text-slate-500 mb-1">
                            {day.label}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {available.map((slot) => (
                              <span
                                key={slot.datetime}
                                className="text-[10px] px-2 py-1 border border-slate-200 text-slate-700 bg-white"
                                style={{ borderRadius: "var(--pub-chip-radius)" }}
                              >
                                {slot.time}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">{t("pub.noSlots")}</p>
                )}
              </div>
            )}

            {/* CTA mirrors public booking accent */}
            <div className="pt-1">
              <span
                className="inline-flex items-center justify-center w-full text-[11px] font-semibold text-white py-2"
                style={{
                  background: "var(--pub-accent)",
                  borderRadius: "var(--pub-chip-radius)",
                }}
              >
                {t("pub.bookCta")}
              </span>
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
