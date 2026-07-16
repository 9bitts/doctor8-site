"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Heart,
  Loader2,
  RefreshCw,
  Radio,
  Users,
  CheckCircle2,
  Power,
  Download,
  Maximize2,
  Minimize2,
  Clock,
  PhoneCall,
} from "lucide-react";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import HumanitarianLiveBoard from "@/components/humanitarian/HumanitarianLiveBoard";
import HumanitarianAgendaPanel from "@/components/humanitarian/HumanitarianAgendaPanel";
import HumanitarianHistoryPanel from "@/components/humanitarian/HumanitarianHistoryPanel";
import HumanitarianProgramsPanel from "@/components/humanitarian/HumanitarianProgramsPanel";
import type { HumanitarianLiveOpsDto } from "@/lib/humanitarian/admin-live";
import { useI18n } from "@/lib/i18n/I18nProvider";

type Tab = "live" | "agenda" | "history" | "programs";

function kpiTone(
  kind: "waiting" | "called" | "consult" | "free" | "busy" | "done",
  value: number,
  oldestWait: number | null,
): string {
  if (kind === "waiting" && (value > 10 || (oldestWait != null && oldestWait >= 30))) {
    return "text-rose-600 bg-rose-50 border-rose-100";
  }
  if (kind === "waiting" && value > 0) return "text-amber-700 bg-amber-50 border-amber-100";
  if (kind === "called" && value > 0) return "text-blue-700 bg-blue-50 border-blue-100";
  if (kind === "consult") return "text-blue-700 bg-blue-50 border-blue-100";
  if (kind === "free" && value === 0) return "text-rose-600 bg-rose-50 border-rose-100";
  if (kind === "free") return "text-emerald-700 bg-emerald-50 border-emerald-100";
  if (kind === "busy") return "text-slate-700 bg-slate-50 border-slate-100";
  return "text-emerald-700 bg-emerald-50 border-emerald-100";
}

