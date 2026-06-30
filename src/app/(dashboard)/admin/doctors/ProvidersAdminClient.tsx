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
  Clock,
  LayoutList,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import type { TranslationKey } from "@/lib/i18n/translations";
import { getProfessionLabel, specialtyMatchesSearch } from "@/lib/professions";
import {
  ADMIN_PROVIDER_TABS,
  angelMatchesAdminTab,
  resolveAdminTabForProfessional,
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
  adminTab?: AdminProviderTab;
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
  pendentes: <Clock size={14} />,
  todos: <LayoutList size={14} />,
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

async function parseJsonResponse(res: Response): Promise<Record<string, unknown> | null> {
  if (!res.ok) return null;
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function matchesDoctorTab(tab: AdminProviderTab, specialty: string, licenseNumber?: string): boolean {
  if (tab === "pendentes" || tab === "anjos" || tab === "todos") return false;
  return resolveAdminTabForProfessional(specialty, licenseNumber) === tab;
}

function computeLegacyTabCounts(
  angels: AngelRow[],
  doctors: ProfessionalRow[],
  psychoanalysts: ProviderRow[],
  integrativeTherapists: ProviderRow[],
): Partial<Record<AdminProviderTab, number>> {
  const pending =
    angels.filter((a) => a.approvalStatus === "PENDING").length +
    doctors.filter((d) => !d.verified).length +
    psychoanalysts.filter((p) => !p.verified).length +
    integrativeTherapists.filter((p) => !p.verified).length;

  return {
    pendentes: pending,
    todos:
      angels.length + doctors.length + psychoanalysts.length + integrativeTherapists.length,
    anjos: angels.length,
    medicos:
      angels.filter((a) => angelMatchesAdminTab(a, "medicos")).length +
      doctors.filter((d) => matchesDoctorTab("medicos", d.specialty, d.licenseNumber)).length,
    psicologos:
      angels.filter((a) => angelMatchesAdminTab(a, "psicologos")).length +
      doctors.filter((d) => matchesDoctorTab("psicologos", d.specialty, d.licenseNumber)).length,
    nutricionistas:
      angels.filter((a) => angelMatchesAdminTab(a, "nutricionistas")).length +
      doctors.filter((d) => matchesDoctorTab("nutricionistas", d.specialty, d.licenseNumber)).length,
    fisioterapeutas:
      angels.filter((a) => angelMatchesAdminTab(a, "fisioterapeutas")).length +
      doctors.filter((d) => matchesDoctorTab("fisioterapeutas", d.specialty, d.licenseNumber)).length,
    psicanalistas:
      angels.filter((a) => angelMatchesAdminTab(a, "psicanalistas")).length +
      doctors.filter((d) => matchesDoctorTab("psicanalistas", d.specialty, d.licenseNumber)).length +
      psychoanalysts.length,
    terapeutas:
      angels.filter((a) => angelMatchesAdminTab(a, "terapeutas")).length +
      doctors.filter((d) => matchesDoctorTab("terapeutas", d.specialty, d.licenseNumber)).length +
      integrativeTherapists.length,
    outros:
      angels.filter((a) => angelMatchesAdminTab(a, "outros")).length +
      doctors.filter((d) => matchesDoctorTab("outros", d.specialty, d.licenseNumber)).length,
  };
}

function applyLegacyTabFilter(
  tab: AdminProviderTab,
  allAngels: AngelRow[],
  allDoctors: ProfessionalRow[],
  allPsychoanalysts: ProviderRow[],
  allIntegrative: ProviderRow[],
): {
  angels: AngelRow[];
  doctors: ProfessionalRow[];
  psychoanalysts: ProviderRow[];
  integrativeTherapists: ProviderRow[];
} {
  if (tab === "todos") {
    return {
      angels: allAngels,
      doctors: allDoctors,
      psychoanalysts: allPsychoanalysts,
      integrativeTherapists: allIntegrative,
    };
  }
  if (tab === "anjos") {
    return { angels: allAngels, doctors: [], psychoanalysts: [], integrativeTherapists: [] };
  }
  if (tab === "pendentes") {
    return {
      angels: allAngels.filter((a) => a.approvalStatus === "PENDING"),
      doctors: allDoctors.filter((d) => !d.verified),
      psychoanalysts: allPsychoanalysts.filter((p) => !p.verified),
      integrativeTherapists: allIntegrative.filter((p) => !p.verified),
    };
  }
  if (tab === "psicanalistas") {
    return {
      angels: allAngels.filter((a) => angelMatchesAdminTab(a, tab)),
      doctors: allDoctors.filter((d) => matchesDoctorTab(tab, d.specialty, d.licenseNumber)),
      psychoanalysts: allPsychoanalysts,
      integrativeTherapists: [],
    };
  }
  if (tab === "terapeutas") {
    return {
      angels: allAngels.filter((a) => angelMatchesAdminTab(a, tab)),
      doctors: allDoctors.filter((d) => matchesDoctorTab(tab, d.specialty, d.licenseNumber)),
      psychoanalysts: [],
      integrativeTherapists: allIntegrative,
    };
  }
  return {
    angels: allAngels.filter((a) => angelMatchesAdminTab(a, tab)),
    doctors: allDoctors.filter((d) => matchesDoctorTab(tab, d.specialty, d.licenseNumber)),
    psychoanalysts: [],
    integrativeTherapists: [],
  };
}

export default function ProvidersAdminClient() {
  const { lang, t } = useI18n();
  const locale = localeOf(lang);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as AdminProviderTab | null;
  const activeTab: AdminProviderTab =
    tabParam && ADMIN_PROVIDER_TABS.some((t) => t.id === tabParam) ? tabParam : "pendentes";

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [queryErrors, setQueryErrors] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [docsBusyId, setDocsBusyId] = useState<string | null>(null);
  const [actingAngel, setActingAngel] = useState<string | null>(null);
  const [verifyingEmailUserId, setVerifyingEmailUserId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const [professionals, setProfessionals] = useState<ProfessionalRow[]>([]);
  const [psychoanalysts, setPsychoanalysts] = useState<ProviderRow[]>([]);
  const [integrativeTherapists, setIntegrativeTherapists] = useState<ProviderRow[]>([]);
  const [angels, setAngels] = useState<AngelRow[]>([]);
  const [tabCounts, setTabCounts] = useState<Partial<Record<AdminProviderTab, number>>>({});

  const setTab = (tab: AdminProviderTab) => {
    router.replace(`/admin/doctors?tab=${tab}`, { scroll: false });
  };

  const load = useCallback(async (searchTerm = "") => {
    setLoading(true);
    setLoadError(null);
    setQueryErrors([]);
    const term = searchTerm.trim();
    const providersUrl = term
      ? `/api/admin/providers?q=${encodeURIComponent(term)}`
      : `/api/admin/providers?tab=${activeTab}`;

    try {
      const res = await fetch(providersUrl);
      const data = await parseJsonResponse(res);
      if (res.ok && data) {
        const angels = (data.angels as AngelRow[]) || [];
        const doctors = (data.doctors as ProfessionalRow[]) || [];
        const psychoanalystRows = (data.psychoanalysts as ProviderRow[]) || [];
        const integrativeRows = (data.integrativeTherapists as ProviderRow[]) || [];
        const pendingCounts =
          (data.pendingCounts as Partial<Record<AdminProviderTab, number>>) || {};
        const actualCount =
          angels.length + doctors.length + psychoanalystRows.length + integrativeRows.length;
        const expectedCount = term ? actualCount : (pendingCounts[activeTab] ?? 0);

        if (!term && expectedCount > 0 && actualCount === 0) {
          /* fall through to legacy endpoints below */
        } else {
          setAngels(angels);
          setProfessionals(doctors);
          setPsychoanalysts(psychoanalystRows);
          setIntegrativeTherapists(integrativeRows);
          setTabCounts(pendingCounts);
          setQueryErrors((data.queryErrors as string[] | undefined) ?? []);
          setLoading(false);
          return;
        }
      }
    } catch {
      /* try legacy endpoints below */
    }

    try {
      const [angelsRes, doctorsRes, psychoRes, integrativeRes] = await Promise.all([
        fetch("/api/admin/humanitarian/angels"),
        fetch("/api/admin/doctors"),
        fetch("/api/admin/psychoanalysts"),
        fetch("/api/admin/integrative-therapists"),
      ]);

      const angelsData = await parseJsonResponse(angelsRes);
      const doctorsData = await parseJsonResponse(doctorsRes);
      const psychoData = await parseJsonResponse(psychoRes);
      const integrativeData = await parseJsonResponse(integrativeRes);

      const allAngels = (angelsData?.angels as AngelRow[]) || [];
      const allDoctors = (doctorsData?.doctors as ProfessionalRow[]) || [];
      const allPsychoanalysts = (psychoData?.providers as ProviderRow[]) || [];
      const allIntegrative = (integrativeData?.providers as ProviderRow[]) || [];

      const anyOk = angelsRes.ok || doctorsRes.ok || psychoRes.ok || integrativeRes.ok;
      if (!anyOk) {
        setLoadError(t("admin.providers.loadFail"));
        setAngels([]);
        setProfessionals([]);
        setPsychoanalysts([]);
        setIntegrativeTherapists([]);
        setLoading(false);
        return;
      }

      if (term) {
        const qLower = term.toLowerCase();
        const matches = (parts: (string | null | undefined)[]) =>
          parts.some((p) => (p ?? "").toLowerCase().includes(qLower));

        setAngels(
          allAngels.filter((a) =>
            matches([a.firstName, a.lastName, a.email, a.profession, a.volunteerHelp, a.motivation]),
          ),
        );
        setProfessionals(
          allDoctors.filter((d) => matches([d.name, d.email, d.specialty, d.licenseNumber])),
        );
        setPsychoanalysts(
          allPsychoanalysts.filter((p) => matches([p.name, p.email, p.subtitle])),
        );
        setIntegrativeTherapists(
          allIntegrative.filter((p) => matches([p.name, p.email, p.subtitle])),
        );
      } else {
        const filtered = applyLegacyTabFilter(
          activeTab,
          allAngels,
          allDoctors,
          allPsychoanalysts,
          allIntegrative,
        );
        setAngels(filtered.angels);
        setProfessionals(filtered.doctors);
        setPsychoanalysts(filtered.psychoanalysts);
        setIntegrativeTherapists(filtered.integrativeTherapists);
      }
      setTabCounts(
        computeLegacyTabCounts(allAngels, allDoctors, allPsychoanalysts, allIntegrative),
      );
    } catch {
      setLoadError(t("admin.providers.loadFail"));
    }
    setLoading(false);
  }, [activeTab, t]);

  useEffect(() => {
    const timer = setTimeout(() => load(q.trim()), q.trim() ? 300 : 0);
    return () => clearTimeout(timer);
  }, [q, activeTab, load]);

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

  const filteredProfessionals = q.trim()
    ? professionals
    : professionals.filter(
        (d) =>
          d.name.toLowerCase().includes(q.toLowerCase()) ||
          (d.email || "").toLowerCase().includes(q.toLowerCase()) ||
          specialtyMatchesSearch(lang, d.specialty, q),
      );

  const filteredPsychoanalysts = q.trim()
    ? psychoanalysts
    : psychoanalysts.filter(
        (p) =>
          p.name.toLowerCase().includes(q.toLowerCase()) ||
          (p.email || "").toLowerCase().includes(q.toLowerCase()) ||
          p.subtitle.toLowerCase().includes(q.toLowerCase()),
      );

  const filteredIntegrativeTherapists = q.trim()
    ? integrativeTherapists
    : integrativeTherapists.filter(
        (p) =>
          p.name.toLowerCase().includes(q.toLowerCase()) ||
          (p.email || "").toLowerCase().includes(q.toLowerCase()) ||
          p.subtitle.toLowerCase().includes(q.toLowerCase()),
      );

  const filteredAngels = q.trim()
    ? angels
    : angels.filter(
        (a) =>
          `${a.firstName} ${a.lastName}`.toLowerCase().includes(q.toLowerCase()) ||
          a.email.toLowerCase().includes(q.toLowerCase()) ||
          (a.profession || "").toLowerCase().includes(q.toLowerCase()) ||
          (a.volunteerHelp || "").toLowerCase().includes(q.toLowerCase()) ||
          (a.motivation || "").toLowerCase().includes(q.toLowerCase()),
      );

  const tabMeta = ADMIN_PROVIDER_TABS.find((t) => t.id === activeTab)!;
  const listCount =
    filteredAngels.length +
    filteredProfessionals.length +
    filteredPsychoanalysts.length +
    filteredIntegrativeTherapists.length;

  const emptyLabel =
    activeTab === "pendentes"
      ? t("admin.providers.emptyPending")
      : activeTab === "todos"
        ? t("admin.providers.emptyAll")
        : activeTab === "anjos"
        ? t("admin.providers.emptyAngels")
        : activeTab === "psicanalistas"
          ? t("admin.providers.emptyPsychoanalysts")
          : activeTab === "terapeutas"
            ? t("admin.providers.emptyTherapists")
            : t("admin.providers.emptyCategory").replace(
                "{{category}}",
                providerTabLabel(tabMeta.id, t).toLowerCase(),
              );

  const otherTabsWithData = ADMIN_PROVIDER_TABS.filter(
    (tab) => tab.id !== activeTab && (tabCounts[tab.id] ?? 0) > 0,
  );
  const emptyHint =
    otherTabsWithData.length > 0
      ? t("admin.providers.emptyHint").replace(
          "{{tabs}}",
          otherTabsWithData
            .map((tab) => `${providerTabLabel(tab.id, t)} (${tabCounts[tab.id]})`)
            .join(", "),
        )
      : null;

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
            {tabCounts[tab.id] != null && tabCounts[tab.id]! > 0 && (
              <span
                className={`ml-0.5 min-w-[1.1rem] rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  activeTab === tab.id
                    ? "bg-white/25 text-white"
                    : "bg-amber-500 text-white"
                }`}
              >
                {tabCounts[tab.id]}
              </span>
            )}
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

      {q.trim() && (
        <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
          {t("admin.providers.searchGlobalHint")}
        </p>
      )}

      {loadError && (
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
          {loadError}
        </p>
      )}

      {queryErrors.length > 0 && (
        <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-1">
          <p className="font-medium">{t("admin.providers.partialLoadWarning")}</p>
          <ul className="list-disc list-inside text-xs">
            {queryErrors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </div>
      )}

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
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm text-center py-16 px-6">
          <Stethoscope className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-400 text-sm">{emptyLabel}</p>
          {emptyHint && (
            <p className="text-slate-500 text-sm mt-3 max-w-md mx-auto">{emptyHint}</p>
          )}
          {otherTabsWithData.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {otherTabsWithData.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTab(tab.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
                >
                  {providerTabLabel(tab.id, t)} ({tabCounts[tab.id]})
                </button>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "anjos" ? (
        <AngelList
          rows={filteredAngels}
          actingAngel={actingAngel}
          docsBusyId={docsBusyId}
          verifyingEmailUserId={verifyingEmailUserId}
          onAct={actAngel}
          onViewDocs={viewLicenseDocs}
          onVerifyEmail={verifyUserEmail}
        />
      ) : (
        <div className="space-y-4">
          {filteredAngels.length > 0 && (
            <AngelList
              rows={filteredAngels}
              actingAngel={actingAngel}
              docsBusyId={docsBusyId}
              verifyingEmailUserId={verifyingEmailUserId}
              onAct={actAngel}
              onViewDocs={viewLicenseDocs}
              onVerifyEmail={verifyUserEmail}
            />
          )}
          {filteredProfessionals.length > 0 && (
            <ProfessionalList
              rows={filteredProfessionals}
              lang={lang}
              showCategoryBadge={activeTab === "todos" || !!q.trim()}
              busyId={busyId}
              docsBusyId={docsBusyId}
              verifyingEmailUserId={verifyingEmailUserId}
              onToggle={toggleProfessionalVerified}
              onViewDocs={viewLicenseDocs}
              onVerifyEmail={verifyUserEmail}
            />
          )}
          {filteredPsychoanalysts.length > 0 && (
            <ProviderList
              rows={filteredPsychoanalysts}
              busyId={busyId}
              docsBusyId={docsBusyId}
              verifyingEmailUserId={verifyingEmailUserId}
              kind="psychoanalyst"
              onToggle={toggleProviderVerified}
              onViewDocs={viewLicenseDocs}
              onVerifyEmail={verifyUserEmail}
            />
          )}
          {filteredIntegrativeTherapists.length > 0 && (
            <ProviderList
              rows={filteredIntegrativeTherapists}
              busyId={busyId}
              docsBusyId={docsBusyId}
              verifyingEmailUserId={verifyingEmailUserId}
              kind="integrative"
              onToggle={toggleProviderVerified}
              onViewDocs={viewLicenseDocs}
              onVerifyEmail={verifyUserEmail}
            />
          )}
        </div>
      )}
    </div>
  );
}

function AngelList({
  rows,
  actingAngel,
  docsBusyId,
  verifyingEmailUserId,
  onAct,
  onViewDocs,
  onVerifyEmail,
}: {
  rows: AngelRow[];
  actingAngel: string | null;
  docsBusyId: string | null;
  verifyingEmailUserId: string | null;
  onAct: (userId: string, action: "approve" | "reject") => void;
  onViewDocs: (userId: string) => void;
  onVerifyEmail: (userId: string) => void;
}) {
  const { lang, t } = useI18n();
  const locale = localeOf(lang);

  return (
    <div className="space-y-3">
      {rows.map((a) => (
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
                  onClick={() => onViewDocs(a.userId)}
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
                  onClick={() => onVerifyEmail(a.userId)}
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
                    onClick={() => onAct(a.userId, "approve")}
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
                    onClick={() => onAct(a.userId, "reject")}
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
  showCategoryBadge,
  busyId,
  docsBusyId,
  verifyingEmailUserId,
  onToggle,
  onViewDocs,
  onVerifyEmail,
}: {
  rows: ProfessionalRow[];
  lang: string;
  showCategoryBadge?: boolean;
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
              {showCategoryBadge && (
                <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                  {providerTabLabel(
                    d.adminTab ?? resolveAdminTabForProfessional(d.specialty, d.licenseNumber),
                    t,
                  )}
                </span>
              )}
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
