"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check, Copy, FileCheck, FlaskConical, Link2, Loader2, Mail, MessageCircle, Paperclip, Plus, X,
} from "lucide-react";
import { openUrlAfterAsync } from "@/lib/open-url-safely";
import { copyTextToClipboard } from "@/lib/clipboard";
import { localeOf, type Lang } from "@/lib/i18n/translations";
import { useUserTimeZone } from "@/hooks/useUserTimeZone";
import { formatShortDateWithYear } from "@/lib/timezone";
import { waPhoneDigits } from "@/lib/wa-phone";

export type PatientExamResultItem = {
  id: string;
  title: string;
  content: string | null;
  hasFile: boolean;
  attachmentCount?: number;
  createdAt: string;
};

type InviteCreated = {
  url: string;
  pin: string;
  expiresAt: string;
  emailSent: boolean;
  patientEmail: string | null;
};

export default function PatientExamResultsModal({
  results,
  requestExamHref,
  messageHref,
  chartId,
  patientName,
  patientPhone,
  patientCountry,
  patientEmail,
  lang,
  t,
  onClose,
  onRegisterManually,
  onOpenResult,
}: {
  results: PatientExamResultItem[];
  requestExamHref: string;
  /** In-app messages deep link when patient has a Doctor8 account. */
  messageHref?: string | null;
  chartId: string;
  patientName: string;
  patientPhone?: string | null;
  patientCountry?: string | null;
  patientEmail?: string | null;
  lang: Lang;
  t: (k: string) => string;
  onClose: () => void;
  onRegisterManually: () => void;
  onOpenResult: (id: string) => void;
}) {
  const userTz = useUserTimeZone();
  const locale = localeOf(lang);
  const empty = results.length === 0;
  const phoneDigits = patientPhone ? waPhoneDigits(patientPhone, patientCountry) : "";

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteCreated | null>(null);
  const [sendEmail, setSendEmail] = useState(!!patientEmail);
  const [copied, setCopied] = useState<"url" | "pin" | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  async function openFirstFile(docId: string) {
    try {
      await openUrlAfterAsync(async () => {
        const res = await fetch(`/api/professional/documents/${docId}/files`, {
          credentials: "same-origin",
        });
        const data = await res.json();
        if (!res.ok) return null;
        const first = (data.files || [])[0] as { url?: string } | undefined;
        if (!first?.url) return null;
        if (first.url.startsWith("/api/")) {
          const fileRes = await fetch(first.url, { credentials: "same-origin" });
          if (!fileRes.ok) return null;
          const blob = await fileRes.blob();
          return URL.createObjectURL(blob);
        }
        return first.url;
      });
    } catch {
      /* ignore — blank tab closed by helper */
    }
  }

  async function createInvite() {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/professional/exam-result-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          patientRecordId: chartId,
          sendEmail: sendEmail && !!patientEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(t("examResults.requestCreateError"));
        return;
      }
      setInvite({
        url: data.url,
        pin: data.pin,
        expiresAt: data.expiresAt,
        emailSent: !!data.emailSent,
        patientEmail: data.patientEmail,
      });
    } catch {
      setCreateError(t("examResults.requestCreateError"));
    } finally {
      setCreating(false);
    }
  }

  async function copyText(kind: "url" | "pin", value: string) {
    setCopyError(null);
    const ok = await copyTextToClipboard(value);
    if (ok) {
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } else {
      setCopyError(t("examResults.copyFailed"));
    }
  }

  function openWhatsAppInvite() {
    if (!invite) return;
    const msg = t("examResults.whatsappTemplate")
      .replace(/\{\{name\}\}/g, patientName)
      .replace(/\{\{link\}\}/g, invite.url)
      .replace(/\{\{pin\}\}/g, invite.pin);
    const base = phoneDigits ? `https://wa.me/${phoneDigits}` : "https://wa.me/";
    window.open(`${base}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  }

  function openWhatsAppSchedule() {
    const appBase = (process.env.NEXT_PUBLIC_APP_URL || "https://app.doctor8.org").replace(/\/$/, "");
    const registerLink = `${appBase}/register`;
    const msg = t("examResults.scheduleWhatsappTemplate")
      .replace(/\{\{name\}\}/g, patientName)
      .replace(/\{\{registerLink\}\}/g, registerLink);
    const base = phoneDigits ? `https://wa.me/${phoneDigits}` : "https://wa.me/";
    window.open(`${base}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="exam-results-modal-title"
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90dvh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <h2 id="exam-results-modal-title" className="font-bold text-slate-800 flex items-center gap-2">
            <FileCheck size={18} className="text-accent-500" />
            {t("examResults.modalTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {invite ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">{t("examResults.requestReady")}</p>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                    {t("examResults.linkLabel")}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-700 break-all flex-1">{invite.url}</p>
                    <button
                      type="button"
                      onClick={() => void copyText("url", invite.url)}
                      className="shrink-0 p-2 rounded-lg border border-slate-200 hover:bg-white text-slate-600"
                    >
                      {copied === "url" ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                    {t("examResults.pinLabel")}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold tracking-widest text-accent-600">{invite.pin}</p>
                    <button
                      type="button"
                      onClick={() => void copyText("pin", invite.pin)}
                      className="shrink-0 p-2 rounded-lg border border-slate-200 hover:bg-white text-slate-600"
                    >
                      {copied === "pin" ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-700 mt-1">{t("examResults.pinOnceHint")}</p>
                </div>
                {invite.emailSent && (
                  <p className="text-xs text-emerald-700 inline-flex items-center gap-1">
                    <Mail size={12} /> {t("examResults.emailSent")}
                  </p>
                )}
                {copyError && (
                  <p className="text-xs text-rose-600">{copyError}</p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={openWhatsAppInvite}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold text-sm"
                >
                  <MessageCircle size={16} /> {t("examResults.sendWhatsApp")}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50"
                >
                  {t("examResults.dismiss")}
                </button>
              </div>
            </div>
          ) : (
            <>
              {empty ? (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {t("examResults.empty")}
                  </p>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {t("examResults.requestPriorHint")}
                  </p>
                  {patientEmail && (
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={sendEmail}
                        onChange={(e) => setSendEmail(e.target.checked)}
                        className="rounded border-slate-300"
                      />
                      {t("examResults.sendEmailToo").replace("{{email}}", patientEmail)}
                    </label>
                  )}
                  {createError && (
                    <p className="text-sm text-rose-600">{createError}</p>
                  )}
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => void createInvite()}
                      disabled={creating}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-600 text-white font-semibold text-sm disabled:opacity-50"
                    >
                      {creating ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                      {t("examResults.requestPrior")}
                    </button>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Link
                        href={requestExamHref}
                        className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition"
                      >
                        {t("examResults.requestAgain")}
                      </Link>
                      <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50"
                      >
                        {t("examResults.dismiss")}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <ul className="space-y-3">
                    {results.map((r) => {
                      const attachCount = r.attachmentCount ?? (r.hasFile ? 1 : 0);
                      return (
                        <li
                          key={r.id}
                          className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 text-sm truncate">{r.title}</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {formatShortDateWithYear(new Date(r.createdAt), userTz, locale)}
                                <span className="ml-1.5 text-accent-600">{t("examResults.patientSent")}</span>
                              </p>
                              {r.content && (
                                <p className="text-xs text-slate-600 mt-1.5 whitespace-pre-wrap line-clamp-3">
                                  {r.content}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => onOpenResult(r.id)}
                                className="text-xs font-semibold text-brand-600 hover:text-brand-700 px-2 py-1 rounded-lg hover:bg-brand-50"
                              >
                                {t("examResults.openInChart")}
                              </button>
                              {attachCount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => void openFirstFile(r.id)}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-accent-600 hover:text-accent-700 px-2 py-1 rounded-lg hover:bg-accent-50"
                                >
                                  <Paperclip size={12} /> {t("examResults.viewFile")}
                                </button>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {t("examResults.nextSteps")}
                    </p>
                    <Link
                      href={requestExamHref}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition"
                    >
                      <FlaskConical size={16} /> {t("examResults.orderNewExams")}
                    </Link>
                    {messageHref ? (
                      <Link
                        href={messageHref}
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-600 text-white font-semibold text-sm transition"
                      >
                        <MessageCircle size={16} /> {t("examResults.messageToSchedule")}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={openWhatsAppSchedule}
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-600 text-white font-semibold text-sm"
                      >
                        <MessageCircle size={16} /> {t("examResults.messageToSchedule")}
                      </button>
                    )}
                    {!messageHref && !phoneDigits && (
                      <p className="text-[11px] text-amber-700">{t("examResults.scheduleNeedsContact")}</p>
                    )}
                  </div>

                  <div className="pt-1 space-y-2">
                    {patientEmail && (
                      <label className="flex items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={sendEmail}
                          onChange={(e) => setSendEmail(e.target.checked)}
                          className="rounded border-slate-300"
                        />
                        {t("examResults.sendEmailToo").replace("{{email}}", patientEmail)}
                      </label>
                    )}
                    {createError && (
                      <p className="text-sm text-rose-600">{createError}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => void createInvite()}
                      disabled={creating}
                      className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-semibold text-sm disabled:opacity-50"
                    >
                      {creating ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                      {t("examResults.requestPrior")}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {!invite && (
          <div className="px-5 py-4 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onRegisterManually}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-accent-100 text-accent-700 bg-accent-50 hover:bg-accent-100 font-semibold text-sm transition"
            >
              <Plus size={16} /> {t("examResults.registerManually")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
