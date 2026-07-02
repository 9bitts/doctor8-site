"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  Globe, Eye, EyeOff, Loader2, CheckCircle2, Circle, Clock, AlertCircle, ExternalLink,
} from "lucide-react";

type SectionStatus = {
  identity: boolean;
  credentials: boolean;
  consultation: boolean;
  availability: boolean;
  digitalSign: boolean;
  doctorConnection: boolean;
  canGoPublic: boolean;
  isPublic: boolean;
  verified: boolean;
};

type ListingInfo = {
  slug: string;
  isPublic: boolean;
  publicUrl: string | null;
  shortUrl: string;
  status: "pending_approval" | "hidden" | "live";
  verified: boolean;
};

export type PublicProfileActivationProps = {
  apiPath?: string;
  onStatusChange?: () => void;
};

export default function PublicProfileActivation({
  apiPath = "/api/professional/public-profile",
  onStatusChange,
}: PublicProfileActivationProps) {
  const { t } = useI18n();
  const [sections, setSections] = useState<SectionStatus | null>(null);
  const [listing, setListing] = useState<ListingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [sectionsRes, listingRes] = await Promise.all([
        fetch("/api/professional/profile-sections-status"),
        fetch(apiPath),
      ]);
      if (sectionsRes.ok) setSections(await sectionsRes.json());
      if (listingRes.ok) setListing(await listingRes.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [apiPath]);

  useEffect(() => {
    load();
  }, [load]);

  async function togglePublic() {
    if (!listing || !sections) return;
    if (!sections.canGoPublic && !listing.isPublic) {
      setError(t("set.activatePublicBlocked"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(apiPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !listing.isPublic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("pub.errGeneric"));
      setListing((prev) => (prev ? { ...prev, ...data } : prev));
      setSections((prev) => (prev ? { ...prev, isPublic: data.isPublic } : prev));
      onStatusChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("pub.errGeneric"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-2 text-slate-400 text-sm">
        <Loader2 size={16} className="animate-spin" /> {t("common.loading")}
      </div>
    );
  }

  if (!sections || !listing) return null;

  const requirements = [
    { key: "credentials", done: sections.credentials, label: t("set.reqCredentials") },
    { key: "consultation", done: sections.consultation, label: t("set.reqConsultation") },
    { key: "availability", done: sections.availability, label: t("set.reqAvailability") },
  ];

  const allReqsDone = requirements.every((r) => r.done);
  const toggleDisabled = saving || (!listing.verified && !listing.isPublic) || (!allReqsDone && !listing.isPublic);

  return (
    <div className="bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-200 shadow-sm p-5 space-y-4 sticky top-4 z-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <Globe size={20} className="text-brand-500" /> {t("set.activatePublicTitle")}
          </h2>
          <p className="text-sm text-slate-500 mt-1">{t("set.activatePublicHint")}</p>
        </div>
        {listing.status === "live" && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-brand-50 text-brand-600 border-brand-200 shrink-0">
            {t("pub.status.live")}
          </span>
        )}
      </div>

      {!listing.verified && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-800">
          <Clock size={16} className="shrink-0 mt-0.5" />
          <p>{t("pub.pendingHint")}</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <ul className="space-y-2">
        {requirements.map((req) => (
          <li key={req.key} className="flex items-center gap-2 text-sm">
            {req.done ? (
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            ) : (
              <Circle size={16} className="text-slate-300 shrink-0" />
            )}
            <span className={req.done ? "text-slate-600" : "text-slate-500"}>{req.label}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-4 pt-1">
        <button
          type="button"
          onClick={togglePublic}
          disabled={toggleDisabled}
          className={`relative inline-flex h-8 w-14 shrink-0 rounded-full transition disabled:opacity-50 ${
            listing.isPublic && listing.verified ? "bg-brand-500" : "bg-slate-200"
          }`}
          aria-label={t("set.activatePublicTitle")}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition mt-1 ${
              listing.isPublic && listing.verified ? "translate-x-7" : "translate-x-1"
            }`}
          />
        </button>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
          {listing.isPublic ? (
            <Eye size={18} className="text-brand-500" />
          ) : (
            <EyeOff size={18} className="text-slate-400" />
          )}
          {t("set.activatePublicToggle")}
        </div>
        {saving && <Loader2 size={16} className="animate-spin text-brand-500 ml-auto" />}
      </div>

      {listing.isPublic && listing.publicUrl && listing.status === "live" && (
        <Link
          href={listing.publicUrl}
          target="_blank"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          {t("set.viewPublicProfile")} <ExternalLink size={14} />
        </Link>
      )}

      {!allReqsDone && !listing.isPublic && (
        <p className="text-xs text-slate-500">{t("set.activatePublicBlocked")}</p>
      )}
    </div>
  );
}
