"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Package } from "lucide-react";
import { formatEin } from "@/lib/us-ein";

type Distributor = {
  id: string;
  ein: string;
  legalName: string;
  tradeName: string;
  brandAlias: string | null;
  status: string;
  platformFeePercent: number;
  addressCity: string | null;
  addressState: string | null;
  addressCountry: string;
  stripeConnected: boolean;
  ownerUserId: string | null;
  ownerEmail: string | null;
  ownerEmailVerified: boolean;
  ownerLocked: boolean;
  createdAt: string;
};

const STATUSES = ["ALL", "PENDING_REVIEW", "ACTIVE", "SUSPENDED"] as const;
const STATUS_LABEL: Record<string, string> = {
  ALL: "All",
  PENDING_REVIEW: "Pending review",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
};

export default function AdminDistributorsClient() {
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUSES)[number]>("PENDING_REVIEW");
  const [feeDraft, setFeeDraft] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/distributors");
    if (res.ok) {
      const data = await res.json();
      setDistributors(data.distributors ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (statusFilter === "ALL") return distributors;
    return distributors.filter((d) => d.status === statusFilter);
  }, [distributors, statusFilter]);

  const pendingCount = useMemo(
    () => distributors.filter((d) => d.status === "PENDING_REVIEW").length,
    [distributors],
  );

  async function verifyOwnerEmail(userId: string | null) {
    if (!userId) return;
    if (!confirm("Manually verify this owner's email?")) return;
    setSaving(userId);
    await fetch(`/api/admin/users/${userId}/verify-email`, { method: "POST" });
    setSaving(null);
    await load();
  }

  async function patchDistributor(id: string, body: Record<string, unknown>) {
    setSaving(id);
    await fetch(`/api/admin/distributors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(null);
    await load();
  }

  async function activate(id: string) {
    if (!confirm("Activate this distributor? They will be able to use the portal.")) return;
    await patchDistributor(id, { status: "ACTIVE" });
  }

  async function saveFee(id: string) {
    const raw = feeDraft[id];
    if (raw == null) return;
    const pct = parseInt(raw.replace(/\D/g, ""), 10);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return;
    await patchDistributor(id, { platformFeePercent: pct });
    setFeeDraft((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Package className="text-sky-600" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Distributors</h1>
            <p className="text-sm text-slate-500">
              {filtered.length} of {distributors.length}
              {pendingCount > 0 ? ` · ${pendingCount} pending` : ""}
            </p>
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as (typeof STATUSES)[number])}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          {STATUSES.map((st) => (
            <option key={st} value={st}>{STATUS_LABEL[st]}</option>
          ))}
        </select>
      </div>

      <p className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        Activating a distributor verifies the owner email automatically. Fee default is{" "}
        <strong>15%</strong> (facilitation on Zephra product checkout).
      </p>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Owner email</th>
              <th className="px-4 py-3 font-medium">Fee %</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Stripe US</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  No distributors in this filter.
                </td>
              </tr>
            )}
            {filtered.map((d) => (
              <tr key={d.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{d.tradeName}</p>
                  <p className="text-xs text-slate-400">{d.legalName}</p>
                  <p className="text-xs text-slate-400">
                    EIN {formatEin(d.ein)}
                    {d.brandAlias ? ` · ${d.brandAlias}` : ""}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={d.status}
                    disabled={saving === d.id}
                    onChange={(e) => patchDistributor(d.id, { status: e.target.value })}
                    className="rounded border border-slate-200 px-2 py-1 text-xs"
                  >
                    {STATUSES.filter((st) => st !== "ALL").map((st) => (
                      <option key={st} value={st}>{STATUS_LABEL[st]}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs text-slate-600">{d.ownerEmail || "—"}</p>
                  {d.ownerEmailVerified ? (
                    <span className="text-xs font-medium text-emerald-700">Verified</span>
                  ) : (
                    <div className="space-y-1">
                      <span className="block text-xs font-medium text-amber-700">Pending</span>
                      {d.ownerUserId && (
                        <button
                          type="button"
                          disabled={saving === d.ownerUserId}
                          onClick={() => verifyOwnerEmail(d.ownerUserId)}
                          className="text-xs font-semibold text-sky-700 disabled:opacity-40"
                        >
                          Verify email
                        </button>
                      )}
                    </div>
                  )}
                  {d.ownerLocked && (
                    <p className="mt-1 text-[10px] text-red-600">Account locked</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      defaultValue={String(d.platformFeePercent)}
                      onChange={(e) => setFeeDraft((prev) => ({ ...prev, [d.id]: e.target.value }))}
                      className="w-14 rounded border border-slate-200 px-2 py-1 text-xs"
                    />
                    <span className="text-xs text-slate-400">%</span>
                    <button
                      type="button"
                      disabled={saving === d.id || feeDraft[d.id] == null}
                      onClick={() => saveFee(d.id)}
                      className="text-xs font-semibold text-sky-700 disabled:opacity-40"
                    >
                      OK
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {[d.addressCity, d.addressState, d.addressCountry].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-4 py-3">
                  {d.stripeConnected ? (
                    <span className="text-xs font-medium text-emerald-700">Connected</span>
                  ) : (
                    <span className="text-xs text-slate-400">Not yet</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {d.status !== "ACTIVE" && (
                    <button
                      type="button"
                      disabled={saving === d.id}
                      onClick={() => activate(d.id)}
                      className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-40"
                    >
                      Activate
                    </button>
                  )}
                  {d.status === "ACTIVE" && (
                    <button
                      type="button"
                      disabled={saving === d.id}
                      onClick={() => patchDistributor(d.id, { status: "SUSPENDED" })}
                      className="text-xs font-semibold text-amber-700 disabled:opacity-40"
                    >
                      Suspend
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
