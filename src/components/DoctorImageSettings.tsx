"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  Loader2,
  CheckCircle2,
  ExternalLink,
  Camera,
  X,
  Plus,
  Trash2,
  GripVertical,
  Palette,
  Link2,
  MessageCircle,
  Image as ImageIcon,
  Video,
  Type,
  Globe,
} from "lucide-react";
import {
  DOCTOR_IMAGE_THEME_PRESETS,
  SOCIAL_LINK_KEYS,
  MAX_GALLERY_IMAGES,
  MAX_CONTENT_BLOCKS,
  MAX_HEADLINE_LENGTH,
  type DoctorImageData,
  type DoctorImageContentBlock,
  type DoctorImageSocialLinks,
  type DoctorImageThemePreset,
} from "@/lib/doctor-image";
import { resizeImageToDataUrl } from "@/lib/client/resize-image";

const EMPTY: DoctorImageData = {
  headline: null,
  website: null,
  whatsappNumber: null,
  socialLinks: {},
  coverImageUrl: null,
  galleryImages: [],
  videoUrl: null,
  themePreset: "default",
  accentColor: null,
  contentBlocks: [],
};

function newBlockId(): string {
  return `blk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function DoctorImageSettings({ apiPath }: { apiPath: string }) {
  const { t } = useI18n();
  const coverRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [data, setData] = useState<DoctorImageData>(EMPTY);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(apiPath);
      if (res.ok) {
        const json = await res.json();
        setPublicUrl(json.publicUrl || null);
        if (json.doctorImage) {
          setData(json.doctorImage as DoctorImageData);
        }
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [apiPath]);

  function updateSocial(key: keyof DoctorImageSocialLinks, value: string) {
    setData((prev) => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [key]: value.trim() || undefined },
    }));
  }

  async function handleCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await resizeImageToDataUrl(file, 1200);
      setData((prev) => ({ ...prev, coverImageUrl: url }));
    } catch {
      setError(t("doctorImage.errPhoto"));
    }
    e.target.value = "";
  }

  async function handleGallery(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    try {
      const newImages: string[] = [];
      for (const file of files) {
        if (data.galleryImages.length + newImages.length >= MAX_GALLERY_IMAGES) break;
        newImages.push(await resizeImageToDataUrl(file, 800));
      }
      setData((prev) => ({
        ...prev,
        galleryImages: [...prev.galleryImages, ...newImages].slice(0, MAX_GALLERY_IMAGES),
      }));
    } catch {
      setError(t("doctorImage.errPhoto"));
    }
    e.target.value = "";
  }

  function removeGalleryImage(index: number) {
    setData((prev) => ({
      ...prev,
      galleryImages: prev.galleryImages.filter((_, i) => i !== index),
    }));
  }

  function addBlock() {
    if (data.contentBlocks.length >= MAX_CONTENT_BLOCKS) return;
    const block: DoctorImageContentBlock = {
      id: newBlockId(),
      title: "",
      body: "",
      order: data.contentBlocks.length,
    };
    setData((prev) => ({ ...prev, contentBlocks: [...prev.contentBlocks, block] }));
  }

  function updateBlock(id: string, patch: Partial<DoctorImageContentBlock>) {
    setData((prev) => ({
      ...prev,
      contentBlocks: prev.contentBlocks.map((b) =>
        b.id === id ? { ...b, ...patch } : b
      ),
    }));
  }

  function removeBlock(id: string) {
    setData((prev) => ({
      ...prev,
      contentBlocks: prev.contentBlocks
        .filter((b) => b.id !== id)
        .map((b, i) => ({ ...b, order: i })),
    }));
  }

  function moveBlock(id: string, dir: -1 | 1) {
    setData((prev) => {
      const blocks = [...prev.contentBlocks];
      const idx = blocks.findIndex((b) => b.id === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= blocks.length) return prev;
      [blocks[idx], blocks[next]] = [blocks[next], blocks[idx]];
      return {
        ...prev,
        contentBlocks: blocks.map((b, i) => ({ ...b, order: i })),
      };
    });
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const payload = {
        headline: data.headline?.trim() || null,
        website: data.website?.trim() || null,
        whatsappNumber: data.whatsappNumber?.trim() || null,
        socialLinks: Object.fromEntries(
          Object.entries(data.socialLinks).filter(([, v]) => v?.trim())
        ),
        coverImageUrl: data.coverImageUrl,
        galleryImages: data.galleryImages,
        videoUrl: data.videoUrl?.trim() || null,
        themePreset: data.themePreset,
        accentColor: data.accentColor,
        contentBlocks: data.contentBlocks
          .filter((b) => b.title.trim())
          .map((b, i) => ({
            id: b.id,
            title: b.title.trim(),
            body: b.body.trim(),
            order: i,
          })),
      };

      const res = await fetch(apiPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t("doctorImage.errSave"));
      if (json.doctorImage) setData(json.doctorImage as DoctorImageData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("doctorImage.errSave"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
        <Loader2 size={16} className="animate-spin" /> {t("doctorImage.loading")}
      </div>
    );
  }

  const inputClass =
    "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30";

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">{t("doctorImage.subtitle")}</p>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Theme */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Palette size={16} className="text-brand-500" />
          {t("doctorImage.themeTitle")}
        </h3>
        <p className="text-xs text-slate-500">{t("doctorImage.themeHint")}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {DOCTOR_IMAGE_THEME_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setData((prev) => ({ ...prev, themePreset: preset }))}
              className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                data.themePreset === preset
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {t(`doctorImage.theme.${preset}`)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-slate-600 shrink-0">
            {t("doctorImage.accentColor")}
          </label>
          <input
            type="color"
            value={data.accentColor || "#0d9488"}
            onChange={(e) =>
              setData((prev) => ({ ...prev, accentColor: e.target.value }))
            }
            className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
          />
          <button
            type="button"
            onClick={() => setData((prev) => ({ ...prev, accentColor: null }))}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            {t("doctorImage.accentReset")}
          </button>
        </div>
      </section>

      {/* Headline & links */}
      <section className="space-y-3 border-t border-slate-100 pt-5">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Type size={16} className="text-brand-500" />
          {t("doctorImage.textTitle")}
        </h3>
        <div>
          <label className="text-xs font-medium text-slate-600">
            {t("doctorImage.headline")}
          </label>
          <input
            className={inputClass}
            value={data.headline || ""}
            maxLength={MAX_HEADLINE_LENGTH}
            onChange={(e) =>
              setData((prev) => ({ ...prev, headline: e.target.value || null }))
            }
            placeholder={t("doctorImage.headlinePlaceholder")}
          />
          <p className="text-[10px] text-slate-400 mt-1">
            {(data.headline?.length || 0)}/{MAX_HEADLINE_LENGTH}
          </p>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
            <Globe size={12} /> {t("doctorImage.website")}
          </label>
          <input
            type="url"
            className={inputClass}
            value={data.website || ""}
            onChange={(e) =>
              setData((prev) => ({ ...prev, website: e.target.value || null }))
            }
            placeholder="https://"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
            <MessageCircle size={12} /> {t("doctorImage.whatsapp")}
          </label>
          <input
            type="tel"
            className={inputClass}
            value={data.whatsappNumber || ""}
            onChange={(e) =>
              setData((prev) => ({ ...prev, whatsappNumber: e.target.value || null }))
            }
            placeholder={t("doctorImage.whatsappPlaceholder")}
          />
        </div>
      </section>

      {/* Social links */}
      <section className="space-y-3 border-t border-slate-100 pt-5">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Link2 size={16} className="text-brand-500" />
          {t("doctorImage.socialTitle")}
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {SOCIAL_LINK_KEYS.map((key) => (
            <div key={key}>
              <label className="text-xs font-medium text-slate-600 capitalize">
                {t(`doctorImage.social.${key}`)}
              </label>
              <input
                type="url"
                className={inputClass}
                value={data.socialLinks[key] || ""}
                onChange={(e) => updateSocial(key, e.target.value)}
                placeholder="https://"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Cover & gallery */}
      <section className="space-y-3 border-t border-slate-100 pt-5">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <ImageIcon size={16} className="text-brand-500" />
          {t("doctorImage.mediaTitle")}
        </h3>

        <div>
          <label className="text-xs font-medium text-slate-600">
            {t("doctorImage.cover")}
          </label>
          <div className="mt-2 relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-[3/1]">
            {data.coverImageUrl ? (
              <>
                <img
                  src={data.coverImageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setData((prev) => ({ ...prev, coverImageUrl: null }))}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70"
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => coverRef.current?.click()}
                className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-brand-500 transition"
              >
                <Camera size={24} />
                <span className="text-xs">{t("doctorImage.coverUpload")}</span>
              </button>
            )}
          </div>
          <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCover} />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-600">
              {t("doctorImage.gallery")} ({data.galleryImages.length}/{MAX_GALLERY_IMAGES})
            </label>
            {data.galleryImages.length < MAX_GALLERY_IMAGES && (
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="text-xs font-semibold text-brand-600 hover:text-brand-500"
              >
                + {t("doctorImage.galleryAdd")}
              </button>
            )}
          </div>
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleGallery}
          />
          {data.galleryImages.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
              {data.galleryImages.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeGalleryImage(i)}
                    className="absolute top-1 right-1 p-1 rounded bg-black/50 text-white"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
            <Video size={12} /> {t("doctorImage.video")}
          </label>
          <input
            type="url"
            className={inputClass}
            value={data.videoUrl || ""}
            onChange={(e) =>
              setData((prev) => ({ ...prev, videoUrl: e.target.value || null }))
            }
            placeholder={t("doctorImage.videoPlaceholder")}
          />
          <p className="text-[10px] text-slate-400 mt-1">{t("doctorImage.videoHint")}</p>
        </div>
      </section>

      {/* Content blocks */}
      <section className="space-y-3 border-t border-slate-100 pt-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Type size={16} className="text-brand-500" />
            {t("doctorImage.blocksTitle")}
          </h3>
          {data.contentBlocks.length < MAX_CONTENT_BLOCKS && (
            <button
              type="button"
              onClick={addBlock}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-500"
            >
              <Plus size={14} /> {t("doctorImage.blockAdd")}
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500">{t("doctorImage.blocksHint")}</p>

        {data.contentBlocks.length === 0 && (
          <p className="text-xs text-slate-400 italic">{t("doctorImage.blocksEmpty")}</p>
        )}

        <div className="space-y-4">
          {data.contentBlocks.map((block, idx) => (
            <div
              key={block.id}
              className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-slate-400">
                  <GripVertical size={14} />
                  <span className="text-xs font-medium text-slate-500">
                    {t("doctorImage.blockN").replace("{n}", String(idx + 1))}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveBlock(block.id, -1)}
                    className="text-xs px-2 py-1 rounded text-slate-500 hover:bg-white disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={idx === data.contentBlocks.length - 1}
                    onClick={() => moveBlock(block.id, 1)}
                    className="text-xs px-2 py-1 rounded text-slate-500 hover:bg-white disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeBlock(block.id)}
                    className="p-1.5 rounded text-rose-500 hover:bg-rose-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <input
                className={inputClass}
                value={block.title}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder={t("doctorImage.blockTitlePlaceholder")}
              />
              <textarea
                className={`${inputClass} min-h-[100px] resize-y`}
                value={block.body}
                onChange={(e) => updateBlock(block.id, { body: e.target.value })}
                placeholder={t("doctorImage.blockBodyPlaceholder")}
                rows={4}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Save */}
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm px-5 py-2.5 rounded-xl disabled:opacity-50 transition"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : saved ? (
            <CheckCircle2 size={16} />
          ) : null}
          {saved ? t("doctorImage.saved") : t("doctorImage.save")}
        </button>
        {publicUrl && (
          <Link
            href={publicUrl}
            target="_blank"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-500"
          >
            <ExternalLink size={16} />
            {t("doctorImage.preview")}
          </Link>
        )}
      </div>
    </div>
  );
}
