"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  Loader2,
  RefreshCw,
  Users,
  Clock,
  Stethoscope,
  Brain,
  Leaf,
  Search,
  Ban,
  KeyRound,
  Mail,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { ACURA_VOLUNTEER_LOGO } from "@/lib/acura-volunteer";
import type { AcuraVolunteerAdminList, AcuraVolunteerAdminRow } from "@/lib/acura-volunteer-admin";
import AdminViewPhoneButton from "@/components/admin/AdminViewPhoneButton";
import AdminViewLicenseDocsButton from "@/components/admin/AdminViewLicenseDocsButton";
import { useI18n } from "@/lib/i18n/I18nProvider";

const KIND_LABEL: Record<string, string> = {
  professional: "Profissional de saúde",
  psychoanalyst: "Psicanalista",
  integrative: "Terapeuta integrativo",
};

const KIND_ICON: Record<string, React.ReactNode> = {
  professional: <Stethoscope size={12} />,
  psychoanalyst: <Brain size={12} />,
  integrative: <Leaf size={12} />,
};

type StatusFilter = "all" | "PENDING" | "ACTIVE" | "REVOKED";

function verifyApiPath(kind: AcuraVolunteerAdminRow["kind"]): string {
  if (kind === "psychoanalyst") return "/api/admin/psychoanalysts";
  if (kind === "integrative") return "/api/admin/integrative-therapists";
  return "/api/admin/doctors";
}

function StatusBadge({ status, verified }: { status: string; verified: boolean }) {
  if (status === "ACTIVE") {
    return (
      <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
        {verified ? "Ativo · selo visível" : "Ativo · aguarda verificação"}
      </span>
    );
  }
  if (status === "PENDING") {
    return (
      <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
        Pendente aprovação
      </span>
    );
  }
  if (status === "REVOKED") {
    return (
      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
        Revogado
      </span>
    );
  }
  return (
    <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">
      Não participante
    </span>
  );
}

