"use client";

// src/app/(dashboard)/patient/documents/DocumentsClient.tsx
// Patient documents: list (own + shared) + add own document + download +
// share own documents WITH A DOCTOR + UN-SHARE (4D-2). i18n via useT().

import { useState, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { getCategoryGroupLabel, getCategoryLabel } from "@/lib/category-i18n";
import { getProfessionLabel } from "@/lib/professions";
import {
  FileText, Plus, X, Download, Loader2, UserCheck, Tag, Share2, CheckCircle2,
  Stethoscope, AlertCircle, XCircle, Trash2, Search, UserPlus,
} from "lucide-react";
import { openUrlAfterAsync, openAuthenticatedPdf } from "@/lib/open-url-safely";
import { uploadFileToApi } from "@/lib/upload-client";

const PRO_SEARCH_MIN_CHARS = 2;

interface SharedDoctor {
  professionalId: string;
  name: string;
}
interface Item {
  id: string;
  type: string;
  categoryName: string | null;
  categoryGroup: string | null;
  title: string;
  content: string | null;
  hasFile: boolean;
  createdAt: string;
  sharedBy: string | null;
  sharedWithDoctors: SharedDoctor[];
  signatureStatus?: string | null;
  dossierId?: string | null;
  dossierTitle?: string | null;
}

type DocSort = "newest" | "oldest" | "az";
type DocFilter = "all" | "unsigned" | "signed" | "shared";

interface CategoryItem {
  id: string; name: string; slug: string; groupName: string; icon: string | null; legacyType: string | null;
}
interface CategoryGroup { group: string; items: CategoryItem[]; }

interface Doctor {
  professionalId: string; userId: string; name: string; specialty: string;
}

interface ProSearchHit {
  professionalId: string;
  professionalUserId: string;
  name: string;
  specialty: string | null;
  licenseNumber: string | null;
  linkStatus: "PENDING" | "ACCEPTED" | "REJECTED" | "REVOKED" | "NONE";
  linkId: string | null;
}

function findCategoryIdByLegacyType(groups: CategoryGroup[], legacyType: string): string {
  for (const g of groups) {
    const found = g.items.find((c) => c.legacyType === legacyType);
    if (found) return found.id;
  }
  return "";
}

const LEGACY_KEYS: Record<string, string> = {
  PRESCRIPTION: "doctype.PRESCRIPTION",
  EXAM_REQUEST: "doctype.EXAM_REQUEST",
  EXAM_RESULT: "doctype.EXAM_RESULT",
  CERTIFICATE: "doctype.CERTIFICATE",
  REFERRAL: "doctype.REFERRAL",
  CLINICAL_NOTE: "doctype.CLINICAL_NOTE",
  OTHER: "doctype.OTHER",
};

export default function DocumentsClient({ initialItems }: { initialItems: Item[] }) {
  const { lang, t } = useI18n();
  const [items, setItems] = useState<Item[]>(initialItems);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [doctors, setDoctors] = useState<Doctor[] | null>(null);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [doctorsLoadError, setDoctorsLoadError] = useState(false);

  const [shareDocId, setShareDocId] = useState<string | null>(null);
  const [sharingTo, setSharingTo] = useState<string | null>(null);
  const [unsharingKey, setUnsharingKey] = useState<string | null>(null);
  const [proQuery, setProQuery] = useState("");
  const [proSearching, setProSearching] = useState(false);
  const [proHits, setProHits] = useState<ProSearchHit[]>([]);
  const [shareHeldNotice, setShareHeldNotice] = useState<string | null>(null);

  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [autoShareProfessionalId, setAutoShareProfessionalId] = useState<string | null>(null);
  const [autoShareDoctorName, setAutoShareDoctorName] = useState<string>("");
  const [sortMode, setSortMode] = useState<DocSort>("newest");
  const [filterMode, setFilterMode] = useState<DocFilter>("all");

  // Fallback label for a legacy type (translated)
  const legacyLabel = (type: string) => t(LEGACY_KEYS[type] || "doctype.OTHER");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/categories");
        const data = await res.json();
        if (!active) return;
        const gs: CategoryGroup[] = data.groups || [];
        setGroups(gs);
        const first = gs[0]?.items[0];
        if (first) setCategoryId(first.id);
      } catch { /* leave empty */ }
      if (active) setCategoriesLoading(false);
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const documentId = new URLSearchParams(window.location.search).get("documentId");
    if (!documentId) return;
    const el = document.getElementById(`patient-doc-${documentId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.classList.add("ring-2", "ring-brand-400", "bg-brand-50/40");
  }, [items]);

  useEffect(() => {
    if (!shareDocId) return;
    const q = proQuery.trim();
    if (q.length < PRO_SEARCH_MIN_CHARS) {
      setProHits([]);
      return;
    }
    const handle = setTimeout(async () => {
      setProSearching(true);
      try {
        const res = await fetch(
          `/api/patient/professionals/search?q=${encodeURIComponent(q)}`,
        );
        if (res.ok) {
          const data = await res.json();
          setProHits(data.professionals || []);
        } else {
          setProHits([]);
        }
      } catch {
        setProHits([]);
      } finally {
        setProSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [proQuery, shareDocId]);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("new") !== "1") return;
    if (categoriesLoading) return;
    const shareId = sp.get("shareWithProfessionalId");
    const doctorName = sp.get("doctorName");
    if (shareId) setAutoShareProfessionalId(shareId);
    if (doctorName) setAutoShareDoctorName(doctorName);
    if (sp.get("type") === "EXAM_RESULT") {
      openNewExamResultForm();
    } else {
      resetForm();
      setShowForm(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriesLoading, groups]);

  async function loadDoctors(force = false) {
    if (!force && doctors !== null) return doctors;
    setDoctorsLoading(true);
    setDoctorsLoadError(false);
    try {
      const res = await fetch("/api/patient/doctors");
      const data = await res.json();
      if (!res.ok) {
        setDoctorsLoadError(true);
        setDoctors([]);
        setDoctorsLoading(false);
        return [];
      }
      const list: Doctor[] = data.doctors || [];
      setDoctors(list);
      setDoctorsLoading(false);
      return list;
    } catch {
      setDoctorsLoadError(true);
      setDoctors([]);
      setDoctorsLoading(false);
      return [];
    }
  }

  function resetForm(preferLegacyType?: string) {
    let catId = groups[0]?.items[0]?.id ?? "";
    if (preferLegacyType) {
      const match = findCategoryIdByLegacyType(groups, preferLegacyType);
      if (match) catId = match;
    }
    setCategoryId(catId);
    setTitle(""); setContent(""); setFile(null); setError(null);
  }

  function openNewExamResultForm() {
    resetForm("EXAM_RESULT");
    setShowForm(true);
  }

  async function handleCreate() {
    if (!title.trim()) { setError(t("docs.err.titleRequired")); return; }
    if (!categoryId) { setError(t("docs.err.categoryRequired")); return; }
    setSaving(true);
    setError(null);
    try {
      let fileKey = "";
      if (file) {
        const up = await uploadFileToApi(file, "patient-docs");
        if (!up.ok) {
          setError(
            up.unauthorized
              ? t("docs.err.sessionExpired")
              : up.error === "FILE_TOO_LARGE"
                ? t("docs.err.fileTooLarge")
              : up.error === "UPLOAD_FAILED" || up.error === "NETWORK"
                ? t("docs.err.uploadFailed")
                : up.error,
          );
          setSaving(false);
          return;
        }
        fileKey = up.key;
      }
      const res = await fetch("/api/patient/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ categoryId, title, content, fileKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("docs.err.couldNotSave"));
        setSaving(false);
        return;
      }
      const newId = data.id;
      const sharedDoctors: SharedDoctor[] = [];
      const pendingShareId = autoShareProfessionalId;
      const pendingShareName = autoShareDoctorName;
      let autoShareSucceeded = false;

      if (pendingShareId) {
        const doctorList = await loadDoctors(true);
        const doctor = doctorList.find((d) => d.professionalId === pendingShareId) || null;
        const name = doctor?.name || pendingShareName || "";
        autoShareSucceeded = await shareWithDoctorSilent(newId, pendingShareId);
        if (autoShareSucceeded) {
          sharedDoctors.push({ professionalId: pendingShareId, name: name || "—" });
        } else {
          setActionError(t("docs.autoShareFailed").replace("{{name}}", name || "—"));
        }
        setAutoShareProfessionalId(null);
        setAutoShareDoctorName("");
      }

      setItems((prev) => [
        {
          id: newId,
          type: data.type,
          categoryName: data.categoryName ?? null,
          categoryGroup: null,
          title: data.title,
          content: data.content,
          hasFile: data.hasFile,
          createdAt: new Date().toISOString(),
          sharedBy: null,
          sharedWithDoctors: sharedDoctors,
        },
        ...prev,
      ]);
      resetForm();
      setShowForm(false);
      setSaving(false);

      // Open share picker when there was no auto-share target, or auto-share failed.
      if (!pendingShareId || !autoShareSucceeded) {
        setProQuery("");
        setProHits([]);
        setShareHeldNotice(null);
        await loadDoctors(true);
        setShareDocId(newId);
      }
    } catch {
      setError(t("docs.err.network"));
      setSaving(false);
    }
  }

  async function shareWithDoctorSilent(
    docId: string,
    professionalId: string,
  ): Promise<boolean> {
    try {
      const res = await fetch(`/api/patient/documents/${docId}/share-with-doctor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ professionalId }),
      });
      const data = await res.json();
      return !!(res.ok && data.shared);
    } catch {
      return false;
    }
  }

  function closeShareModal() {
    setShareDocId(null);
    setProQuery("");
    setProHits([]);
    setShareHeldNotice(null);
    setSharingTo(null);
  }

  async function openShare(docId: string) {
    setProQuery("");
    setProHits([]);
    setShareHeldNotice(null);
    await loadDoctors(true);
    setShareDocId(docId);
  }

  async function handleDelete(id: string) {
    if (!confirm(t("docs.deleteConfirm"))) return;
    setDeletingId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/patient/documents/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setActionError(t("docs.deleteError"));
        return;
      }
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch {
      setActionError(t("docs.deleteError"));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleShareWithDoctor(
    docId: string,
    professionalId: string,
    doctorName: string,
    opts?: { keepOpenIfHeld?: boolean },
  ) {
    setSharingTo(professionalId);
    setActionError(null);
    setShareHeldNotice(null);
    try {
      const res = await fetch(`/api/patient/documents/${docId}/share-with-doctor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ professionalId }),
      });
      const data = await res.json();
      if (res.ok && data.shared) {
        setItems((prev) => prev.map((it) => {
          if (it.id !== docId) return it;
          const exists = it.sharedWithDoctors.some((dd) => dd.professionalId === professionalId);
          return exists ? it : { ...it, sharedWithDoctors: [...it.sharedWithDoctors, { professionalId, name: doctorName }] };
        }));
        if (data.heldUntilLinkAccepted && opts?.keepOpenIfHeld) {
          setShareHeldNotice(doctorName);
          setProQuery("");
          setProHits([]);
        } else {
          closeShareModal();
        }
      } else {
        setActionError(t("common.actionError"));
      }
    } catch {
      setActionError(t("common.actionError"));
    }
    setSharingTo(null);
  }

  async function handleShareOrConnect(docId: string, hit: ProSearchHit) {
    const current = items.find((it) => it.id === docId);
    if (current?.sharedWithDoctors.some((dd) => dd.professionalId === hit.professionalId)) {
      return;
    }

    try {
      const needsLink =
        hit.linkStatus === "NONE" ||
        hit.linkStatus === "REJECTED" ||
        hit.linkStatus === "REVOKED";

      if (needsLink) {
        setSharingTo(hit.professionalId);
        setActionError(null);
        setShareHeldNotice(null);
        const linkRes = await fetch("/api/patient/professional-links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ professionalUserId: hit.professionalUserId }),
        });
        if (!linkRes.ok) {
          setActionError(t("common.actionError"));
          setSharingTo(null);
          return;
        }
      }

      await handleShareWithDoctor(docId, hit.professionalId, hit.name, {
        keepOpenIfHeld: true,
      });
    } catch {
      setActionError(t("common.actionError"));
      setSharingTo(null);
    }
  }

  async function handleUnshare(docId: string, professionalId: string) {
    const key = docId + ":" + professionalId;
    setUnsharingKey(key);
    setActionError(null);
    try {
      const res = await fetch(`/api/patient/documents/${docId}/share-with-doctor?professionalId=${professionalId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (res.ok) {
        setItems((prev) => prev.map((it) =>
          it.id === docId
            ? { ...it, sharedWithDoctors: it.sharedWithDoctors.filter((dd) => dd.professionalId !== professionalId) }
            : it
        ));
      } else {
        setActionError(t("common.actionError"));
      }
    } catch {
      setActionError(t("common.actionError"));
    }
    setUnsharingKey(null);
  }

  async function handleDownload(id: string, sharedBy: string | null) {
    setDownloadingId(id);
    setActionError(null);
    try {
      if (sharedBy) {
        await openAuthenticatedPdf(`/api/patient/documents/${id}/pdf`);
        return;
      }
      await openUrlAfterAsync(async () => {
        const res = await fetch(`/api/patient/documents?documentId=${id}`, { credentials: "same-origin" });
        const data = await res.json();
        if (res.ok && data.url) return data.url as string;
        if (data.error === "No file") {
          await openAuthenticatedPdf(`/api/patient/documents/${id}/pdf`);
          return null;
        }
        setActionError(t("docs.err.downloadFailed"));
        return null;
      });
    } catch {
      setActionError(t("docs.err.downloadFailed"));
    }
    setDownloadingId(null);
  }

  function groupKeyOf(it: Item): string {
    if (it.dossierId) {
      return it.dossierTitle?.trim()
        ? `${t("docs.dossier")}: ${it.dossierTitle}`
        : t("docs.dossier");
    }
    return it.categoryGroup || legacyLabel(it.type);
  }

  const filteredItems = items.filter((it) => {
    if (filterMode === "unsigned") return !!it.sharedBy && it.signatureStatus !== "SIGNED";
    if (filterMode === "signed") return it.signatureStatus === "SIGNED";
    if (filterMode === "shared") return !!it.sharedBy;
    return true;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortMode === "az") {
      return a.title.localeCompare(b.title, lang === "pt" ? "pt-BR" : lang === "es" ? "es" : "en", {
        sensitivity: "base",
      });
    }
    const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return sortMode === "oldest" ? -diff : diff;
  });
  const groupedByGroup: Record<string, Item[]> = {};
  const groupOrder: string[] = [];
  for (const it of sortedItems) {
    const k = groupKeyOf(it);
    if (!groupedByGroup[k]) { groupedByGroup[k] = []; groupOrder.push(k); }
    groupedByGroup[k].push(it);
  }
  for (const k of groupOrder) {
    groupedByGroup[k].sort((a, b) => {
      if (sortMode === "az") {
        return a.title.localeCompare(b.title, lang === "pt" ? "pt-BR" : lang === "es" ? "es" : "en", {
          sensitivity: "base",
        });
      }
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sortMode === "oldest" ? -diff : diff;
    });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="sticky top-0 z-20 -mx-1 px-1 py-3 bg-slate-50/95 backdrop-blur-sm border-b border-slate-100 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">{t("docs.title")}</h1>
          <p className="text-slate-500 mt-1 truncate">{t("docs.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={openNewExamResultForm}
            className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-4 py-2.5 rounded-xl transition text-sm"
          >
            <Plus size={18} /> {t("docs.addExamResult")}
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2.5 rounded-xl transition text-sm"
          >
            <Plus size={18} /> {t("docs.add")}
          </button>
        </div>
      </div>

      {actionError && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl">
          <AlertCircle size={16} className="shrink-0" />
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} className="ml-auto text-amber-600 hover:text-amber-800">
            <X size={16} />
          </button>
        </div>
      )}

      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-slate-500 font-medium">{t("docs.sort")}</label>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as DocSort)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
          >
            <option value="newest">{t("docs.sortNewest")}</option>
            <option value="oldest">{t("docs.sortOldest")}</option>
            <option value="az">{t("docs.sortAZ")}</option>
          </select>
          <label className="text-xs text-slate-500 font-medium ml-2">{t("docs.filter")}</label>
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as DocFilter)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
          >
            <option value="all">{t("docs.filterAll")}</option>
            <option value="shared">{t("docs.filterShared")}</option>
            <option value="unsigned">{t("docs.filterUnsigned")}</option>
            <option value="signed">{t("docs.filterSigned")}</option>
          </select>
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm text-center py-16">
          <FileText className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-400 text-sm">{t("docs.empty.title")}</p>
          <p className="text-slate-400 text-xs mt-1">{t("docs.empty.subtitle")}</p>
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm text-center py-12">
          <p className="text-slate-400 text-sm">{t("timeline.emptyFilter")}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupOrder.map((grp) => (
            <div key={grp}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <Tag size={16} className="text-emerald-500" />
                <h2 className="text-sm font-bold text-slate-700">
                  {groupedByGroup[grp][0]?.categoryGroup
                    ? getCategoryGroupLabel(lang, groupedByGroup[grp][0].categoryGroup!)
                    : grp}
                </h2>
                <span className="text-xs text-slate-400">({groupedByGroup[grp].length})</span>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
                {groupedByGroup[grp].map((it) => {
                  const itemLabel = it.categoryName
                    ? getCategoryLabel(lang, { name: it.categoryName })
                    : legacyLabel(it.type);
                  const isOwn = !it.sharedBy;
                  return (
                    <div id={`patient-doc-${it.id}`} key={it.id} className="px-5 py-4 hover:bg-slate-50 transition">
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              {itemLabel}
                            </span>
                            <p className="font-semibold text-slate-800 text-sm">{it.title}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {new Date(it.createdAt).toLocaleDateString(lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US", {
                                day: "2-digit", month: "short", year: "numeric",
                              })}
                            </p>
                            {it.sharedBy && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                <UserCheck size={11} /> {t("docs.sharedBy")} {it.sharedBy}
                              </span>
                            )}
                            {it.sharedBy && it.signatureStatus !== "SIGNED" && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
                                {t("docs.unsigned")}
                              </span>
                            )}
                            {it.sharedBy && it.signatureStatus === "SIGNED" && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                                {t("docs.signed")}
                              </span>
                            )}
                          </div>
                          {it.content && (
                            <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{it.content}</p>
                          )}
                          {isOwn && !it.hasFile && (
                            <p className="text-xs text-slate-400 mt-1">{t("docs.noFile")}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                        {(it.hasFile || it.sharedBy) && (
                          <button
                            onClick={() => handleDownload(it.id, it.sharedBy)}
                            disabled={downloadingId === it.id}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-emerald-600 transition px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 disabled:opacity-50"
                            aria-label={t("docs.viewDownload")}
                            title={t("docs.viewDownload")}
                          >
                            {downloadingId === it.id ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                            <span>{t("docs.viewDownload")}</span>
                          </button>
                        )}
                        {isOwn && (
                          <button
                            onClick={() => handleDelete(it.id)}
                            disabled={deletingId === it.id}
                            className="text-slate-400 hover:text-rose-500 transition p-2 rounded-lg hover:bg-rose-50 disabled:opacity-50"
                            aria-label={t("docs.delete")}
                            title={t("docs.delete")}
                          >
                            {deletingId === it.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                          </button>
                        )}
                        </div>
                      </div>

                      {isOwn && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {it.sharedWithDoctors.length > 0 && (
                            it.sharedWithDoctors.map((dd) => {
                              const key = it.id + ":" + dd.professionalId;
                              return (
                                <span key={dd.professionalId} className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg">
                                  <CheckCircle2 size={14} /> {t("docs.sharedWith")} {dd.name}
                                  <button
                                    onClick={() => handleUnshare(it.id, dd.professionalId)}
                                    disabled={unsharingKey === key}
                                    className="ml-1 text-rose-500 hover:text-rose-700 disabled:opacity-50"
                                    aria-label={t("docs.unshare")}
                                    title={t("docs.unshare")}
                                  >
                                    {unsharingKey === key ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                                  </button>
                                </span>
                              );
                            })
                          )}
                          <button
                            onClick={() => openShare(it.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-emerald-600 border border-slate-200 hover:border-emerald-300 px-3 py-1.5 rounded-lg transition"
                          >
                            <Share2 size={14} /> {t("docs.shareWithDoctor")}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add document modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="font-bold text-slate-800">{t("docs.modal.title")}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {autoShareProfessionalId && (
                <div className="flex items-start gap-2 text-sm text-accent-700 bg-accent-50 border border-accent-100 rounded-xl px-3 py-2.5">
                  <Stethoscope size={16} className="shrink-0 mt-0.5" />
                  <span>
                    {t("docs.autoShareHint").replace(
                      "{{name}}",
                      autoShareDoctorName || "—",
                    )}
                  </span>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("docs.modal.category")}</label>
                {categoriesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                    <Loader2 size={14} className="animate-spin" /> {t("docs.modal.loadingCategories")}
                  </div>
                ) : groups.length === 0 ? (
                  <p className="text-sm text-amber-600">{t("docs.modal.noCategories")}</p>
                ) : (
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm bg-white"
                  >
                    {groups.map((g) => (
                      <optgroup key={g.group} label={getCategoryGroupLabel(lang, g.group)}>
                        {g.items.map((c) => (
                          <option key={c.id} value={c.id}>{getCategoryLabel(lang, { slug: c.slug, name: c.name })}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("docs.modal.titleLabel")}</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("docs.modal.titlePlaceholder")}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("docs.modal.notes")}</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {t("docs.modal.file")} <span className="text-slate-400">{t("docs.modal.fileHint")}</span>
                </label>
                <input
                  type="file"
                  accept="application/pdf,.pdf,image/*,.heic,.heif,video/mp4,video/quicktime,video/webm"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 file:text-sm file:font-medium hover:file:bg-emerald-100"
                />
                {file && (
                  <p className="text-xs text-slate-500 mt-1">{file.name} ({(file.size/1024/1024).toFixed(1)} MB)</p>
                )}
              </div>

              {error && (
                <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving || categoriesLoading}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm disabled:opacity-50"
                >
                  {saving ? t("docs.modal.saving") : t("docs.modal.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share-with-doctor modal */}
      {shareDocId && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="font-bold text-slate-800">{t("docs.share.title")}</h2>
              <button onClick={closeShareModal} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-5">
              <p className="text-sm text-slate-500">{t("docs.share.help")}</p>

              {shareHeldNotice && (
                <div className="flex items-start gap-2 text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                  <span>
                    {t("docs.share.heldSuccess").replace("{{name}}", shareHeldNotice)}
                  </span>
                </div>
              )}

              {/* Appointment / known doctors */}
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">{t("docs.share.yourDoctors")}</p>
                {doctorsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400 py-3">
                    <Loader2 size={16} className="animate-spin" /> {t("docs.share.loading")}
                  </div>
                ) : doctorsLoadError ? (
                  <div className="flex items-start gap-2 text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-3">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{t("docs.share.loadError")}</span>
                  </div>
                ) : !doctors || doctors.length === 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-sm text-slate-600 bg-slate-50 rounded-xl px-4 py-3">
                      <AlertCircle size={16} className="shrink-0 mt-0.5 text-slate-400" />
                      <span>{t("docs.share.none")}</span>
                    </div>
                    <Link
                      href="/patient/appointments"
                      onClick={closeShareModal}
                      className="text-sm font-medium text-brand-600 hover:text-brand-700 px-1"
                    >
                      {t("docs.share.bookFirst")}
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {doctors.map((d) => {
                      const current = items.find((it) => it.id === shareDocId);
                      const alreadyShared = current?.sharedWithDoctors.some((dd) => dd.professionalId === d.professionalId);
                      return (
                        <button
                          key={d.professionalId}
                          onClick={() => !alreadyShared && handleShareWithDoctor(shareDocId, d.professionalId, d.name)}
                          disabled={sharingTo !== null || alreadyShared}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition text-left disabled:opacity-60"
                        >
                          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                            <Stethoscope size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 text-sm">{d.name}</p>
                            <p className="text-xs text-slate-500">{getProfessionLabel(lang, d.specialty)}</p>
                          </div>
                          {alreadyShared ? (
                            <span className="text-xs text-emerald-600 inline-flex items-center gap-1"><CheckCircle2 size={14} /> {t("docs.share.shared")}</span>
                          ) : sharingTo === d.professionalId ? (
                            <Loader2 size={16} className="animate-spin text-emerald-500" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Search any Doctor8 professional */}
              <div className="border-t border-slate-100 pt-5">
                <p className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
                  <Search size={14} className="text-brand-500" />
                  {t("docs.share.searchTitle")}
                </p>
                <p className="text-xs text-slate-500 mb-3">{t("docs.share.searchHint")}</p>
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="search"
                    value={proQuery}
                    onChange={(e) => setProQuery(e.target.value)}
                    placeholder={t("providers.search.placeholder")}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 min-h-[44px]"
                  />
                  {proSearching && (
                    <Loader2
                      size={16}
                      className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
                    />
                  )}
                </div>

                {proQuery.trim().length >= PRO_SEARCH_MIN_CHARS && !proSearching && proHits.length === 0 && (
                  <p className="text-xs text-slate-500 mt-3">{t("docs.share.searchEmpty")}</p>
                )}

                {proHits.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {proHits.map((hit) => {
                      const current = items.find((it) => it.id === shareDocId);
                      const alreadyShared = current?.sharedWithDoctors.some(
                        (dd) => dd.professionalId === hit.professionalId,
                      );
                      const needsLink =
                        hit.linkStatus === "NONE" ||
                        hit.linkStatus === "REJECTED" ||
                        hit.linkStatus === "REVOKED";
                      const subtitle = [
                        hit.specialty ? getProfessionLabel(lang, hit.specialty) : null,
                        hit.licenseNumber,
                      ].filter(Boolean).join(" · ");

                      return (
                        <button
                          key={hit.professionalId}
                          type="button"
                          onClick={() => !alreadyShared && handleShareOrConnect(shareDocId, hit)}
                          disabled={sharingTo !== null || alreadyShared}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition text-left disabled:opacity-60"
                        >
                          <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
                            {needsLink && !alreadyShared ? <UserPlus size={16} /> : <Stethoscope size={16} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 text-sm">{hit.name}</p>
                            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
                            {!alreadyShared && hit.linkStatus === "PENDING" && (
                              <p className="text-xs text-amber-600 mt-0.5">{t("link.statusPending")}</p>
                            )}
                            {!alreadyShared && hit.linkStatus === "ACCEPTED" && (
                              <p className="text-xs text-brand-600 mt-0.5">{t("link.statusAccepted")}</p>
                            )}
                            {!alreadyShared && needsLink && (
                              <p className="text-xs text-slate-500 mt-0.5">{t("docs.share.connectAndShare")}</p>
                            )}
                          </div>
                          {alreadyShared ? (
                            <span className="text-xs text-emerald-600 inline-flex items-center gap-1">
                              <CheckCircle2 size={14} /> {t("docs.share.shared")}
                            </span>
                          ) : sharingTo === hit.professionalId ? (
                            <Loader2 size={16} className="animate-spin text-emerald-500" />
                          ) : null}
                        </button>
                      );
                    })}
                  </ul>
                )}
              </div>

              <button
                onClick={closeShareModal}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50"
              >
                {t("docs.share.notNow")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
