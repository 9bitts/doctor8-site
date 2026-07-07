"use client";

import {
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  MessageCircle,
  Globe,
  ExternalLink,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  buildWhatsAppUrl,
  resolveAccentColor,
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
    default:
      return <Globe size={size} />;
  }
}

export function PublicDoctorImageTheme({
  doctorImage,
  children,
}: {
  doctorImage: DoctorImageData;
  children: React.ReactNode;
}) {
  const accent = resolveAccentColor(doctorImage.themePreset, doctorImage.accentColor);
  return (
    <div
      style={
        {
          "--pub-accent": accent,
          "--pub-accent-light": `${accent}18`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

export function PublicDoctorImageCover({ coverImageUrl }: { coverImageUrl: string | null }) {
  if (!coverImageUrl) return null;
  return (
    <div className="rounded-2xl overflow-hidden border border-slate-100 mb-5 aspect-[3/1]">
      <img src={coverImageUrl} alt="" className="w-full h-full object-cover" />
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

  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {hasWebsite && (
        <a
          href={doctorImage.website!}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-slate-200 text-slate-700 hover:border-[var(--pub-accent)] hover:text-[var(--pub-accent)] transition"
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
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
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
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-slate-200 text-slate-700 hover:border-[var(--pub-accent)] hover:text-[var(--pub-accent)] transition capitalize"
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
  if (!images.length) return null;
  return (
    <div className="space-y-2 pt-4 border-t border-slate-100">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {images.map((img, i) => (
          <div
            key={i}
            className="aspect-[4/3] rounded-xl overflow-hidden border border-slate-100"
          >
            <img src={img} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PublicDoctorImageVideo({ videoUrl }: { videoUrl: string | null }) {
  if (!videoUrl) return null;
  return (
    <div className="pt-4 border-t border-slate-100">
      <div className="aspect-video rounded-xl overflow-hidden border border-slate-100 bg-slate-900">
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
        <article key={block.id}>
          <h2
            className="text-base font-semibold mb-2"
            style={{ color: "var(--pub-accent, #0d9488)" }}
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
