"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardList, Loader2, User } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf, type Lang } from "@/lib/i18n/translations";
import type { NaturalMedicinePracticeConfig } from "@/lib/natural-medicine/config";

interface SessionNote {
  id: string;
  title: string;
  body: string;
  practiceSlug: string | null;
  createdAt: string;
  integrativeClientRecordId: string | null;
  clientName: string;
  shared: boolean;
}

interface PicsSessionsListProps {
  practice: NaturalMedicinePracticeConfig;
  backHref: string;
}

export default function PicsSessionsList({ practice, backHref }: PicsSessionsListProps) {
  const { t, lang } = useI18n();
  const locale = localeOf(lang as Lang);
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/integrative-therapist/session-notes");
        const data = await res.json();
        const filtered = (data.notes || []).filter(
          (n: SessionNote) => n.practiceSlug === practice.practiceSlug,
        );
        setNotes(filtered);
      } catch {
        setNotes([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [practice.practiceSlug]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-700 transition"
      >
        <ArrowLeft size={16} />
        {t("nm.sessions.back")}
      </Link>

      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${practice.color}`}>
          <ClipboardList size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("nm.sessions.title")}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {t(practice.hubTitleKey)} · {t("nm.sessions.subtitle")}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-emerald-500" />
        </div>
      ) : notes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
          <p className="text-slate-500 text-sm">{t("nm.sessions.empty")}</p>
          <Link
            href="/integrative-therapist/clients"
            className="inline-flex text-sm font-bold text-emerald-600 hover:text-emerald-800"
          >
            {t("nm.sessions.emptyAction")} →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {notes.map((note) => (
            <div key={note.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 text-sm flex items-center gap-1.5">
                    <User size={14} className="text-slate-400 shrink-0" />
                    {note.clientName}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(note.createdAt).toLocaleDateString(locale, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  {note.body && note.body !== "(structured)" && (
                    <p className="text-sm text-slate-600 mt-2 line-clamp-3 whitespace-pre-wrap">
                      {note.body}
                    </p>
                  )}
                </div>
                {note.shared && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                    {t("nm.sessions.shared")}
                  </span>
                )}
              </div>
              {note.integrativeClientRecordId && (
                <Link
                  href={`/integrative-therapist/clients/${note.integrativeClientRecordId}`}
                  className="inline-flex mt-2 text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                >
                  {t("nm.sessions.viewClient")} →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
