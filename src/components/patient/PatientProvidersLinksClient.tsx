"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Loader2, UserPlus, CheckCircle2, XCircle, ShieldOff } from "lucide-react";

type LinkRow = {
  id: string;
  status: "PENDING" | "ACCEPTED";
  createdAt: string;
  professionalUserId: string;
  name: string;
  licenseNumber: string | null;
  specialty: string | null;
};

export default function PatientProvidersLinksClient() {
  const { t } = useI18n();
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/patient/professional-links");
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

  async function respond(id: string, action: "accept" | "reject") {
    setActingId(id);
    try {
      const res = await fetch(`/api/patient/professional-links/${id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) await load();
    } finally {
      setActingId(null);
    }
  }

  async function revoke(id: string) {
    setActingId(id);
    try {
      const res = await fetch(`/api/patient/professional-links/${id}/revoke`, {
        method: "POST",
      });
      if (res.ok) await load();
    } finally {
      setActingId(null);
    }
  }

  const pending = links.filter((l) => l.status === "PENDING");
  const accepted = links.filter((l) => l.status === "ACCEPTED");

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="animate-spin text-slate-400" size={22} />
      </div>
    );
  }

  if (pending.length === 0 && accepted.length === 0) return null;

  return (
    <div className="space-y-4 mb-8">
      {pending.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:p-5">
          <h2 className="text-sm font-bold text-amber-900 flex items-center gap-2 mb-3">
            <UserPlus size={16} /> {t("providers.linkRequests.title")}
          </h2>
          <ul className="space-y-3">
            {pending.map((link) => (
              <li
                key={link.id}
                className="rounded-xl border border-amber-100 bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm">{link.name}</p>
                  {link.licenseNumber && (
                    <p className="text-xs text-slate-500">{link.licenseNumber}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">{t("providers.linkRequests.desc")}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={actingId === link.id}
                    onClick={() => respond(link.id, "accept")}
                    className="inline-flex items-center gap-1 text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white px-3 py-2 rounded-lg disabled:opacity-50 min-h-[44px]"
                  >
                    {actingId === link.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    {t("providers.linkRequests.accept")}
                  </button>
                  <button
                    type="button"
                    disabled={actingId === link.id}
                    onClick={() => respond(link.id, "reject")}
                    className="inline-flex items-center gap-1 text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-2 rounded-lg disabled:opacity-50 min-h-[44px]"
                  >
                    <XCircle size={14} /> {t("providers.linkRequests.reject")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {accepted.length > 0 && (
        <section className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-3">{t("providers.connected.title")}</h2>
          <ul className="space-y-2">
            {accepted.map((link) => (
              <li
                key={link.id}
                className="flex items-center justify-between gap-3 py-2 border-b border-slate-50 last:border-0"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 text-sm truncate">{link.name}</p>
                  {link.specialty && (
                    <p className="text-xs text-slate-500 truncate">{link.specialty}</p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={actingId === link.id}
                  onClick={() => revoke(link.id)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 shrink-0 min-h-[44px] px-2"
                >
                  {actingId === link.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <ShieldOff size={14} />
                  )}
                  {t("providers.connected.revoke")}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
