"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BookOpen, Plus, Loader2, Search, Share2, ExternalLink, Paperclip,
  TrendingUp, Eye, Package, Stethoscope,
  Leaf, Flower2, Brain, Pill, Utensils, Heart, Microscope, FileText,
  Pencil, Printer, Trash2, ChevronDown, ChevronUp, FolderOpen, AlertCircle,
} from "lucide-react";
import AiSummarizeButton from "@/components/AiSummarizeButton";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/toast";
import type { LibraryProfessionKey, LibraryResourceDto, ResourceCategory } from "@/lib/professional-library/types";
import { categoriesForProfession } from "@/lib/professional-library/profession";
import ShareResourceModal from "./ShareResourceModal";
import ShareWithColleagueModal from "./ShareWithColleagueModal";
import ShareCollectionModal from "./ShareCollectionModal";
import ResourceFormModal from "./ResourceFormModal";

type HubTab = "mine" | "packs" | "reference";

interface HubPack {
  id: string;
  title: string;
  description: string;
  category: string;
  itemCount: number;
  imported: boolean;
}

interface HubReference {
  id: string;
  title: string;
  description: string;
  href: string;
  external?: boolean;
  icon: string;
}

interface HubData {
  professionKey: LibraryProfessionKey;
  resources: LibraryResourceDto[];
  collections: { id: string; title: string; description: string | null; category: string; resourceCount: number; shareCount: number }[];
  packs: HubPack[];
  references: HubReference[];
  stats: { totalShares: number; totalViews: number; openRate: number };
}

export interface ProfessionalLibraryHubProps {
  apiBase?: string;
  /** Label for recipient in share modal (patient vs analysand vs integrative client) */
  recipientMode?: "patient" | "analysand" | "integrative_client";
  /** Enable sharing with other Doctor8 professionals. */
  allowColleagueShare?: boolean;
}

const REF_ICONS: Record<string, typeof BookOpen> = {
  book: BookOpen,
  leaf: Leaf,
  flower: Flower2,
  brain: Brain,
  pill: Pill,
  stethoscope: Stethoscope,
  utensils: Utensils,
  heart: Heart,
  microscope: Microscope,
};

function youtubeThumb(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  return m ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : null;
}

