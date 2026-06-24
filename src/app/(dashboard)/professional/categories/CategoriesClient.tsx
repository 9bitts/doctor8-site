"use client";

// src/app/(dashboard)/professional/categories/CategoriesClient.tsx
// Levels navigation: groups -> categories -> records (across all patients). i18n via useT().

import { useState, useEffect } from "react";
import Link from "next/link";
import AiSummarizeButton from "@/components/AiSummarizeButton";
import { useT } from "@/lib/i18n/I18nProvider";
import {
  Layers, ChevronRight, ChevronDown, FileText, Paperclip, Loader2,
  ArrowLeft, User, FolderOpen,
} from "lucide-react";

interface CatItem { id: string; name: string; count: number; }
interface Group { group: string; total: number; items: CatItem[]; }

interface CategoryRecord {
  id: string;
  title: string;
  content: string | null;
  hasFile: boolean;
  createdAt: string;
  chartId: string | null;
  patientName: string;
}

export default function CategoriesClient() {
  const t = useT();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const [selected, setSelected] = useState<{ id: string; name: string; group: string } | null>(null);
  const [records, setRecords] = useState<CategoryRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/professional/categories-overview");
        const data = await res.json();
        if (!active) return;
        setGroups(data.groups || []);
        const open: Record<string, boolean> = {};
        (data.groups || []).forEach((g: Group) => { open[g.group] = true; });
        setOpenGroups(open);
      } catch { /* ignore */ }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  async function openCategory(cat: CatItem, group: string) {
    setSelected({ id: cat.id, name: cat.name, group });
    setRecordsLoading(true);
    setRecords([]);
    try {
      const res = await fetch(`/api/professional/category-records?categoryId=${cat.id}`);
      const data = await res.json();
      setRecords(data.records || []);
    } catch { /* ignore */ }
    setRecordsLoading(false);
  }

  function toggleGroup(g: string) {
    setOpenGroups((s) => ({ ...s, [g]: !s[g] }));
  }

  // ---- Drill-down view: records of one category ----
  if (selected) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <button
          onClick={() => setSelected(null)}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft size={16} /> {t("cat.backToCategories")}
        </button>

        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{selected.group}</p>
          <h1 className="text-2xl font-bold text-slate-900">{selected.name}</h1>
        </div>

        {recordsLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-10 justify-center">
            <Loader2 size={18} className="animate-spin" /> {t("cat.loadingRecords")}
          </div>
        ) : records.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm text-center py-14">
            <FileText className="mx-auto text-slate-300 mb-3" size={36} />
            <p className="text-slate-400 text-sm">{t("cat.noRecordsInCategory")}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
            {records.map((r) => (
              <div key={r.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      <User size={11} /> {r.patientName}
                    </span>
                    {r.hasFile && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                        <Paperclip size={11} /> {t("cat.attachment")}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-slate-800 text-sm">{r.title}</p>
                  {r.content && (
                    <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap line-clamp-2">{r.content}</p>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <AiSummarizeButton documentId={r.id} />
                  {r.chartId && (
                    <Link
                      href={`/professional/patients/${r.chartId}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-500 hover:text-brand-600 border border-brand-200 hover:border-brand-200 px-3 py-1.5 rounded-lg transition"
                    >
                      <FolderOpen size={14} /> {t("cat.openChart")}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---- Overview: groups -> categories ----
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("cat.title")}</h1>
        <p className="text-slate-500 mt-1">{t("cat.subtitle")}</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-10 justify-center">
          <Loader2 size={18} className="animate-spin" /> {t("cat.loadingCategories")}
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm text-center py-16">
          <Layers className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-400 text-sm">{t("cat.noCategorized")}</p>
          <p className="text-slate-400 text-xs mt-1">{t("cat.noCategorizedHint")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.group} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <button
                onClick={() => toggleGroup(g.group)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center text-brand-500 shrink-0">
                  <Layers size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm">{g.group}</p>
                  <p className="text-xs text-slate-400">{g.total} {g.total === 1 ? t("cat.record") : t("cat.records")}</p>
                </div>
                {openGroups[g.group] ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
              </button>

              {openGroups[g.group] && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {g.items.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => openCategory(c, g.group)}
                      className="w-full flex items-center gap-3 pl-16 pr-5 py-3 hover:bg-brand-50 transition text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700">{c.name}</p>
                      </div>
                      <span className="text-xs font-medium text-slate-400">{c.count}</span>
                      <ChevronRight size={16} className="text-slate-300" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
