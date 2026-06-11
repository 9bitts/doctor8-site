"use client";

// src/app/(dashboard)/patient/documents/DocumentsClient.tsx
// Patient documents: list (own + shared, grouped by category) + add own document + download via signed URL.

import { useState } from "react";
import {
  FileText, Plus, X, Download, Paperclip, Loader2,
  FlaskConical, ClipboardList, FileCheck, Send, StickyNote, File, UserCheck,
} from "lucide-react";

interface Item {
  id: string;
  type: string;
  title: string;
  content: string | null;
  hasFile: boolean;
  createdAt: string;
  sharedBy: string | null;
}

const CATEGORIES: Record<string, { label: string; icon: React.ReactNode }> = {
  EXAM_REQUEST: { label: "Exam request", icon: <ClipboardList size={16} className="text-blue-500" /> },
  EXAM_RESULT: { label: "Exam result", icon: <FlaskConical size={16} className="text-violet-500" /> },
  CERTIFICATE: { label: "Certificate", icon: <FileCheck size={16} className="text-amber-500" /> },
  REFERRAL: { label: "Referral", icon: <Send size={16} className="text-rose-500" /> },
  CLINICAL_NOTE: { label: "Clinical note", icon: <StickyNote size={16} className="text-slate-500" /> },
  OTHER: { label: "Other", icon: <File size={16} className="text-slate-500" /> },
};
const CATEGORY_ORDER = ["EXAM_RESULT", "EXAM_REQUEST", "CERTIFICATE", "REFERRAL", "CLINICAL_NOTE", "OTHER"];

export default function DocumentsClient({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [type, setType] = useState("EXAM_RESULT");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);

  function resetForm() {
    setType("EXAM_RESULT"); setTitle(""); setContent(""); setFile(null); setError(null);
  }

  async function handleCreate() {
    if (!title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    setError(null);
    try {
      let fileKey = "";
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", "patient-docs");
        const up = await fetch("/api/uploads", { method: "POST", body: fd });
        const upData = await up.json();
        if (!up.ok) { setError(upData.error || "Upload failed."); setSaving(false); return; }
        fileKey = upData.key;
      }
      const res = await fetch("/api/patient/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title, content, fileKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not save.");
        setSaving(false);
        return;
      }
      setItems((prev) => [
        { id: data.id, type: data.type, title: data.title, content: data.content, hasFile: data.hasFile, createdAt: new Date().toISOString(), sharedBy: null },
        ...prev,
      ]);
      resetForm();
      setShowForm(false);
    } catch {
      setError("Network error. Try again.");
    }
    setSaving(false);
  }

  async function handleDownload(id: string) {
    setDownloadingId(id);
    try {
      const res = await fetch(`/api/patient/documents?documentId=${id}`);
      const data = await res.json();
      if (res.ok && data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
    } catch {
      /* ignore */
    }
    setDownloadingId(null);
  }

  // Group items by category
  const grouped: Record<string, Item[]> = {};
  for (const it of items) {
    (grouped[it.type] ||= []).push(it);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
          <p className="text-slate-500 mt-1">Your exams, results and records shared by your doctors</p>
        </div>
        <button
          onClick={() => { setShowForm(true); resetForm(); }}
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2.5 rounded-xl transition text-sm"
        >
          <Plus size={18} /> Add document
        </button>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm text-center py-16">
          <FileText className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-400 text-sm">No documents yet</p>
          <p className="text-slate-400 text-xs mt-1">
            Add your own, or records shared by your doctor will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {CATEGORY_ORDER.filter((c) => grouped[c]?.length).map((cat) => {
            const cfg = CATEGORIES[cat] || CATEGORIES.OTHER;
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  {cfg.icon}
                  <h2 className="text-sm font-bold text-slate-700">{cfg.label}</h2>
                  <span className="text-xs text-slate-400">({grouped[cat].length})</span>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
                  {grouped[cat].map((it) => (
                    <div key={it.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-800 text-sm">{it.title}</p>
                          {it.sharedBy && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <UserCheck size={11} /> Shared by {it.sharedBy}
                            </span>
                          )}
                        </div>
                        {it.content && (
                          <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{it.content}</p>
                        )}
                      </div>
                      {it.hasFile && (
                        <button
                          onClick={() => handleDownload(it.id)}
                          disabled={downloadingId === it.id}
                          className="shrink-0 text-slate-400 hover:text-emerald-500 transition p-2 rounded-lg hover:bg-emerald-50 disabled:opacity-50"
                          aria-label="Open attachment"
                        >
                          {downloadingId === it.id ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add document modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="font-bold text-slate-800">Add document</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm bg-white"
                >
                  {CATEGORY_ORDER.map((c) => (
                    <option key={c} value={c}>{CATEGORIES[c].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Blood test - June 2026"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  File <span className="text-slate-400">(PDF, image or video — max 50MB)</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,image/*,video/mp4,video/quicktime,video/webm"
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
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save document"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