export default function AdminHumanitarianPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("live");
  const [ops, setOps] = useState<HumanitarianLiveOpsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [wallboard, setWallboard] = useState(false);

  const loadLive = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/humanitarian/live?slug=${encodeURIComponent(VENEZUELA_CAMPAIGN_SLUG)}`,
      );
      const data = await res.json();
      if (res.ok && data.ops) setOps(data.ops);
      else if (res.status === 404) setOps(null);
    } catch {
      /* ignore */
    }
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    loadLive();
    const interval = setInterval(() => loadLive(true), 15000);
    return () => clearInterval(interval);
  }, [loadLive]);

  useEffect(() => {
    if (!wallboard) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setWallboard(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [wallboard]);

  async function seedVenezuela() {
    setSeeding(true);
    try {
      await fetch("/api/admin/humanitarian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed-venezuela" }),
      });
      await loadLive();
    } catch {
      /* ignore */
    }
    setSeeding(false);
  }

  async function toggleActive(slug: string, active: boolean) {
    setToggling(true);
    try {
      await fetch("/api/admin/humanitarian", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, active }),
      });
      await loadLive();
    } catch {
      /* ignore */
    }
    setToggling(false);
  }

  async function exportCsv(type: "queue" | "intakes" = "queue") {
    setExporting(true);
    try {
      const res = await fetch(
        `/api/admin/humanitarian/export?slug=${encodeURIComponent(VENEZUELA_CAMPAIGN_SLUG)}&type=${type}`,
      );
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `humanitarian-${type}-${VENEZUELA_CAMPAIGN_SLUG}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
    setExporting(false);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "live", label: t("admin.humanitarian.tabLive") },
    { id: "agenda", label: t("admin.humanitarian.tabAgenda") },
    { id: "history", label: t("admin.humanitarian.tabHistory") },
    { id: "programs", label: t("admin.humanitarian.tabPrograms") },
  ];

  const kpis = ops
    ? [
        {
          label: t("admin.humanitarian.statWaiting"),
          value: ops.totals.waiting,
          icon: Radio,
          kind: "waiting" as const,
        },
        {
          label: t("admin.humanitarian.statCalled"),
          value: ops.totals.called,
          icon: PhoneCall,
          kind: "called" as const,
        },
        {
          label: t("admin.humanitarian.statInConsult"),
          value: ops.totals.inConsult,
          icon: Users,
          kind: "consult" as const,
        },
        {
          label: t("admin.humanitarian.statFree"),
          value: ops.totals.free,
          icon: Heart,
          kind: "free" as const,
        },
        {
          label: t("admin.humanitarian.statBusy"),
          value: ops.totals.busy,
          icon: Users,
          kind: "busy" as const,
        },
        {
          label: t("admin.humanitarian.statCompletedToday"),
          value: ops.totals.completedToday,
          icon: CheckCircle2,
          kind: "done" as const,
        },
      ]
    : [];

  const shell = (
    <div
      className={
        wallboard
          ? "fixed inset-0 z-[100] bg-slate-950 text-white overflow-y-auto p-6"
          : "max-w-6xl mx-auto space-y-5 pb-10"
      }
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Heart size={22} className={wallboard ? "text-rose-400" : "text-rose-500"} />
          <div>
            <h1
              className={`font-bold ${wallboard ? "text-2xl text-white" : "text-2xl text-slate-900"}`}
            >
              {t("admin.humanitarian.title")}
            </h1>
            <p className={`text-sm ${wallboard ? "text-slate-400" : "text-slate-500"}`}>
              {t("admin.humanitarian.subtitle")}
              {ops?.fetchedAt && (
                <span className="ml-2">
                  · {new Date(ops.fetchedAt).toLocaleTimeString("pt-BR")}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setWallboard((w) => !w)}
            className={`px-3 py-2 rounded-xl border text-sm font-medium flex items-center gap-2 ${
              wallboard
                ? "border-slate-600 text-slate-200"
                : "border-slate-200 text-slate-700"
            }`}
            title={t("admin.humanitarian.wallboard")}
          >
            {wallboard ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {wallboard ? "Esc" : t("admin.humanitarian.wallboard")}
          </button>
          <button
            type="button"
            onClick={() => loadLive()}
            className={`px-4 py-2 rounded-xl border text-sm font-medium flex items-center gap-2 ${
              wallboard ? "border-slate-600" : "border-slate-200"
            }`}
          >
            <RefreshCw size={14} /> {t("admin.humanitarian.refresh")}
          </button>
          {!wallboard && (
            <button
              type="button"
              onClick={seedVenezuela}
              disabled={seeding}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              {seeding ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
              {t("admin.humanitarian.seedVenezuela")}
            </button>
          )}
        </div>
      </div>

      {!wallboard && (
        <>
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-sm text-rose-900 space-y-2">
            <p className="font-medium">{t("admin.humanitarian.linksTitle")}</p>
            <p className="text-rose-800">
              {t("admin.humanitarian.publicLanding")}{" "}
              <code className="bg-white/80 px-1 rounded">/sos-venezuela</code>
              {" · "}
              {t("admin.humanitarian.patientsPath")}{" "}
              <code className="bg-white/80 px-1 rounded">
                /humanitarian/{VENEZUELA_CAMPAIGN_SLUG}
              </code>
              {" · "}
              {t("admin.humanitarian.volunteersPath")}{" "}
              <code className="bg-white/80 px-1 rounded">/humanitarian/volunteer</code>
            </p>
          </div>

          <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
            {tabs.map((tb) => (
              <button
                key={tb.id}
                type="button"
                onClick={() => setTab(tb.id)}
                className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
                  tab === tb.id
                    ? "border-emerald-500 text-emerald-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {tb.label}
              </button>
            ))}
          </div>
        </>
      )}

      {(tab === "live" || wallboard) && (
        <div className="space-y-4">
          {loading && !ops ? (
            <Loader2 size={24} className="animate-spin text-emerald-500" />
          ) : !ops ? (
            <p className={`text-sm ${wallboard ? "text-slate-400" : "text-slate-500"}`}>
              {t("admin.humanitarian.noCampaigns")}
            </p>
          ) : (
            <>
              <div
                className={`flex items-start justify-between gap-4 flex-wrap ${
                  wallboard ? "" : "bg-white border border-slate-100 rounded-2xl p-5 shadow-sm"
                }`}
              >
                <div>
                  <h2
                    className={`font-bold text-lg ${wallboard ? "text-white" : "text-slate-900"}`}
                  >
                    {ops.name}
                  </h2>
                  <p className={`text-xs ${wallboard ? "text-slate-400" : "text-slate-500"}`}>
                    {ops.slug}
                  </p>
                </div>
                {!wallboard && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      disabled={exporting}
                      onClick={() => exportCsv("queue")}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {exporting ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Download size={12} />
                      )}
                      {t("admin.humanitarian.csvQueue")}
                    </button>
                    <button
                      type="button"
                      disabled={exporting}
                      onClick={() => exportCsv("intakes")}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Download size={12} />
                      {t("admin.humanitarian.csvIntakes")}
                    </button>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        ops.active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {ops.active
                        ? t("admin.humanitarian.active")
                        : t("admin.humanitarian.paused")}
                    </span>
                    <button
                      type="button"
                      disabled={toggling}
                      onClick={() => toggleActive(ops.slug, !ops.active)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {ops.active
                        ? t("admin.humanitarian.pause")
                        : t("admin.humanitarian.activate")}
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {kpis.map((stat) => {
                  const tone = wallboard
                    ? "bg-slate-900 border-slate-700 text-white"
                    : kpiTone(stat.kind, Number(stat.value), ops.totals.oldestWaitMinutes);
                  return (
                    <div
                      key={stat.label}
                      className={`rounded-xl p-3 border ${tone}`}
                    >
                      <p
                        className={`text-xs ${wallboard ? "text-slate-400" : "opacity-80"}`}
                      >
                        {stat.label}
                      </p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                  );
                })}
              </div>

              <div
                className={`flex flex-wrap gap-4 text-xs ${
                  wallboard ? "text-slate-400" : "text-slate-500"
                }`}
              >
                <span>
                  {t("admin.humanitarian.noShowToday").replace(
                    "{{n}}",
                    String(ops.totals.noShowsToday),
                  )}
                </span>
                {ops.totals.avgWaitMinutesToday != null && (
                  <span>
                    {t("admin.humanitarian.avgWait").replace(
                      "{{n}}",
                      String(ops.totals.avgWaitMinutesToday),
                    )}
                  </span>
                )}
                {ops.totals.oldestWaitMinutes != null && (
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} />
                    {t("admin.humanitarian.oldestWait").replace(
                      "{{n}}",
                      String(ops.totals.oldestWaitMinutes),
                    )}
                  </span>
                )}
              </div>

              {/* Pool summary table */}
              {!wallboard && (
                <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 border-b">
                        <th className="pb-2 pr-4">{t("admin.humanitarian.colPool")}</th>
                        <th className="pb-2 pr-4">{t("admin.humanitarian.colWaiting")}</th>
                        <th className="pb-2 pr-4">{t("admin.humanitarian.colCrisis")}</th>
                        <th className="pb-2 pr-4">{t("admin.humanitarian.colCap")}</th>
                        <th className="pb-2 pr-4">{t("admin.humanitarian.colToday")}</th>
                        <th className="pb-2">{t("admin.humanitarian.colVolunteers")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ops.report.pools.map((p) => (
                        <tr key={p.slug} className="border-b border-slate-50">
                          <td className="py-2.5 pr-4 font-medium">{p.labelEs}</td>
                          <td className="py-2.5 pr-4">{p.waiting}</td>
                          <td className="py-2.5 pr-4">
                            {p.crisisWaiting > 0 ? (
                              <span className="text-rose-600 font-semibold">
                                {p.crisisWaiting}
                              </span>
                            ) : (
                              "0"
                            )}
                          </td>
                          <td className="py-2.5 pr-4">{p.maxWaiting}</td>
                          <td className="py-2.5 pr-4">{p.completedToday}</td>
                          <td className="py-2.5">
                            {t("admin.humanitarian.volFreeBusy")
                              .replace("{{free}}", String(p.volunteersOnline))
                              .replace("{{busy}}", String(p.volunteersBusy))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <HumanitarianLiveBoard
                ops={ops}
                onRefresh={() => loadLive(true)}
                wallboard={wallboard}
              />
            </>
          )}
        </div>
      )}

      {!wallboard && tab === "agenda" && (
        <HumanitarianAgendaPanel slug={VENEZUELA_CAMPAIGN_SLUG} />
      )}
      {!wallboard && tab === "history" && (
        <HumanitarianHistoryPanel slug={VENEZUELA_CAMPAIGN_SLUG} />
      )}
      {!wallboard && tab === "programs" && (
        <HumanitarianProgramsPanel slug={VENEZUELA_CAMPAIGN_SLUG} />
      )}
    </div>
  );

  return shell;
}
