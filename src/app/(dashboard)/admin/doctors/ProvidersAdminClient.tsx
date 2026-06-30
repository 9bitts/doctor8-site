"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Stethoscope,
  Loader2,
  CheckCircle2,
  XCircle,
  Search,
  Globe,
  ExternalLink,
  FileText,
  Brain,
  Apple,
  Activity,
  Leaf,
  Heart,
  Users,
  Mail,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import type { TranslationKey } from "@/lib/i18n/translations";
import { getProfessionLabel, specialtyMatchesSearch } from "@/lib/professions";
import {
  ADMIN_PROVIDER_TABS,
  type AdminProviderTab,
} from "@/lib/admin-provider-categories";
import AdminViewPhoneButton from "@/components/admin/AdminViewPhoneButton";

interface ProfessionalRow {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  region: string | null;
  specialty: string;
  licenseNumber: string;
  licenseCountry: string;
  verified: boolean;
  emailVerified: boolean;
  appointments: number;
  charts: number;
  publicUrl: string | null;
  isPublic: boolean;
  licenseDocCount: number;
}

interface ProviderRow {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  region: string | null;
  subtitle: string;
  verified: boolean;
  emailVerified: boolean;
  appointments: number;
  charts: number;
  publicUrl: string | null;
  isPublic: boolean;
  licenseDocCount: number;
}

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
  approvalStatus: string;
  licenseDocCount: number;
  hasPhone: boolean;
  createdAt: string;
}

const TAB_ICONS: Partial<Record<AdminProviderTab, React.ReactNode>> = {
  medicos: <Stethoscope size={14} />,
  psicologos: <Brain size={14} />,
  nutricionistas: <Apple size={14} />,
  fisioterapeutas: <Activity size={14} />,
  psicanalistas: <Brain size={14} />,
  terapeutas: <Leaf size={14} />,
  anjos: <Heart size={14} />,
  outros: <Users size={14} />,
};

function providerTabLabel(tab: AdminProviderTab, t: (key: TranslationKey | string) => string): string {
  return t(`admin.providers.tab.${tab}`);
}

