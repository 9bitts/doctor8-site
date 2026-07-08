"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { psychologistHubHref } from "@/lib/psychologist-portal";
import {
  ArrowLeft, ClipboardPlus, Copy, CheckCircle2, Loader2, Link2, User, Search,
} from "lucide-react";
import NoPatientChartsEmptyState from "@/components/professional/NoPatientChartsEmptyState";

interface Chart { id: string; firstName: string; lastName: string; }
interface Invite {
  id: string; url: string; status: string; patientName: string;
  expiresAt: string; completedAt: string | null;
}

export default function PsychologyAnamnesisClient() {
  const { t } = useI18n();
  const pathname = usePathname();
  const hubHref = psychologistHubHref(pathname);

  const [invites, setInvites] = useState<Invite[]>([]);
  const [charts, setCharts] = useState<Chart[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Chart | null>(null);
  const [patientQuery, setPatientQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [aRes, cRes] = await Promise.all([
          fetch("/api/professional/psychology/anamnesis"),
          fetch("/api/professional/records"),
        ]);
        const aData = await aRes.json();
        const cData = await cRes.json();
        setInvites(aData.invites || []);
        setCharts(cData.records || []);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const filtered = patientQuery.trim()
    ? charts.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(patientQuery.toLowerCase()))
    : charts.slice(0, 8);

  async function createLink() {
    if (!selectedPatient) { setError(t("psy.anamnesis.needPatient")); return; }
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/professional/psychology/anamnesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientRecordId: selectedPatient.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(t("psy.anamnesis.createError")); return; }
      setInvites((prev) => [{
        id: data.id,
        url: data.url,
        status: "PENDING",
        patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
        expiresAt: data.expiresAt,
        completedAt: null,
      }, ...prev]);
      setSelectedPatient(null);
      await navigator.clipboard.writeText(data.url);
      setCopied(data.id);
      setTimeout(() => setCopied(null), 2500);
    } finally { setCreating(false); }
  }

  async function copyUrl(id: string, url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      <div>
        <Link href={hubHref} className="flex items-center gap-2 text-sm text-slate-500 hover:text-violet-600 font-medium mb-2">
          <ArrowLeft size={16} /> {t("psy.backToHub")}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ClipboardPlus size={24} className="text-violet-600" />
          {t("psy.mod.anamnesis.title")}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{t("psy.mod.anamnesis.desc")}</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h2 className="font-semibold text-slate-800">{t("psy.anamnesis.newLink")}</h2>
        {selectedPatient ? (
          <div className="flex items-center gap-3 bg-violet-50 border border-violet-100 rounded-xl p-3">
            <span className="font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</span>
            <button type="button" onClick={() => setSelectedPatient(null)} className="text-xs text-slate-500 ml-auto">
              {t("common.cancel")}
            </button>
          </div>
        ) : (
          <>
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="animate-spin text-violet-500" size={20} />
              </div>
            ) : charts.length === 0 ? (
              <NoPatientChartsEmptyState variant="violet" compact />
            ) : (
              <>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={patientQuery}
                    onChange={(e) => setPatientQuery(e.target.value)}
                    placeholder={t("psy.sessions.searchPatient")}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <p className="text-sm text-slate-500 py-2 text-center">{t("pat.searchEmpty")}</p>
                  ) : filtered.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedPatient(c)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-violet-50 text-left text-sm"
                    >
                      <User size={14} className="text-slate-400" /> {c.firstName} {c.lastName}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button
          type="button"
          onClick={createLink}
          disabled={creating || !selectedPatient}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
        >
          {creating ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
          {t("psy.anamnesis.generate")}
        </button>
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold text-slate-800">{t("psy.anamnesis.links")}</h2>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-violet-500" /></div>
        ) : invites.length === 0 ? (
          <p className="text-sm text-slate-500">{t("psy.anamnesis.empty")}</p>
        ) : invites.map((inv) => (
          <div key={inv.id} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-3 justify-between">
            <div>
              <p className="font-medium text-slate-800">{inv.patientName}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {inv.status === "COMPLETED" ? t("psy.anamnesis.statusDone") : inv.status === "EXPIRED" ? t("psy.anamnesis.statusExpired") : t("psy.anamnesis.statusPending")}
              </p>
            </div>
            {inv.status === "PENDING" && (
              <button
                type="button"
                onClick={() => copyUrl(inv.id, inv.url)}
                className="inline-flex items-center gap-1.5 text-xs font-medium border border-slate-200 px-3 py-1.5 rounded-lg"
              >
                {copied === inv.id ? <CheckCircle2 size={14} className="text-violet-600" /> : <Copy size={14} />}
                {copied === inv.id ? t("psy.anamnesis.copied") : t("psy.anamnesis.copy")}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
