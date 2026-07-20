"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { CheckCircle2, FileText, Loader2, UserPlus, X, XCircle } from "lucide-react";

type IncomingLink = {
  id: string;
  patientUserId: string;
  patientName: string;
  heldDocumentCount: number;
  createdAt: string;
};

type AcceptedFollowUp = {
  id: string;
  patientName: string;
  released: number;
  documentsUrl: string;
};

export default function ProfessionalIncomingLinkBanner() {
  const { t } = useI18n();
  const [links, setLinks] = useState<IncomingLink[]>([]);
  const [accepted, setAccepted] = useState<AcceptedFollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(
        "/api/professional/patient-links?status=PENDING&requestedBy=PATIENT",
      );
      if (res.ok) {
        const d = await res.json();
        setLinks(d.links || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function respond(link: IncomingLink, action: "accept" | "reject") {
    setActingId(link.id);
    try {
      const res = await fetch(`/api/professional/patient-links/${link.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) return;

      const data = await res.json();
      setLinks((prev) => prev.filter((l) => l.id !== link.id));

      if (
        action === "accept" &&
        typeof data.released === "number" &&
        data.released > 0 &&
        typeof data.documentsUrl === "string" &&
        data.documentsUrl
      ) {
        setAccepted((prev) => [
          {
            id: link.id,
            patientName: link.patientName,
            released: data.released,
            documentsUrl: data.documentsUrl,
          },
          ...prev,
        ]);
      }
    } finally {
      setActingId(null);
    }
  }

  function dismissAccepted(id: string) {
    setAccepted((prev) => prev.filter((a) => a.id !== id));
  }

  if (loading && links.length === 0 && accepted.length === 0) return null;
  if (links.length === 0 && accepted.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {accepted.map((item) => (
        <div
          key={`ok-${item.id}`}
          className="rounded-xl border border-brand-200 bg-brand-50/95 px-3 py-2.5 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center gap-2.5 shadow-sm"
        >
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} className="text-brand-700" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand-950 leading-snug">
                {t("proIncomingLink.acceptedTitle").replace("{{name}}", item.patientName)}
              </p>
              <p className="text-xs text-brand-800/90 mt-0.5 leading-snug">
                {item.released === 1
                  ? t("proIncomingLink.acceptedDescOne")
                  : t("proIncomingLink.acceptedDescMany").replace(
                      "{{count}}",
                      String(item.released),
                    )}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0 sm:pl-2">
            <Link
              href={item.documentsUrl}
              className="inline-flex items-center gap-1 text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 rounded-lg min-h-[36px]"
            >
              <FileText size={14} /> {t("proIncomingLink.viewDocuments")}
            </Link>
            <button
              type="button"
              onClick={() => dismissAccepted(item.id)}
              className="inline-flex items-center justify-center text-slate-500 hover:text-slate-700 border border-slate-200 bg-white rounded-lg px-2 min-h-[36px] min-w-[36px]"
              aria-label={t("common.cancel")}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}

      {links.map((link) => (
        <div
          key={link.id}
          className="rounded-xl border border-amber-200 bg-amber-50/95 px-3 py-2.5 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center gap-2.5 shadow-sm"
        >
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <UserPlus size={16} className="text-amber-700" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-950 leading-snug">
                {t("proIncomingLink.title").replace("{{name}}", link.patientName)}
              </p>
              <p className="text-xs text-amber-800/90 mt-0.5 leading-snug">
                {link.heldDocumentCount > 0
                  ? t("proIncomingLink.descWithDocs").replace(
                      "{{count}}",
                      String(link.heldDocumentCount),
                    )
                  : t("proIncomingLink.desc")}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0 sm:pl-2">
            <button
              type="button"
              disabled={actingId === link.id}
              onClick={() => respond(link, "accept")}
              className="inline-flex items-center gap-1 text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50 min-h-[36px]"
            >
              {actingId === link.id ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              {t("proIncomingLink.accept")}
            </button>
            <button
              type="button"
              disabled={actingId === link.id}
              onClick={() => respond(link, "reject")}
              className="inline-flex items-center gap-1 text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 px-3 py-1.5 rounded-lg disabled:opacity-50 min-h-[36px]"
            >
              <XCircle size={14} /> {t("proIncomingLink.reject")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
