// ADMIN + ANGEL — patient monitoring list with filters, counters and alerts.
import { NextRequest, NextResponse } from "next/server";
import { getPatientAdminSession } from "@/lib/admin";
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
  type PatientAcquisitionChannel,
} from "@/lib/admin/patient-monitoring";
import type { AdminJourneyStepKey } from "@/lib/admin/patient-journey";

export const runtime = "nodejs";

function parseFilters(req: NextRequest): PatientListFilters {
  const sp = new URL(req.url).searchParams;
  const status = sp.get("status") as PatientMonitorStatus | null;
  const origin = sp.get("origin") as PatientOrigin | null;
  const acquisitionChannel = sp.get("acquisitionChannel") as PatientAcquisitionChannel | null;
  const journeyStep = sp.get("journeyStep") as AdminJourneyStepKey | null;
  const queueAlertRaw = sp.get("queueAlertMinutes");
  const queueAlertMinutes = queueAlertRaw
    ? parseInt(queueAlertRaw, 10)
    : getDefaultQueueAlertMinutes();

  const validChannels: PatientAcquisitionChannel[] = [
    "ACURA_SOS_FORM",
    "DOCTOR8_SOS_LANDING",
    "DOCTOR8_HUMANITARIAN",
    "REGULAR",
  ];

  const validSteps: AdminJourneyStepKey[] = [
    "acura_form",
    "acura_triage",
    "d8_register",
    "d8_triage",
    "d8_tcle",
    "d8_anamnese",
    "d8_queue",
    "d8_consult",
  ];

  return {
    q: sp.get("q") ?? undefined,
    status: status ?? undefined,
    country: sp.get("country") ?? undefined,
    origin: origin === "humanitarian" || origin === "regular" ? origin : undefined,
    acquisitionChannel:
      acquisitionChannel && validChannels.includes(acquisitionChannel)
        ? acquisitionChannel
        : undefined,
    journeyStep:
      journeyStep && validSteps.includes(journeyStep) ? journeyStep : undefined,
    needsAttention: sp.get("needsAttention") === "1",
    registeredFrom: sp.get("registeredFrom") ?? undefined,
    registeredTo: sp.get("registeredTo") ?? undefined,
    lastSpecialty: sp.get("lastSpecialty") ?? undefined,
    sort: (sp.get("sort") as PatientListFilters["sort"]) ?? "newest",
    queueAlertMinutes,
    reviewed: (sp.get("reviewed") as PatientListFilters["reviewed"]) ?? undefined,
  };
}

export async function GET(req: NextRequest) {
  const session = await getPatientAdminSession();
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
