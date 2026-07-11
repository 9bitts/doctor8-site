// ADMIN + ANGEL — patient monitoring list with filters, counters and alerts.
import { NextRequest, NextResponse } from "next/server";
import { getPatientAdminSession } from "@/lib/admin";
import {
  buildFullMonitoringAlerts,
  buildFullMonitoringCounters,
  filterAndSortMonitoringRows,
  getDefaultQueueAlertMinutes,
  listDistinctCountries,
  listDistinctSpecialties,
  loadFullMonitoringData,
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

  const validStatuses: PatientMonitorStatus[] = [
    "IN_QUEUE",
    "IN_CONSULT",
    "ATTENDED",
    "INACTIVE",
    "PROBLEM",
    "PENDING_D8_REGISTRATION",
  ];

  return {
    q: sp.get("q") ?? undefined,
    status:
      status && validStatuses.includes(status) ? status : undefined,
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

  const { patientContexts, unlinkedIntakeContexts } =
    await loadFullMonitoringData(queueAlertMinutes);
  const patients = filterAndSortMonitoringRows(
    patientContexts,
    unlinkedIntakeContexts,
    filters,
  );
  const counters = buildFullMonitoringCounters(patientContexts, unlinkedIntakeContexts);
  const alerts = buildFullMonitoringAlerts(patientContexts, unlinkedIntakeContexts);

  return NextResponse.json({
    patients,
    counters,
    alerts,
    filters: {
      countries: listDistinctCountries(patientContexts),
      specialties: listDistinctSpecialties(patientContexts),
      queueAlertMinutes,
    },
    fetchedAt: new Date().toISOString(),
  });
}
