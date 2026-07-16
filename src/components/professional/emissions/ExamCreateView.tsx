"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  Trash2, Loader2, ArrowLeft, FileText,
} from "lucide-react";
import type { Chart } from "./types";
import type { SavedEmission } from "./EmissionPostSaveFlow";
import ExamSearchInput, { formatExamItem, parseExamItemLine } from "@/components/ExamSearchInput";
import CidSearchInput, { type CidSelection } from "@/components/CidSearchInput";
import { PatientSearchCombobox } from "@/components/professional/PatientSearchCombobox";
import {
  clearExamDraft,
  loadExamDraft,
  saveExamDraft,
  type ExamFormDraft,
} from "@/lib/emission-form-draft";
import {
  extendSessionForWrite,
  isAuthFailureStatus,
  redirectToLoginAfterAuthFailure,
} from "@/lib/session-extend-client";

interface ExamCreateViewProps {
  t: (k: string) => string;
  locale: string;
  charts: Chart[];
  chartsLoading?: boolean;
  reuseHint?: boolean;
  templateHint?: boolean;
  initialPatient: Chart | null;
  lockPatient?: boolean;
  initialItems: string[];
  initialNotes: string;
  initialCid: string;
  initialTitle: string;
  editingDocumentId?: string | null;
  portal?: string;
  onBack: () => void;
  onSaved: (emission: SavedEmission) => void;
}

