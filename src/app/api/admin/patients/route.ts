// ADMIN ONLY — patient monitoring list with filters, counters and alerts.
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import {
  buildMonitoringAlerts,
  buildMonitoringCounters,
  filterAndSortPatients,
  getDefaultQueueAlertMinutes,
  listDistinctCountries,
  listDistinctSpecialties,
  loadPatientMonitoringData,
  type PatientListFilters,
  type PatientMonitorStatus,
  type PatientOrigin,
} from "@/lib/admin/patient-monitoring";

export const runtime = "nodejs";

function parseFilters(req: NextRequest): PatientListFilters {
  const sp = new URL(req.url).searchParams;
  const status = sp.get("status") as PatientMonitorStatus | null;
  const origin = sp.get("origin") as PatientOrigin | null;
  const queueAlertRaw = sp.get("queueAlertMinutes");
  const queueAlertMinutes = queueAlertRaw
    ? parseInt(queueAlertRaw, 10)
    : getDefaultQueueAlertMinutes();

  return {
    q: sp.get("q") ?? undefined,
    status: status ?? undefined,
    country: sp.get("country") ?? undefined,
    origin: origin === "humanitarian" || origin === "regular" ? origin : undefined,
    registeredFrom: sp.get("registeredFrom") ?? undefined,
    registeredTo: sp.get("registeredTo") ?? undefined,
    lastSpecialty: sp.get("lastSpecialty") ?? undefined,
    sort: (sp.get("sort") as PatientListFilters["sort"]) ?? "newest",
    queueAlertMinutes,
  };
}

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const filters = parseFilters(req);
  const queueAlertMinutes = filters.queueAlertMinutes ?? getDefaultQueueAlertMinutes();

  const contexts = await loadPatientMonitoringData(queueAlertMinutes);
  const patients = filterAndSortPatients(contexts, filters);
  const counters = buildMonitoringCounters(contexts);
  const alerts = buildMonitoringAlerts(contexts);

  return NextResponse.json({
    patients,
    counters,
    alerts,
    filters: {
      countries: listDistinctCountries(contexts),
      specialties: listDistinctSpecialties(contexts),
      queueAlertMinutes,
    },
    fetchedAt: new Date().toISOString(),
  });
}