export default function ProfessionalLibraryHub({
  apiBase = "/api/professional",
  recipientMode = "patient",
  allowColleagueShare = true,
}: ProfessionalLibraryHubProps) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<HubTab>("mine");
  const [hub, setHub] = useState<HubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LibraryResourceDto | null>(null);
  const [shareTarget, setShareTarget] = useState<LibraryResourceDto | null>(null);
  const [colleagueShareTarget, setColleagueShareTarget] = useState<LibraryResourceDto | null>(null);
  const [collectionShareTarget, setCollectionShareTarget] = useState<{ id: string; title: string } | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const subtitleKey =
    recipientMode === "analysand"
      ? "lib.subtitleAnalyst"
      : recipientMode === "integrative_client"
        ? "lib.subtitleIntegrative"
        : "lib.subtitle";
  const sharesCountKey =
    recipientMode === "analysand"
      ? "lib.sharesCountAnalyst"
      : recipientMode === "integrative_client"
        ? "lib.sharesCountIntegrative"
        : "lib.sharesCount";

  const loadHub = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch(`${apiBase}/library?lang=${lang}`);
      const data = await res.json();
      if (res.ok) setHub(data);
      else setLoadError(true);
    } catch {
      setLoadError(true);
    }
    setLoading(false);
  }, [apiBase, lang]);

  useEffect(() => { void loadHub(); }, [loadHub]);

  useEffect(() => {
    const resourceId = searchParams.get("resourceId");
    if (!resourceId || !hub) return;
    setTab("mine");
    requestAnimationFrame(() => {
      document.getElementById(`resource-${resourceId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [searchParams, hub]);

  const professionKey = hub?.professionKey ?? "doctor";
  const categories = useMemo(() => categoriesForProfession(professionKey), [professionKey]);

  const filteredResources = useMemo(() => {
    if (!hub) return [];
    const q = query.trim().toLowerCase();
    return hub.resources.filter((r) => {
      if (category !== "all" && r.category !== category) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        (r.content?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [hub, query, category]);

  async function importPack(packId: string) {
    setImporting(packId);
    try {
      const res = await fetch(`${apiBase}/library/import-pack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId, lang }),
      });
      if (res.status === 409) {
        toast.success(t("libHub.alreadyImported"));
      } else if (res.ok) {
        toast.success(t("libHub.importSuccess"));
        await loadHub();
        setTab("mine");
      } else {
        toast.error(t("lib.errGeneric"));
      }
    } catch {
      toast.error(t("rec.networkError"));
    }
    setImporting(null);
  }

  async function deleteResource(id: string) {
    if (!confirm(t("lib.deleteConfirm"))) return;
    const res = await fetch(`${apiBase}/resources/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(t("lib.errGeneric"));
      return;
    }
    setHub((h) => h ? { ...h, resources: h.resources.filter((r) => r.id !== id) } : h);
  }

  const titleKey = `libHub.profession.${professionKey}`;
  const highlightResourceId = searchParams.get("resourceId");

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="text-brand-500 shrink-0" size={26} />
            {t(`libHub.profession.${professionKey}` as "libHub.profession.doctor") || t("lib.title")}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{t(subtitleKey as "lib.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm min-h-[44px]"
        >
          <Plus size={18} /> {t("lib.add")}
        </button>
      </div>

      {/* Stats */}
      {hub && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Share2, label: t("libHub.statsShares"), value: hub.stats.totalShares },
            { icon: Eye, label: t("libHub.statsViews"), value: hub.stats.totalViews },
            { icon: TrendingUp, label: t("libHub.statsOpenRate"), value: `${hub.stats.openRate}%` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-100 p-3 text-center shadow-sm">
              <Icon size={16} className="mx-auto text-brand-500 mb-1" />
              <p className="text-lg font-bold text-slate-800">{value}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex rounded-xl border border-slate-200 overflow-hidden text-sm font-medium bg-white">
        {([
          ["mine", t("libHub.tabMine")],
          ["packs", t("libHub.tabPacks")],
          ["reference", t("libHub.tabReference")],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 py-2.5 px-2 transition ${tab === key ? "bg-brand-500 text-white" : "text-slate-600 hover:bg-slate-50"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-slate-400 py-16">
          <Loader2 size={20} className="animate-spin" /> {t("common.loading")}
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center gap-3 py-16 bg-white rounded-2xl border border-amber-200">
          <AlertCircle size={28} className="text-amber-500" />
          <p className="text-sm text-slate-600">{t("common.loadError")}</p>
          <button type="button" onClick={() => void loadHub()} className="text-sm font-semibold text-brand-600">
            {t("common.retry")}
          </button>
        </div>
      ) : tab === "mine" ? (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("libHub.search")}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
            >
              <option value="all">{t("libHub.filterAll")}</option>
              {categories.map((c) => (
                <option key={c} value={c}>{t(`libHub.category.${c}`)}</option>
              ))}
            </select>
          </div>

          {(hub?.collections ?? []).length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <FolderOpen size={14} /> {t("libHub.collections")}
              </h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {(hub?.collections ?? []).map((col) => (
                  <div key={col.id} className="bg-violet-50/50 border border-violet-100 rounded-xl p-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{col.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {col.resourceCount} {t("libHub.packItems")} · {col.shareCount} {t(sharesCountKey as "lib.sharesCount")}
                      </p>
                    </div>
                    {recipientMode === "patient" && (
                      <button
                        type="button"
                        onClick={() => setCollectionShareTarget({ id: col.id, title: col.title })}
                        className="shrink-0 text-xs font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-0.5"
                      >
                        <Share2 size={12} /> {t("libHub.shareCollection")}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {filteredResources.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center shadow-sm">
              <BookOpen className="mx-auto text-slate-300 mb-3" size={40} />
              <p className="font-semibold text-slate-600">{t("lib.empty")}</p>
              <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">{t("lib.emptyHint")}</p>
              <button
                type="button"
                onClick={() => setTab("packs")}
                className="mt-4 text-sm font-semibold text-brand-500 hover:underline"
              >
                {t("libHub.tabPacks")} →
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {filteredResources.map((r) => {
                const thumb = youtubeThumb(r.url);
                return (
                  <article
                    key={r.id}
                    id={`resource-${r.id}`}
                    className={`bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col ${
                      highlightResourceId === r.id ? "border-brand-400 ring-2 ring-brand-100" : "border-slate-100"
                    }`}
                  >
                    {thumb && (
                      <div className="aspect-video bg-slate-100 relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={thumb} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex items-start gap-2">
                        {!thumb && (
                          <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                            {r.contentType === "text" ? <FileText size={16} className="text-brand-500" />
                              : r.url ? <ExternalLink size={16} className="text-brand-500" />
                              : <Paperclip size={16} className="text-brand-500" />}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 text-sm">{r.title}</p>
                          <span className="text-[10px] font-medium text-slate-400 uppercase">
                            {t(`libHub.category.${r.category}` as `libHub.category.${ResourceCategory}`)}
                          </span>
                        </div>
                      </div>

                      {r.content && (
                        <div className="mt-2">
                          <p className={`text-xs text-slate-500 whitespace-pre-line ${!expanded[r.id] ? "line-clamp-3" : ""}`}>
                            {r.content}
                          </p>
                          {r.content.length > 100 && (
                            <button
                              type="button"
                              onClick={() => setExpanded((e) => ({ ...e, [r.id]: !e[r.id] }))}
                              className="text-xs text-brand-500 mt-0.5 inline-flex items-center gap-0.5"
                            >
                              {expanded[r.id] ? <><ChevronUp size={12} /> {t("libHub.seeLess")}</> : <><ChevronDown size={12} /> {t("libHub.seeMore")}</>}
                            </button>
                          )}
                        </div>
                      )}

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {r.shareCount > 0 && (
                          <span className="text-[10px] bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full">
                            {r.shareCount} {t(sharesCountKey as "lib.sharesCount")}
                          </span>
                        )}
                        {r.viewCount > 0 && (
                          <span className="text-[10px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                            <Eye size={10} /> {r.viewCount}
                          </span>
                        )}
                        {r.collectionTitle && (
                          <span className="text-[10px] bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full">
                            {r.collectionTitle}
                          </span>
                        )}
                      </div>

                      <div className="mt-auto pt-3 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShareTarget(r)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 px-3 py-1.5 rounded-lg"
                        >
                          <Share2 size={12} /> {t("libHub.sharePrimary")}
                        </button>
                        {allowColleagueShare && (
                          <button
                            type="button"
                            onClick={() => setColleagueShareTarget(r)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 px-2.5 py-1.5 rounded-lg"
                            title={t("lib.shareWithPro")}
                          >
                            <Stethoscope size={12} /> {t("lib.shareWithPro")}
                          </button>
                        )}
                        {r.url && (
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:border-brand-200"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                        <AiSummarizeButton resourceId={r.id} apiBase={apiBase} variant="compact" />
                        <button type="button" onClick={() => window.open(`${apiBase}/resources/${r.id}/pdf`, "_blank", "noopener,noreferrer")} className="p-1.5 text-slate-400 hover:text-brand-500 rounded-lg" title={t("lib.print")}>
                          <Printer size={14} />
                        </button>
                        <button type="button" onClick={() => { setEditing(r); setShowForm(true); }} className="p-1.5 text-slate-400 hover:text-brand-500 rounded-lg" title={t("lib.edit")}>
                          <Pencil size={14} />
                        </button>
                        <button type="button" onClick={() => deleteResource(r.id)} className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg" title={t("lib.delete")}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      ) : tab === "packs" ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {(hub?.packs ?? []).map((pack) => (
            <div key={pack.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                  <Package size={18} className="text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800">{pack.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{pack.description}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{pack.itemCount} {t("libHub.packItems")}</p>
                </div>
              </div>
              <button
                type="button"
                disabled={pack.imported || importing === pack.id}
                onClick={() => importPack(pack.id)}
                className="mt-4 w-full py-2 rounded-xl text-sm font-semibold transition disabled:opacity-60
                  bg-brand-500 text-white hover:bg-brand-600 disabled:bg-slate-100 disabled:text-slate-500"
              >
                {importing === pack.id ? (
                  <Loader2 size={14} className="animate-spin inline" />
                ) : pack.imported ? (
                  t("libHub.imported")
                ) : (
                  t("libHub.importPack")
                )}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {(hub?.references ?? []).map((ref) => {
            const Icon = REF_ICONS[ref.icon] ?? BookOpen;
            const inner = (
              <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-brand-200 transition h-full">
                <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-sky-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{ref.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{ref.description}</p>
                </div>
              </div>
            );
            return ref.external ? (
              <a key={ref.id} href={ref.href} target="_blank" rel="noopener noreferrer">{inner}</a>
            ) : (
              <Link key={ref.id} href={ref.href}>{inner}</Link>
            );
          })}
        </div>
      )}

      {showForm && (
        <ResourceFormModal
          apiBase={apiBase}
          resource={editing}
          categories={categories}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); void loadHub(); }}
        />
      )}

      {shareTarget && (
        <ShareResourceModal
          apiBase={apiBase}
          resource={shareTarget}
          recipientMode={recipientMode}
          onClose={() => setShareTarget(null)}
          onShared={() => void loadHub()}
        />
      )}

      {colleagueShareTarget && (
        <ShareWithColleagueModal
          apiBase={apiBase}
          resource={colleagueShareTarget}
          onClose={() => setColleagueShareTarget(null)}
        />
      )}

      {collectionShareTarget && (
        <ShareCollectionModal
          apiBase={apiBase}
          collectionId={collectionShareTarget.id}
          collectionTitle={collectionShareTarget.title}
          onClose={() => setCollectionShareTarget(null)}
          onShared={() => void loadHub()}
        />
      )}
    </div>
  );
}
