"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Heart, Loader2, CheckCircle2, XCircle, Mail, FileText, AlertTriangle, Pause, Play,
} from "lucide-react";
import AdminViewPhoneButton from "@/components/admin/AdminViewPhoneButton";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";

interface AngelRow {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  emailVerified: boolean;
  profession: string | null;
  volunteerHelp: string | null;
  languages: string[];
  motivation: string | null;
  preferredCampaignSlug: string | null;
  approvalStatus: string;
  licenseDocCount: number;
  enrollmentActive: boolean;
  createdAt: string;
}

interface EscalationRow {
  id: string;
  patientUserId: string;
  patientName: string;
  priority: string | null;
  triageFlagLabels: string[];
  angelName: string;
  contactedAt: string;
  campaignName: string;
}

export default function HumanitarianAngelsAdminPanel() {
  const { lang, t } = useI18n();
  const locale = localeOf(lang);
  const [angels, setAngels] = useState<AngelRow[]>([]);
  const [escalations, setEscalations] = useState<EscalationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [docsBusyId, setDocsBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [angelsRes, escRes] = await Promise.all([
        fetch("/api/admin/humanitarian/angels"),
        fetch("/api/admin/humanitarian/angels/escalations"),
      ]);
      const angelsData = await angelsRes.json();
      const escData = await escRes.json();
      if (angelsRes.ok) setAngels(angelsData.angels || []);
      if (escRes.ok) setEscalations(escData.escalations || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(
    userId: string,
    action: "approve" | "reject" | "pause" | "reactivate",
  ) {
    setActing(userId);
    try {
      await fetch("/api/admin/humanitarian/angels", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      await load();
    } catch { /* ignore */ }
    setActing(null);
  }

  async function resolveEscalation(followUpId: string) {
    setResolvingId(followUpId);
    try {
      await fetch("/api/admin/humanitarian/angels/escalations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followUpId }),
      });
      await load();
    } catch { /* ignore */ }
    setResolvingId(null);
  }

  async function viewLicenseDocs(userId: string) {
    setDocsBusyId(userId);
    try {
      const res = await fetch(`/api/admin/providers/${userId}/license-documents`);
      const data = await res.json();
      if (!res.ok) {
        alert(t("admin.providers.docsLoadFail"));
        return;
      }
      const docs = data.documents || [];
      if (!docs.length) {
        alert(t("admin.providers.docsEmpty"));
        return;
      }
      for (const doc of docs) {
        if (doc.viewUrl) window.open(doc.viewUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      alert(t("admin.providers.docsLoadFail"));
    }
    setDocsBusyId(null);
  }

  const pending = angels.filter((a) => a.approvalStatus === "PENDING");

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
      </div>
    );
  }

  return (
    <div className="mt-8 border-t border-slate-200 pt-8 space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-900">{t("admin.providers.escalationsTitle")}</h2>
          {escalations.length > 0 && (
            <span className="text-xs font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
              {escalations.length}
            </span>
          )}
        </div>
        {escalations.length === 0 ? (
          <p className="text-sm text-slate-500">{t("admin.providers.escalationsEmpty")}</p>
        ) : (
          <div className="space-y-2">
            {escalations.map((e) => (
              <div
                key={e.id}
                className="border border-amber-200 rounded-xl p-3 bg-amber-50/50 flex flex-wrap items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{e.patientName}</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {e.priority || "ROUTINE"} · {e.campaignName} · {e.angelName}
                  </p>
                  {e.triageFlagLabels.length > 0 && (
                    <p className="text-xs text-slate-500 mt-1">{e.triageFlagLabels.join(" · ")}</p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1">
                    {new Date(e.contactedAt).toLocaleString(locale)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={resolvingId === e.id}
                  onClick={() => resolveEscalation(e.id)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white disabled:opacity-50"
                >
                  {resolvingId === e.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    t("admin.providers.escalationResolve")
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-5 h-5 text-rose-500" />
          <h2 className="text-lg font-bold text-slate-900">
            {t("admin.providers.tab.anjos")} — {t("admin.providers.angelSectionSubtitle")}
          </h2>
          {pending.length > 0 && (
            <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
              {pending.length} {t("admin.providers.angelPending").toLowerCase()}
            </span>
          )}
        </div>

        {angels.length === 0 ? (
          <p className="text-sm text-slate-500">{t("admin.providers.emptyAngels")}</p>
        ) : (
          <div className="space-y-3">
            {angels.map((a) => (
              <div key={a.userId} className="border border-slate-200 rounded-xl p-4 bg-white">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
                      {a.firstName} {a.lastName}
                    </p>
                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                      <Mail className="w-3.5 h-3.5" />
                      {a.email}
                      {!a.emailVerified && (
                        <span className="text-amber-600 text-xs font-medium">
                          {t("admin.providers.emailUnverified")}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {t("admin.providers.languages")} {a.languages.join(", ").toUpperCase()} ·{" "}
                      {new Date(a.createdAt).toLocaleDateString(locale)}
                    </p>
                    {a.profession && (
                      <p className="text-xs text-slate-600 mt-1">
                        <span className="font-medium text-slate-500">
                          {t("admin.providers.angelProfession")}
                        </span>{" "}
                        {a.profession}
                      </p>
                    )}
                    {a.volunteerHelp && (
                      <p className="text-xs text-slate-600 mt-2 bg-slate-50 rounded-lg p-2">
                        <span className="font-medium text-slate-500 block mb-0.5">
                          {t("admin.providers.angelVolunteerHelp")}
                        </span>
                        {a.volunteerHelp}
                      </p>
                    )}
                    {a.motivation && (
                      <p className="text-xs text-slate-600 mt-2 bg-slate-50 rounded-lg p-2">
                        <span className="font-medium text-slate-500 block mb-0.5">
                          {t("admin.providers.angelMotivation")}
                        </span>
                        {a.motivation}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <AdminViewPhoneButton userId={a.userId} />
                    {a.licenseDocCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => viewLicenseDocs(a.userId)}
                        disabled={docsBusyId === a.userId}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
                      >
                        {docsBusyId === a.userId ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <FileText size={14} />
                        )}
                        {t("admin.providers.viewDocs").replace("{{n}}", String(a.licenseDocCount))}
                      </button>
                    ) : (
                      <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-1 rounded-lg text-center">
                        {t("admin.providers.angelNoCertificate")}
                      </span>
                    )}
                    {a.approvalStatus === "PENDING" && (
                      <div className="flex gap-2">
                        <button
                          disabled={acting === a.userId || !a.emailVerified}
                          onClick={() => act(a.userId, "approve")}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold disabled:opacity-40"
                        >
                          {acting === a.userId ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          {t("admin.providers.approve")}
                        </button>
                        <button
                          disabled={acting === a.userId}
                          onClick={() => act(a.userId, "reject")}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold"
                        >
                          <XCircle className="w-3.5 h-3.5" /> {t("admin.providers.reject")}
                        </button>
                      </div>
                    )}
                    {a.approvalStatus === "APPROVED" && a.enrollmentActive && (
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-center">
                        {t("admin.providers.angelApproved")}
                      </span>
                    )}
                    {a.approvalStatus === "APPROVED" && !a.enrollmentActive && (
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-full text-center">
                        {t("admin.providers.angelPaused")}
                      </span>
                    )}
                    {a.approvalStatus === "APPROVED" && (
                      <button
                        type="button"
                        disabled={acting === a.userId}
                        onClick={() => act(a.userId, a.enrollmentActive ? "pause" : "reactivate")}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold"
                      >
                        {acting === a.userId ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : a.enrollmentActive ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5" />
                        )}
                        {a.enrollmentActive
                          ? t("admin.providers.angelPause")
                          : t("admin.providers.angelReactivate")}
                      </button>
                    )}
                    {a.approvalStatus === "REJECTED" && (
                      <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full text-center">
                        {t("admin.providers.angelRejected")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
