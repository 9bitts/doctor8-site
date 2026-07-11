import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { filterPatientCharts } from "@/lib/patient-chart-search";
import type { PrescriptionMedItem } from "@/components/professional/prescriptions/PrescriptionMedItemForm";
import {
  itemKindFromMnCategoria,
  resolveMnCatalogMatches,
} from "@/lib/medicina-natural-catalog/voice-resolve";
import { isNaturalMedicineItemKind } from "@/lib/prescription-item-kind";
import type { ParsedVoiceIntent, PatientMatch, PrescriptionPrefill, VoicePortalId } from "./types";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try {
    return decrypt(v);
  } catch {
    return String(v);
  }
}

function normalizeQuery(q: string): string {
  return q
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export async function resolvePatientMatches(params: {
  providerId: string;
  portalId: VoicePortalId;
  patientName?: string | null;
  limit?: number;
}): Promise<PatientMatch[]> {
  const name = params.patientName?.trim();
  if (!name) return [];

  const limit = params.limit ?? 5;

  if (params.portalId === "INTEGRATIVE_THERAPIST") {
    const rows = await db.integrativeClientRecord.findMany({
      where: { integrativeTherapistId: params.providerId },
      select: { id: true, firstName: true, lastName: true, email: true },
      take: 200,
      orderBy: { updatedAt: "desc" },
    });
    const charts = rows.map((r) => ({
      id: r.id,
      firstName: safeDecrypt(r.firstName),
      lastName: safeDecrypt(r.lastName),
      email: r.email ? safeDecrypt(r.email) : null,
    }));
    return filterPatientCharts(charts, name, limit).map((c) => ({
      kind: "chart" as const,
      patientRecordId: c.id,
      displayName: `${c.firstName} ${c.lastName}`.trim(),
      email: c.email,
    }));
  }

  if (params.portalId === "PSYCHOANALYST") {
    const rows = await db.analysandRecord.findMany({
      where: { psychoanalystId: params.providerId },
      select: { id: true, firstName: true, lastName: true, email: true },
      take: 200,
      orderBy: { updatedAt: "desc" },
    });
    const charts = rows.map((r) => ({
      id: r.id,
      firstName: safeDecrypt(r.firstName),
      lastName: safeDecrypt(r.lastName),
      email: r.email ? safeDecrypt(r.email) : null,
    }));
    return filterPatientCharts(charts, name, limit).map((c) => ({
      kind: "chart" as const,
      patientRecordId: c.id,
      displayName: `${c.firstName} ${c.lastName}`.trim(),
      email: c.email,
    }));
  }

  const rows = await db.patientRecord.findMany({
    where: { professionalId: params.providerId },
    select: { id: true, firstName: true, lastName: true, email: true },
    take: 200,
    orderBy: { updatedAt: "desc" },
  });
  const charts = rows.map((r) => ({
    id: r.id,
    firstName: safeDecrypt(r.firstName),
    lastName: safeDecrypt(r.lastName),
    email: r.email ? safeDecrypt(r.email) : null,
  }));

  return filterPatientCharts(charts, name, limit).map((c) => ({
    kind: "chart" as const,
    patientRecordId: c.id,
    displayName: `${c.firstName} ${c.lastName}`.trim(),
    email: c.email,
  }));
}

export async function resolvePatientById(params: {
  providerId: string;
  portalId: VoicePortalId;
  patientRecordId: string;
}): Promise<PatientMatch | null> {
  if (params.portalId === "INTEGRATIVE_THERAPIST") {
    const row = await db.integrativeClientRecord.findFirst({
      where: { id: params.patientRecordId, integrativeTherapistId: params.providerId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    if (!row) return null;
    return {
      kind: "chart",
      patientRecordId: row.id,
      displayName: `${safeDecrypt(row.firstName)} ${safeDecrypt(row.lastName)}`.trim(),
      email: row.email ? safeDecrypt(row.email) : null,
    };
  }

  if (params.portalId === "PSYCHOANALYST") {
    const row = await db.analysandRecord.findFirst({
      where: { id: params.patientRecordId, psychoanalystId: params.providerId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    if (!row) return null;
    return {
      kind: "chart",
      patientRecordId: row.id,
      displayName: `${safeDecrypt(row.firstName)} ${safeDecrypt(row.lastName)}`.trim(),
      email: row.email ? safeDecrypt(row.email) : null,
    };
  }

  const row = await db.patientRecord.findFirst({
    where: { id: params.patientRecordId, professionalId: params.providerId },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  if (!row) return null;
  return {
    kind: "chart",
    patientRecordId: row.id,
    displayName: `${safeDecrypt(row.firstName)} ${safeDecrypt(row.lastName)}`.trim(),
    email: row.email ? safeDecrypt(row.email) : null,
  };
}

export async function resolveDrugMatches(drugName: string, country = "BR") {
  const q = normalizeQuery(drugName);
  if (q.length < 2) return [];

  return db.drugCatalog.findMany({
    where: {
      active: true,
      country,
      OR: [
        { searchName: { contains: q } },
        { searchIngredient: { contains: q } },
        { presentation: { contains: drugName, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      activeIngredient: true,
      presentation: true,
      controlled: true,
      prescriptionType: true,
      pharmaceuticalForm: true,
      dosage: true,
    },
    orderBy: [{ name: "asc" }],
    take: 3,
  });
}

export async function buildPrescriptionPrefill(params: {
  providerId: string;
  portalId: VoicePortalId;
  intent: ParsedVoiceIntent;
  phytoOnly?: boolean;
}): Promise<PrescriptionPrefill> {
  const meds: PrescriptionMedItem[] = [];
  const spokenMeds = params.intent.medications ?? [];

  for (const spoken of spokenMeds) {
    if (!spoken.name?.trim()) continue;

    if (params.phytoOnly) {
      const mnMatches = await resolveMnCatalogMatches(spoken.name.trim());
      const best = mnMatches[0];
      if (best) {
        meds.push({
          name: best.nome,
          dosage: spoken.dosage?.trim() || best.posologia?.slice(0, 200) || "",
          frequency: spoken.frequency?.trim() || "",
          duration: spoken.duration?.trim() || "",
          instructions: spoken.instructions?.trim() || "",
          itemKind: itemKindFromMnCategoria(best.categoriaPratica),
          mnSlug: best.slug,
          renisus: best.renisus,
        });
      } else {
        meds.push({
          name: spoken.name.trim(),
          dosage: spoken.dosage?.trim() || "",
          frequency: spoken.frequency?.trim() || "",
          duration: spoken.duration?.trim() || "",
          instructions: spoken.instructions?.trim() || "",
          itemKind: "phytotherapy",
        });
      }
      continue;
    }

    const mnHint = spoken.itemKind && isNaturalMedicineItemKind(spoken.itemKind as PrescriptionMedItem["itemKind"]);
    if (mnHint) {
      const mnMatches = await resolveMnCatalogMatches(spoken.name.trim());
      const best = mnMatches[0];
      if (best) {
        meds.push({
          name: best.nome,
          dosage: spoken.dosage?.trim() || best.posologia?.slice(0, 200) || "",
          frequency: spoken.frequency?.trim() || "",
          duration: spoken.duration?.trim() || "",
          instructions: spoken.instructions?.trim() || "",
          itemKind: itemKindFromMnCategoria(best.categoriaPratica),
          mnSlug: best.slug,
          renisus: best.renisus,
        });
        continue;
      }
    }

    const catalog = await resolveDrugMatches(spoken.name);
    const best = catalog[0];
    meds.push({
      name: best?.name || spoken.name.trim(),
      dosage: spoken.dosage?.trim() || best?.dosage || "",
      frequency: spoken.frequency?.trim() || "",
      duration: spoken.duration?.trim() || "",
      instructions: spoken.instructions?.trim() || "",
      presentation: best?.presentation || "",
      pharmaceuticalForm: best?.pharmaceuticalForm || "",
      controlled: best?.controlled ?? false,
      prescriptionType: best?.prescriptionType ?? null,
      itemKind: "medication",
    });
  }

  const matches = await resolvePatientMatches({
    providerId: params.providerId,
    portalId: params.portalId,
    patientName: params.intent.patientName,
  });

  const prefill: PrescriptionPrefill = {
    medications: meds,
    instructions: params.intent.instructions?.trim() || undefined,
    validDays: params.intent.validDays ?? undefined,
  };

  if (matches.length === 1) {
    prefill.patient = matches[0];
  } else if (matches.length > 1) {
    prefill.patientAmbiguities = matches;
    prefill.patient = matches[0];
  }

  return prefill;
}