export function ExamCreateView({
  t, charts, chartsLoading = false, reuseHint, templateHint, initialPatient, lockPatient = false, initialItems, initialNotes, initialCid, initialTitle,
  editingDocumentId = null,
  portal: portalProp,
  onBack, onSaved,
}: ExamCreateViewProps) {
  const { data: session, update: updateSession } = useSession();
  const userId = session?.user?.id ?? "";
  const pathname = usePathname();
  const portal =
    portalProp ||
    (pathname.startsWith("/integrative-therapist")
      ? "integrative-therapist"
      : "professional");

  const hasSeedContent =
    !!initialPatient ||
    initialItems.length > 0 ||
    !!initialNotes.trim() ||
    !!initialCid.trim() ||
    !!editingDocumentId ||
    !!reuseHint ||
    !!templateHint;

  const [selectedPatient, setSelectedPatient] = useState<Chart | null>(initialPatient);
  const [title, setTitle] = useState(initialTitle || t("rx.examDefaultTitle"));
  const [items, setItems] = useState<string[]>(
    initialItems.length ? initialItems : []
  );
  const [notes, setNotes] = useState(initialNotes);
  const [cid, setCid] = useState<CidSelection | null>(
    initialCid ? { code: initialCid, description: "" } : null
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [examSearchOpen, setExamSearchOpen] = useState(false);
  const [cidSearchOpen, setCidSearchOpen] = useState(false);
  const [draftRestoredHint, setDraftRestoredHint] = useState(false);
  const [effectiveLockPatient, setEffectiveLockPatient] = useState(lockPatient);
  const [effectiveEditingId, setEffectiveEditingId] = useState(editingDocumentId);
  const draftHydratedRef = useRef(false);
  const suppressDraftSaveRef = useRef(false);

  useEffect(() => {
    if (!userId || draftHydratedRef.current || hasSeedContent) {
      draftHydratedRef.current = true;
      return;
    }
    draftHydratedRef.current = true;
    const draft = loadExamDraft(userId, portal);
    if (!draft) return;

    suppressDraftSaveRef.current = true;
    if (draft.selectedPatient) {
      setSelectedPatient({
        id: draft.selectedPatient.id,
        firstName: draft.selectedPatient.firstName,
        lastName: draft.selectedPatient.lastName,
        email: draft.selectedPatient.email,
        hasAccount: draft.selectedPatient.hasAccount,
      });
    }
    if (draft.title) setTitle(draft.title);
    setItems(draft.items.length ? draft.items : []);
    setNotes(draft.notes || "");
    setCid(
      draft.cidCode
        ? { code: draft.cidCode, description: draft.cidDescription || "" }
        : null,
    );
    setEffectiveEditingId(draft.editingDocumentId);
    setEffectiveLockPatient(!!draft.lockPatient);
    setDraftRestoredHint(true);
    queueMicrotask(() => {
      suppressDraftSaveRef.current = false;
    });
  }, [userId, portal, hasSeedContent]);

  useEffect(() => {
    if (!userId || suppressDraftSaveRef.current) return;
    const draft: ExamFormDraft = {
      selectedPatient: selectedPatient
        ? {
            id: selectedPatient.id,
            firstName: selectedPatient.firstName,
            lastName: selectedPatient.lastName,
            email: selectedPatient.email,
            hasAccount: selectedPatient.hasAccount,
          }
        : null,
      title,
      items,
      notes,
      cidCode: cid?.code || "",
      cidDescription: cid?.description || "",
      editingDocumentId: effectiveEditingId,
      lockPatient: effectiveLockPatient,
    };
    const timer = window.setTimeout(() => {
      saveExamDraft(userId, portal, draft);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [
    userId,
    portal,
    selectedPatient,
    title,
    items,
    notes,
    cid,
    effectiveEditingId,
    effectiveLockPatient,
  ]);

  function addExam(exam: { code?: string; name: string }) {
    const line = formatExamItem(exam);
    if (!line.trim()) return;
    setItems((prev) => [...prev, line]);
  }

  async function handleSave() {
    setError("");
    if (!selectedPatient) { setError(t("rx2.needPatient")); return; }
    const cleanItems = items.map((i) => i.trim()).filter(Boolean);
    if (cleanItems.length === 0) { setError(t("rx.needExamItems")); return; }
    setSaving(true);
    try {
      await extendSessionForWrite(updateSession);
      const payload = {
        patientRecordId: selectedPatient.id,
        type: "EXAM_REQUEST",
        title,
        examItems: cleanItems,
        notes,
        cid: cid?.code || "",
        cidLabel: cid?.description || "",
      };
      const res = await fetch(
        effectiveEditingId
          ? `/api/professional/documents/${effectiveEditingId}`
          : "/api/professional/documents",
        {
          method: effectiveEditingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(
            effectiveEditingId
              ? { title, examItems: cleanItems, notes, cid: cid?.code || "" }
              : payload,
          ),
        },
      );
      if (res.ok) {
        const data = await res.json();
        if (userId) clearExamDraft(userId, portal);
        onSaved({
          kind: "exam",
          id: effectiveEditingId || data.id,
          patient: selectedPatient,
          label: title,
          examItems: cleanItems,
          examNotes: notes,
        });
      } else if (isAuthFailureStatus(res.status)) {
        setError(t("session.expiredOnSave"));
        redirectToLoginAfterAuthFailure();
      } else {
        const d = await res.json().catch(() => ({}));
        const errMsg = typeof d.error === "string"
          ? d.error
          : d.error?.formErrors?.[0] || t("rx.saveError");
        setError(errMsg);
      }
    } catch {
      setError(t("rx.saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-24">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-brand-500 font-medium">
        <ArrowLeft size={16} /> {t("rx.backToList")}
      </button>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("rx.examFormTitle")}</h1>
        <p className="text-slate-500 text-sm mt-1">{t("rx.examFormSubtitle")}</p>
      </div>

      {draftRestoredHint && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl px-4 py-3 text-sm text-brand-800">
          {t("rx.draftRestored")}
        </div>
      )}

      {(templateHint || reuseHint) && (
        <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 text-sm text-brand-700">
          {templateHint ? t("tmpl.templateAppliedHint") : t("rx.reuseHint")}
        </div>
      )}

      <PatientSearchCombobox
        t={t}
        ownCharts={charts}
        chartsLoading={chartsLoading}
        selectedPatient={selectedPatient}
        onSelectPatient={setSelectedPatient}
        lockPatient={effectiveLockPatient}
      />

      <Card title={t("rx2.addItem")} elevated={examSearchOpen}>
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder={t("rx.examDefaultTitle")} className="rx-inp mb-3" />
        <ExamSearchInput
          placeholder={t("rx.searchExam")}
          manualLabel={t("rx.addExamManual")}
          manualHint={t("rx.manualExamHint")}
          noResults={t("rx.examNoResults")}
          onAdd={addExam}
          onOpenChange={setExamSearchOpen}
        />
      </Card>

      <Card title={t("rx.examItems")} elevated={cidSearchOpen}>
        {items.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">{t("rx.noExamItems")}</p>
        ) : (
          <div className="space-y-2">
            {items.map((item, i) => {
              const parsed = parseExamItemLine(item);
              return (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-xs text-brand-500 font-bold w-5 pt-2.5">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    {parsed.code && (
                      <p className="text-[10px] font-semibold text-brand-600 mb-0.5">{parsed.code}</p>
                    )}
                    <input
                      value={parsed.name}
                      onChange={(e) => {
                        const next = [...items];
                        next[i] = formatExamItem({ code: parsed.code, name: e.target.value });
                        setItems(next);
                      }}
                      className="rx-inp-sm w-full"
                      placeholder={t("rx.examItemPlaceholder")}
                    />
                  </div>
                  <button onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-red-400 p-1 pt-2">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          <div className="sm:col-span-2">
            <CidSearchInput value={cid} onChange={setCid} onOpenChange={setCidSearchOpen} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-600 block mb-1">{t("rx.examNotes")}</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className="rx-inp-sm" placeholder={t("rx.examNotesPlaceholder")} />
          </div>
        </div>
      </Card>

      {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-3">{error}</p>}

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-30">
        <div className="max-w-3xl mx-auto flex gap-3">
          <button onClick={onBack} className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm">
            {t("rx2.cancel")}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-[2] py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            {saving ? t("rx2.saving") : t("rx.generateExam")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children, elevated }: { title: string; children: React.ReactNode; elevated?: boolean }) {
  return (
    <div className={`bg-white rounded-2xl border border-brand-100 shadow-sm p-5 space-y-3 ${elevated ? "relative z-50" : ""}`}>
      <label className="text-sm font-semibold text-slate-800">{title}</label>
      {children}
    </div>
  );
}