function ProviderCommandCtas({
  row,
  busy,
  verifyingEmail,
  onToggleListing,
  onVerifyEmail,
  onResetPassword,
  onAcuraAction,
}: {
  row: AcuraVolunteerAdminRow;
  busy: boolean;
  verifyingEmail: boolean;
  onToggleListing: () => void;
  onVerifyEmail: () => void;
  onResetPassword: () => void;
  onAcuraAction: (action: "approve" | "reject" | "include" | "revoke") => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-2 min-w-[160px]">
      <AdminViewPhoneButton userId={row.userId} />
      {!row.emailVerified && (
        <button
          type="button"
          onClick={onVerifyEmail}
          disabled={verifyingEmail || busy}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition disabled:opacity-50"
        >
          {verifyingEmail ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
          {t("admin.providers.verifyEmail")}
        </button>
      )}
      <button
        type="button"
        onClick={onResetPassword}
        disabled={busy}
        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
      >
        <KeyRound size={14} />
        {t("admin.account.resetPassword")}
      </button>
      <AdminViewLicenseDocsButton userId={row.userId} licenseDocCount={row.licenseDocCount ?? 0} />
      <button
        type="button"
        onClick={onToggleListing}
        disabled={busy}
        className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition disabled:opacity-50 ${
          row.verified
            ? "text-rose-600 border-rose-200 hover:bg-rose-50"
            : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
        }`}
      >
        {busy ? (
          <Loader2 size={14} className="animate-spin" />
        ) : row.verified ? (
          <XCircle size={14} />
        ) : (
          <CheckCircle2 size={14} />
        )}
        {row.verified ? t("admin.providers.revoke") : t("admin.providers.approveListing")}
      </button>

      {row.status === "PENDING" && (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
          <button
            type="button"
            disabled={busy}
            onClick={() => onAcuraAction("approve")}
            className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Aprovar Acura
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onAcuraAction("reject")}
            className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
          >
            Rejeitar Acura
          </button>
        </div>
      )}
      {row.status === "ACTIVE" && row.verified && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onAcuraAction("revoke")}
          className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-amber-200 text-amber-800 hover:bg-amber-50 disabled:opacity-50"
        >
          Revogar só Acura
        </button>
      )}
      {(row.status === "REVOKED" || row.status === "NONE") && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onAcuraAction("include")}
          className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
        >
          Incluir na Acura
        </button>
      )}
    </div>
  );
}

export default function AcuraVolunteersAdminPanel() {
  const { t } = useI18n();
  const [data, setData] = useState<AcuraVolunteerAdminList | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [q, setQ] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [verifyingEmailUserId, setVerifyingEmailUserId] = useState<string | null>(null);
  const [includeQ, setIncludeQ] = useState("");
  const [includeResults, setIncludeResults] = useState<AcuraVolunteerAdminRow[]>([]);
  const [includeLoading, setIncludeLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/admin/acura-volunteers?${params}`);
      if (res.ok) setData(await res.json());
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [status, q]);

  useEffect(() => {
    load();
  }, [load]);

  async function runAction(
    row: AcuraVolunteerAdminRow,
    action: "approve" | "reject" | "include" | "revoke",
  ) {
    const key = `${row.kind}-${row.id}`;
    setBusyKey(key);
    try {
      const res = await fetch("/api/admin/acura-volunteers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: row.kind, id: row.id, action }),
      });
      if (res.ok) {
        await load();
        if (action === "include") {
          setIncludeResults((prev) => prev.filter((r) => !(r.kind === row.kind && r.id === row.id)));
        }
      }
    } finally {
      setBusyKey(null);
    }
  }

  async function toggleListing(row: AcuraVolunteerAdminRow) {
    const key = `${row.kind}-${row.id}`;
    setBusyKey(key);
    try {
      await fetch(`${verifyApiPath(row.kind)}/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: !row.verified }),
      });
      await load();
    } catch {
      /* ignore */
    } finally {
      setBusyKey(null);
    }
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
    } finally {
      setVerifyingEmailUserId(null);
    }
  }

  async function resetUserPassword(userId: string) {
    if (!confirm(t("admin.account.resetPasswordConfirm"))) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, { method: "POST" });
      if (!res.ok) {
        alert(t("admin.account.resetPasswordFail"));
        return;
      }
      alert(t("admin.account.resetPasswordOk"));
    } catch {
      alert(t("admin.account.resetPasswordFail"));
    }
  }

  useEffect(() => {
    if (includeQ.trim().length < 2) {
      setIncludeResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setIncludeLoading(true);
      try {
        const res = await fetch(
          `/api/admin/acura-volunteers/search?q=${encodeURIComponent(includeQ.trim())}`,
        );
        if (res.ok) {
          const body = await res.json();
          setIncludeResults(body.results ?? []);
        }
      } catch {
        /* ignore */
      }
      setIncludeLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [includeQ]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Image
              src={ACURA_VOLUNTEER_LOGO}
              alt="AcuraBrasil"
              width={96}
              height={24}
              className="h-6 w-auto object-contain"
              unoptimized
            />
            <div>
              <h2 className="font-semibold text-slate-800">Voluntários AcuraBrasil</h2>
              <p className="text-xs text-slate-500">
                Lista oficial de contato — só quem pediu ou foi aprovado pelo admin
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={load}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <RefreshCw size={12} /> Atualizar
          </button>
        </div>

        {loading && !data ? (
          <div className="p-8 flex justify-center">
            <Loader2 size={22} className="animate-spin text-sky-500" />
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 border-b border-slate-50">
              <div className="bg-emerald-50 rounded-xl p-3">
                <p className="text-xs text-emerald-700 flex items-center gap-1">
                  <Users size={12} /> Ativos
                </p>
                <p className="text-2xl font-bold text-emerald-900 mt-1">{data.totals.active}</p>
                <p className="text-[11px] text-emerald-700/80 mt-0.5">
                  Selo visível: {data.totals.activeVerified}
                </p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3">
                <p className="text-xs text-amber-700 flex items-center gap-1">
                  <Clock size={12} /> Pendentes
                </p>
                <p className="text-2xl font-bold text-amber-900 mt-1">{data.totals.pending}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Ban size={12} /> Revogados
                </p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{data.totals.revoked}</p>
              </div>
              <div className="bg-sky-50 rounded-xl p-3">
                <p className="text-xs text-sky-700 mb-1">Ativos por tipo</p>
                <div className="flex flex-wrap gap-2 text-xs text-sky-900">
                  <span>Saúde: <strong>{data.totals.byKind.professional}</strong></span>
                  <span>Psico: <strong>{data.totals.byKind.psychoanalyst}</strong></span>
                  <span>Integr.: <strong>{data.totals.byKind.integrative}</strong></span>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-b border-slate-50 flex flex-wrap gap-2 items-center">
              {(
                [
                  ["all", "Todos"],
                  ["PENDING", "Pendentes"],
                  ["ACTIVE", "Ativos"],
                  ["REVOKED", "Revogados"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatus(value)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg border ${
                    status === value
                      ? "bg-sky-600 text-white border-sky-600"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
              <div className="relative ml-auto min-w-[200px] flex-1 max-w-xs">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar nome ou e-mail…"
                  className="w-full text-sm pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>
            </div>

            {data.rows.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">
                Nenhum voluntário neste filtro.
              </p>
            ) : (
              <div className="p-4 sm:p-5 space-y-3 bg-slate-50/60">
                {data.rows.map((v) => {
                  const key = `${v.kind}-${v.id}`;
                  const busy = busyKey === key;
                  return (
                    <article
                      key={key}
                      className="bg-white rounded-2xl border border-slate-200/80 shadow-sm px-4 py-4 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1 space-y-2">
                        <div>
                          <p className="font-semibold text-slate-900">{v.name}</p>
                          {v.email && (
                            <p className="text-xs text-slate-400 mt-0.5 truncate">{v.email}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            {KIND_ICON[v.kind]} {KIND_LABEL[v.kind]}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span>{v.specialty || "—"}</span>
                        </div>
                        <StatusBadge status={v.status} verified={v.verified} />
                      </div>
                      <ProviderCommandCtas
                        row={v}
                        busy={busy}
                        verifyingEmail={verifyingEmailUserId === v.userId}
                        onToggleListing={() => toggleListing(v)}
                        onVerifyEmail={() => verifyUserEmail(v.userId)}
                        onResetPassword={() => resetUserPassword(v.userId)}
                        onAcuraAction={(action) => runAction(v, action)}
                      />
                    </article>
                  );
                })}
              </div>
            )}
          </>
        ) : null}
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Incluir profissional regular</h3>
          <p className="text-xs text-slate-500 mt-1">
            Cadastrou como não voluntário e depois quer participar? Busque e aprove aqui — o selo
            AcuraBrasil é concedido automaticamente.
          </p>
        </div>
        <div className="p-5 space-y-3">
          <div className="relative max-w-md">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={includeQ}
              onChange={(e) => setIncludeQ(e.target.value)}
              placeholder="Nome ou e-mail do profissional…"
              className="w-full text-sm pl-8 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>
          {includeLoading && (
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" /> Buscando…
            </p>
          )}
          {includeResults.length > 0 && (
            <ul className="space-y-3">
              {includeResults.map((r) => {
                const key = `${r.kind}-${r.id}`;
                const busy = busyKey === key;
                return (
                  <li
                    key={key}
                    className="bg-slate-50/80 rounded-2xl border border-slate-200/80 px-4 py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <div>
                        <p className="font-semibold text-slate-900">{r.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{r.email}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          {KIND_ICON[r.kind]} {KIND_LABEL[r.kind]}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span>{r.specialty || "—"}</span>
                      </div>
                      <StatusBadge status={r.status} verified={r.verified} />
                    </div>
                    <ProviderCommandCtas
                      row={r}
                      busy={busy}
                      verifyingEmail={verifyingEmailUserId === r.userId}
                      onToggleListing={() => toggleListing(r)}
                      onVerifyEmail={() => verifyUserEmail(r.userId)}
                      onResetPassword={() => resetUserPassword(r.userId)}
                      onAcuraAction={(action) => runAction(r, action)}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