export default function ProvidersAdminClient() {
  const { lang, t } = useI18n();
  const locale = localeOf(lang);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as AdminProviderTab | null;
  const activeTab: AdminProviderTab =
    tabParam && ADMIN_PROVIDER_TABS.some((t) => t.id === tabParam) ? tabParam : "medicos";

  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [docsBusyId, setDocsBusyId] = useState<string | null>(null);
  const [actingAngel, setActingAngel] = useState<string | null>(null);
  const [verifyingEmailUserId, setVerifyingEmailUserId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const [professionals, setProfessionals] = useState<ProfessionalRow[]>([]);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [angels, setAngels] = useState<AngelRow[]>([]);

  const setTab = (tab: AdminProviderTab) => {
    router.replace(`/admin/doctors?tab=${tab}`, { scroll: false });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "anjos") {
        const res = await fetch("/api/admin/humanitarian/angels");
        const data = await res.json();
        if (res.ok) setAngels(data.angels || []);
        setProfessionals([]);
        setProviders([]);
      } else if (activeTab === "psicanalistas") {
        const res = await fetch("/api/admin/psychoanalysts");
        const data = await res.json();
        if (res.ok) setProviders(data.providers || []);
        setProfessionals([]);
        setAngels([]);
      } else if (activeTab === "terapeutas") {
        const res = await fetch("/api/admin/integrative-therapists");
        const data = await res.json();
        if (res.ok) setProviders(data.providers || []);
        setProfessionals([]);
        setAngels([]);
      } else {
        const res = await fetch(`/api/admin/doctors?category=${activeTab}`);
        const data = await res.json();
        if (res.ok) setProfessionals(data.doctors || []);
        setProviders([]);
        setAngels([]);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [activeTab]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleProfessionalVerified(row: ProfessionalRow) {
    setBusyId(row.id);
    try {
      await fetch(`/api/admin/doctors/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: !row.verified }),
      });
      await load();
    } catch {
      /* ignore */
    }
    setBusyId(null);
  }

  async function toggleProviderVerified(
    row: ProviderRow,
    kind: "psychoanalyst" | "integrative",
  ) {
    setBusyId(row.id);
    const base =
      kind === "psychoanalyst" ? "/api/admin/psychoanalysts" : "/api/admin/integrative-therapists";
    try {
      await fetch(`${base}/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: !row.verified }),
      });
      await load();
    } catch {
      /* ignore */
    }
    setBusyId(null);
  }

  async function viewLicenseDocs(userId: string) {
    setDocsBusyId(userId);
    try {
      const res = await fetch(`/api/admin/providers/${userId}/license-documents`);
      const data = await res.json();
      if (!res.ok || !data.documents?.length) {
        alert(data.documents?.length === 0 ? t("admin.providers.docsEmpty") : t("admin.providers.docsLoadFail"));
        return;
      }
      for (const doc of data.documents) {
        if (doc.viewUrl) window.open(doc.viewUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      alert(t("admin.providers.docsLoadFail"));
    }
    setDocsBusyId(null);
  }

  async function verifyUserEmail(userId: string) {
    if (!confirm(t("admin.providers.verifyEmailConfirm"))) return;
    setVerifyingEmailUserId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/verify-email`, { method: "POST" });
      if (!res.ok) {
        alert(t("admin.providers.verifyEmailFail"));
        return;
      }
      await load();
    } catch {
      alert(t("admin.providers.verifyEmailErr"));
    }
    setVerifyingEmailUserId(null);
  }

  async function actAngel(userId: string, action: "approve" | "reject") {
    setActingAngel(userId);
    try {
      await fetch("/api/admin/humanitarian/angels", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      await load();
    } catch {
      /* ignore */
    }
    setActingAngel(null);
  }

  const filteredProfessionals = professionals.filter(
    (d) =>
      !q ||
      d.name.toLowerCase().includes(q.toLowerCase()) ||
      (d.email || "").toLowerCase().includes(q.toLowerCase()) ||
      specialtyMatchesSearch(lang, d.specialty, q),
  );

  const filteredProviders = providers.filter(
    (p) =>
      !q ||
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      (p.email || "").toLowerCase().includes(q.toLowerCase()) ||
      p.subtitle.toLowerCase().includes(q.toLowerCase()),
  );

  const filteredAngels = angels.filter(
    (a) =>
      !q ||
      `${a.firstName} ${a.lastName}`.toLowerCase().includes(q.toLowerCase()) ||
      a.email.toLowerCase().includes(q.toLowerCase()) ||
      (a.profession || "").toLowerCase().includes(q.toLowerCase()),
  );

  const tabMeta = ADMIN_PROVIDER_TABS.find((t) => t.id === activeTab)!;
  const listCount =
    activeTab === "anjos"
      ? filteredAngels.length
      : activeTab === "psicanalistas" || activeTab === "terapeutas"
        ? filteredProviders.length
        : filteredProfessionals.length;

  const emptyLabel =
    activeTab === "anjos"
      ? t("admin.providers.emptyAngels")
      : activeTab === "psicanalistas"
        ? t("admin.providers.emptyPsychoanalysts")
        : activeTab === "terapeutas"
          ? t("admin.providers.emptyTherapists")
          : t("admin.providers.emptyCategory").replace(
              "{{category}}",
              providerTabLabel(tabMeta.id, t).toLowerCase(),
            );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("admin.providers.title")}</h1>
        <p className="text-slate-500 mt-1">{t("admin.providers.subtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {ADMIN_PROVIDER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
              activeTab === tab.id
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"
            }`}
          >
            {TAB_ICONS[tab.id]}
            {providerTabLabel(tab.id, t)}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("admin.providers.searchPlaceholder")}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm"
        />
      </div>

      <p className="text-xs text-slate-400">
        {t("admin.providers.listCount")
          .replace("{{category}}", providerTabLabel(tabMeta.id, t))
          .replace("{{count}}", String(listCount))}
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-10 justify-center">
          <Loader2 size={18} className="animate-spin" /> {t("common.loading")}
        </div>
      ) : listCount === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm text-center py-16">
          <Stethoscope className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-400 text-sm">{emptyLabel}</p>
        </div>
      ) : activeTab === "anjos" ? (
        <div className="space-y-3">
          {filteredAngels.map((a) => (
            <div key={a.userId} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800 text-sm">
                      {a.firstName} {a.lastName}
                    </p>
                    {a.approvalStatus === "APPROVED" && (
                      <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {t("admin.providers.angelApproved")}
                      </span>
                    )}
                    {a.approvalStatus === "PENDING" && (
                      <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                        {t("admin.providers.angelPending")}
                      </span>
                    )}
                    {a.approvalStatus === "REJECTED" && (
                      <span className="text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                        {t("admin.providers.angelRejected")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <Mail size={11} />
                    {a.email}
                    {!a.emailVerified && (
                      <span className="text-amber-600 font-medium">{t("admin.providers.emailUnverified")}</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t("admin.providers.languages")} {a.languages.join(", ").toUpperCase()} ·{" "}
                    {new Date(a.createdAt).toLocaleDateString(locale)}
                  </p>
                  {a.profession && (
                    <p className="text-xs text-slate-600 mt-1">
                      <span className="font-medium text-slate-500">{t("admin.providers.angelProfession")}</span>{" "}
                      {a.profession}
                    </p>
                  )}
                  {a.volunteerHelp && (
                    <p className="text-xs text-slate-600 mt-1 bg-slate-50 rounded-lg p-2">
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
                  {a.licenseDocCount > 0 && (
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
                  )}
                  {!a.licenseDocCount && (
                    <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-1 rounded-lg text-center">
                      {t("admin.providers.angelNoCertificate")}
                    </span>
                  )}
                  {!a.emailVerified && (
                    <button
                      type="button"
                      onClick={() => verifyUserEmail(a.userId)}
                      disabled={verifyingEmailUserId === a.userId}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition disabled:opacity-50"
                    >
                      {verifyingEmailUserId === a.userId ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Mail size={14} />
                      )}
                      {t("admin.providers.verifyEmail")}
                    </button>
                  )}
                {a.approvalStatus === "PENDING" && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={actingAngel === a.userId || !a.emailVerified}
                      onClick={() => actAngel(a.userId, "approve")}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold disabled:opacity-40"
                    >
                      {actingAngel === a.userId ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={14} />
                      )}
                      {t("admin.providers.approve")}
                    </button>
                    <button
                      type="button"
                      disabled={actingAngel === a.userId}
                      onClick={() => actAngel(a.userId, "reject")}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 text-xs font-semibold"
                    >
                      <XCircle size={14} /> {t("admin.providers.reject")}
                    </button>
                  </div>
                )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === "psicanalistas" || activeTab === "terapeutas" ? (
        <ProviderList
          rows={filteredProviders}
          busyId={busyId}
          docsBusyId={docsBusyId}
          verifyingEmailUserId={verifyingEmailUserId}
          kind={activeTab === "psicanalistas" ? "psychoanalyst" : "integrative"}
          onToggle={toggleProviderVerified}
          onViewDocs={viewLicenseDocs}
          onVerifyEmail={verifyUserEmail}
        />
      ) : (
        <ProfessionalList
          rows={filteredProfessionals}
          lang={lang}
          busyId={busyId}
          docsBusyId={docsBusyId}
          verifyingEmailUserId={verifyingEmailUserId}
          onToggle={toggleProfessionalVerified}
          onViewDocs={viewLicenseDocs}
          onVerifyEmail={verifyUserEmail}
        />
      )}
    </div>
  );
}

function StatusBadge({ verified }: { verified: boolean }) {
  const { t } = useI18n();
  return verified ? (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
      <CheckCircle2 size={11} /> {t("admin.providers.listingApproved")}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
      {t("admin.providers.pendingApproval")}
    </span>
  );
}

function ActionButtons({
  userId,
  verified,
  emailVerified,
  rowId,
  licenseDocCount,
  busyId,
  docsBusyId,
  verifyingEmailUserId,
  onToggle,
  onViewDocs,
  onVerifyEmail,
}: {
  userId: string;
  verified: boolean;
  emailVerified?: boolean;
  rowId: string;
  licenseDocCount: number;
  busyId: string | null;
  docsBusyId: string | null;
  verifyingEmailUserId?: string | null;
  onToggle: () => void;
  onViewDocs: (userId: string) => void;
  onVerifyEmail?: (userId: string) => void;
}) {
  const { t } = useI18n();
  const emailOk = emailVerified !== false;
  return (
    <div className="flex flex-col gap-2 shrink-0">
      <AdminViewPhoneButton userId={userId} />
      {onVerifyEmail && !emailOk && (
        <button
          type="button"
          onClick={() => onVerifyEmail(userId)}
          disabled={verifyingEmailUserId === userId}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition disabled:opacity-50"
        >
          {verifyingEmailUserId === userId ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Mail size={14} />
          )}
          {t("admin.providers.verifyEmail")}
        </button>
      )}
      {licenseDocCount > 0 && (
        <button
          type="button"
          onClick={() => onViewDocs(userId)}
          disabled={docsBusyId === userId}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
        >
          {docsBusyId === userId ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <FileText size={14} />
          )}
          {t("admin.providers.viewDocs").replace("{{n}}", String(licenseDocCount))}
        </button>
      )}
      <button
        type="button"
        onClick={onToggle}
        disabled={busyId === rowId}
        className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition disabled:opacity-50 ${
          verified
            ? "text-rose-600 border-rose-200 hover:bg-rose-50"
            : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
        }`}
      >
        {busyId === rowId ? (
          <Loader2 size={14} className="animate-spin" />
        ) : verified ? (
          <XCircle size={14} />
        ) : (
          <CheckCircle2 size={14} />
        )}
        {verified ? t("admin.providers.revoke") : t("admin.providers.approveListing")}
      </button>
    </div>
  );
}

function ProfessionalList({
  rows,
  lang,
  busyId,
  docsBusyId,
  verifyingEmailUserId,
  onToggle,
  onViewDocs,
  onVerifyEmail,
}: {
  rows: ProfessionalRow[];
  lang: string;
  busyId: string | null;
  docsBusyId: string | null;
  verifyingEmailUserId: string | null;
  onToggle: (row: ProfessionalRow) => void;
  onViewDocs: (userId: string) => void;
  onVerifyEmail: (userId: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
      {rows.map((d) => (
        <div key={d.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition">
          <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600 shrink-0">
            <Stethoscope size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-slate-800 text-sm">{d.name}</p>
              <StatusBadge verified={d.verified} />
              {d.isPublic && d.verified && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                  <Globe size={11} /> {t("admin.providers.public")}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 flex-wrap">
              {getProfessionLabel(lang as "pt" | "en" | "es", d.specialty)} · {d.email || t("admin.providers.noEmail")} ·{" "}
              {d.region || "—"}
              {!d.emailVerified && (
                <span className="text-amber-600 font-medium">{t("admin.providers.emailUnverified")}</span>
              )}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {t("admin.providers.licenseLine")
                .replace("{{number}}", d.licenseNumber)
                .replace("{{country}}", d.licenseCountry)
                .replace("{{appointments}}", String(d.appointments))
                .replace("{{charts}}", String(d.charts))}
              {d.licenseDocCount > 0 &&
                t("admin.providers.licenseDocs").replace("{{n}}", String(d.licenseDocCount))}
            </p>
            {d.publicUrl && (
              <a
                href={d.publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline mt-1"
              >
                <ExternalLink size={11} /> {d.publicUrl.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
          <ActionButtons
            userId={d.userId}
            verified={d.verified}
            emailVerified={d.emailVerified}
            rowId={d.id}
            licenseDocCount={d.licenseDocCount}
            busyId={busyId}
            docsBusyId={docsBusyId}
            verifyingEmailUserId={verifyingEmailUserId}
            onToggle={() => onToggle(d)}
            onViewDocs={onViewDocs}
            onVerifyEmail={onVerifyEmail}
          />
        </div>
      ))}
    </div>
  );
}

function ProviderList({
  rows,
  busyId,
  docsBusyId,
  verifyingEmailUserId,
  kind,
  onToggle,
  onViewDocs,
  onVerifyEmail,
}: {
  rows: ProviderRow[];
  busyId: string | null;
  docsBusyId: string | null;
  verifyingEmailUserId: string | null;
  kind: "psychoanalyst" | "integrative";
  onToggle: (row: ProviderRow, kind: "psychoanalyst" | "integrative") => void;
  onViewDocs: (userId: string) => void;
  onVerifyEmail: (userId: string) => void;
}) {
  const { t } = useI18n();
  const Icon = kind === "psychoanalyst" ? Brain : Leaf;
  const bg = kind === "psychoanalyst" ? "bg-violet-100 text-violet-600" : "bg-teal-100 text-teal-600";

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
      {rows.map((p) => (
        <div key={p.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
            <Icon size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-slate-800 text-sm">{p.name}</p>
              <StatusBadge verified={p.verified} />
              {p.isPublic && p.verified && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                  <Globe size={11} /> {t("admin.providers.public")}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 flex-wrap">
              {p.subtitle} · {p.email || t("admin.providers.noEmail")} · {p.region || "—"}
              {!p.emailVerified && (
                <span className="text-amber-600 font-medium">{t("admin.providers.emailUnverified")}</span>
              )}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {t("admin.providers.statsLine")
                .replace("{{appointments}}", String(p.appointments))
                .replace("{{charts}}", String(p.charts))}
              {p.licenseDocCount > 0 &&
                t("admin.providers.licenseDocs").replace("{{n}}", String(p.licenseDocCount))}
            </p>
            {p.publicUrl && (
              <a
                href={p.publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline mt-1"
              >
                <ExternalLink size={11} /> {p.publicUrl.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
          <ActionButtons
            userId={p.userId}
            verified={p.verified}
            emailVerified={p.emailVerified}
            rowId={p.id}
            licenseDocCount={p.licenseDocCount}
            busyId={busyId}
            docsBusyId={docsBusyId}
            verifyingEmailUserId={verifyingEmailUserId}
            onToggle={() => onToggle(p, kind)}
            onViewDocs={onViewDocs}
            onVerifyEmail={onVerifyEmail}
          />
        </div>
      ))}
    </div>
  );
}
