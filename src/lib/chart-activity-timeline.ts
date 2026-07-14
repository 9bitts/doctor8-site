// Aggregates all patient-chart activities from clinical modules into one chronological timeline.

import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

export type ChartActivityCategory =
  | "record"
  | "dental"
  | "nutrition"
  | "nursing"
  | "pharmacy"
  | "diagnosis"
  | "vaccine"
  | "vitals"
  | "audio";

export type ChartActivityModuleKey =
  | "record"
  | "dental.anamnesis"
  | "dental.odontogram"
  | "dental.periodontogram"
  | "dental.treatmentPlan"
  | "dental.prosthetic"
  | "dental.orthodontics"
  | "dental.photos"
  | "nutrition.anamnesis"
  | "nutrition.anthropometry"
  | "nutrition.mealPlan"
  | "nutrition.intake"
  | "nutrition.foodDiary"
  | "nursing.assessment"
  | "nursing.carePlan"
  | "nursing.scale"
  | "nursing.intake"
  | "nursing.monitoring"
  | "nursing.sbar"
  | "nursing.medCheck"
  | "nursing.medRx"
  | "pharmacy.intake"
  | "pharmacy.medReview"
  | "pharmacy.reconciliation"
  | "pharmacy.monitoring"
  | "pharmacy.prescription"
  | "pharmacy.education"
  | "pharmacy.dispensing"
  | "pharmacy.interaction"
  | "diagnosis"
  | "vaccine"
  | "vitals"
  | "audio"
  | "prescription";

export interface ChartActivityEvent {
  id: string;
  type: string;
  category: ChartActivityCategory;
  moduleKey: ChartActivityModuleKey;
  title: string;
  summary: string | null;
  detail: string | null;
  at: string;
  sourceId: string | null;
}

function safeDecrypt(v: string | null | undefined): string {
  if (v == null) return "";
  try {
    return decrypt(v);
  } catch {
    return v;
  }
}

function push(events: ChartActivityEvent[], event: ChartActivityEvent): void {
  events.push(event);
}

function countJsonKeys(obj: unknown): number {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    return Object.keys(obj as Record<string, unknown>).length;
  }
  return 0;
}

function formatMedications(meds: unknown): string | null {
  if (!Array.isArray(meds) || meds.length === 0) return null;
  return meds
    .slice(0, 5)
    .map((m, i) => {
      if (typeof m !== "object" || m === null) return `${i + 1}. —`;
      const o = m as Record<string, unknown>;
      const name = String(o.name ?? o.medicationName ?? "—");
      const dose = o.dosage ?? o.dose;
      return `${i + 1}. ${name}${dose ? ` — ${dose}` : ""}`;
    })
    .join("\n");
}

export async function buildChartActivityTimeline(
  chartId: string,
): Promise<ChartActivityEvent[]> {
  const events: ChartActivityEvent[] = [];

  const [
    documents,
    odontogram,
    periodontograms,
    dentalAnamneses,
    treatmentPlans,
    prosthetics,
    orthodontics,
    photos,
    anthropometry,
    mealPlans,
    nutritionIntakes,
    foodDiaries,
    nutritionAnamneses,
    nursingAssessments,
    nursingCarePlans,
    nursingScales,
    nursingIntakes,
    nursingMonitoring,
    nursingSbars,
    nursingMedChecks,
    nursingMedRxs,
    pharmacyIntakes,
    pharmacyReviews,
    pharmacyReconciliations,
    pharmacyMonitoring,
    pharmacyPrescriptions,
    pharmacyEducation,
    pharmacyDispensing,
    pharmacyInteractions,
    diagnoses,
    vaccinations,
    metricSnapshots,
    audiograms,
  ] = await Promise.all([
    db.medicalDocument.findMany({
      where: { patientRecordId: chartId },
      include: {
        category: { select: { name: true } },
        prescriptions: { select: { medications: true }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.patientOdontogram.findUnique({ where: { patientRecordId: chartId } }),
    db.patientPeriodontogram.findMany({
      where: { patientRecordId: chartId },
      orderBy: { recordedAt: "desc" },
    }),
    db.dentalAnamnesis.findMany({
      where: { patientRecordId: chartId },
      orderBy: { createdAt: "desc" },
    }),
    db.dentalTreatmentPlan.findMany({
      where: { patientRecordId: chartId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    }),
    db.dentalProstheticOrder.findMany({
      where: { patientRecordId: chartId },
      orderBy: { orderedAt: "desc" },
    }),
    db.orthodonticRecord.findMany({
      where: { patientRecordId: chartId },
      orderBy: { createdAt: "desc" },
    }),
    db.dentalClinicalPhoto.findMany({
      where: { patientRecordId: chartId },
      orderBy: { takenAt: "desc" },
    }),
    db.nutritionAnthropometryEntry.findMany({
      where: { patientRecordId: chartId },
      orderBy: { recordedAt: "desc" },
    }),
    db.nutritionMealPlan.findMany({
      where: { patientRecordId: chartId },
      orderBy: { createdAt: "desc" },
    }),
    db.nutritionIntakeForm.findMany({
      where: { patientRecordId: chartId },
      orderBy: { sentAt: "desc" },
    }),
    db.nutritionFoodDiaryEntry.findMany({
      where: { patientRecordId: chartId },
      orderBy: { recordedAt: "desc" },
    }),
    db.nutritionFoodAnamnesis.findMany({
      where: { patientRecordId: chartId },
      orderBy: { createdAt: "desc" },
    }),
    db.nursingAssessment.findMany({
      where: { patientRecordId: chartId },
      orderBy: { createdAt: "desc" },
    }),
    db.nursingCarePlan.findMany({
      where: { patientRecordId: chartId },
      orderBy: { createdAt: "desc" },
    }),
    db.nursingScaleEntry.findMany({
      where: { patientRecordId: chartId },
      orderBy: { recordedAt: "desc" },
    }),
    db.nursingIntakeForm.findMany({
      where: { patientRecordId: chartId },
      orderBy: { sentAt: "desc" },
    }),
    db.nursingMonitoringEntry.findMany({
      where: { patientRecordId: chartId },
      orderBy: { recordedAt: "desc" },
    }),
    db.nursingSbarReport.findMany({
      where: { patientRecordId: chartId },
      orderBy: { createdAt: "desc" },
    }),
    db.nursingMedCheck.findMany({
      where: { patientRecordId: chartId },
      orderBy: { checkedAt: "desc" },
    }),
    db.nursingMedicationPrescription.findMany({
      where: { patientRecordId: chartId },
      orderBy: { createdAt: "desc" },
    }),
    db.pharmacyIntakeForm.findMany({
      where: { patientRecordId: chartId },
      orderBy: { sentAt: "desc" },
    }),
    db.pharmacyMedReview.findMany({
      where: { patientRecordId: chartId },
      orderBy: { reviewedAt: "desc" },
    }),
    db.pharmacyReconciliation.findMany({
      where: { patientRecordId: chartId },
      orderBy: { reconciledAt: "desc" },
    }),
    db.pharmacyMonitoringEntry.findMany({
      where: { patientRecordId: chartId },
      orderBy: { recordedAt: "desc" },
    }),
    db.pharmacyPrescription.findMany({
      where: { patientRecordId: chartId },
      orderBy: { createdAt: "desc" },
    }),
    db.pharmacyEducationSession.findMany({
      where: { patientRecordId: chartId },
      orderBy: { conductedAt: "desc" },
    }),
    db.pharmacyDispensingRecord.findMany({
      where: { patientRecordId: chartId },
      orderBy: { dispensedAt: "desc" },
    }),
    db.pharmacyInteractionCheck.findMany({
      where: { patientRecordId: chartId },
      orderBy: { checkedAt: "desc" },
    }),
    db.patientDiagnosis.findMany({
      where: { patientRecordId: chartId },
      orderBy: { notedAt: "desc" },
    }),
    db.patientVaccination.findMany({
      where: { patientRecordId: chartId },
      orderBy: { administeredAt: "desc" },
    }),
    db.clinicalMetricSnapshot.findMany({
      where: { patientRecordId: chartId },
      orderBy: { recordedAt: "desc" },
    }),
    db.patientAudiogram.findMany({
      where: { patientRecordId: chartId },
      orderBy: { testedAt: "desc" },
    }),
  ]);

  for (const d of documents) {
    const title = safeDecrypt(d.title);
    const content = d.content ? safeDecrypt(d.content) : null;
    const isRx = d.type === "PRESCRIPTION";
    const meds = d.prescriptions[0]?.medications;
    const medSummary = isRx ? formatMedications(meds) : null;

    push(events, {
      id: `doc-${d.id}`,
      type: isRx ? "prescription" : (d.recordKind ?? d.type).toLowerCase(),
      category: "record",
      moduleKey: isRx ? "prescription" : "record",
      title: title || (isRx ? "Prescrição" : "Registro clínico"),
      summary: medSummary ?? (d.category?.name ?? null),
      detail: content,
      at: d.createdAt.toISOString(),
      sourceId: d.id,
    });
  }

  if (odontogram) {
    const teethCount = countJsonKeys(odontogram.teeth);
    push(events, {
      id: `odonto-${odontogram.id}`,
      type: "odontogram",
      category: "dental",
      moduleKey: "dental.odontogram",
      title: "Odontograma",
      summary: teethCount > 0 ? `${teethCount} dente(s) registrado(s)` : "Odontograma iniciado",
      detail: odontogram.generalNotes,
      at: odontogram.updatedAt.toISOString(),
      sourceId: odontogram.id,
    });
  }

  for (const p of periodontograms) {
    const teethCount = countJsonKeys(p.teeth);
    push(events, {
      id: `perio-${p.id}`,
      type: "periodontogram",
      category: "dental",
      moduleKey: "dental.periodontogram",
      title: "Periodontograma",
      summary: teethCount > 0 ? `${teethCount} dente(s) avaliado(s)` : null,
      detail: p.notes,
      at: p.recordedAt.toISOString(),
      sourceId: p.id,
    });
  }

  for (const a of dentalAnamneses) {
    const statusLabel =
      a.status === "COMPLETED" ? "Concluída" : "Pendente";
    push(events, {
      id: `dental-anam-${a.id}`,
      type: "dental_anamnesis",
      category: "dental",
      moduleKey: "dental.anamnesis",
      title: "Anamnese odontológica",
      summary: statusLabel,
      detail: a.responses ? JSON.stringify(a.responses, null, 2) : null,
      at: (a.completedAt ?? a.updatedAt).toISOString(),
      sourceId: a.id,
    });
  }

  for (const plan of treatmentPlans) {
    const itemCount = plan.items.length;
    const total = (plan.totalAmountCents - plan.discountCents) / 100;
    push(events, {
      id: `plan-${plan.id}`,
      type: "treatment_plan",
      category: "dental",
      moduleKey: "dental.treatmentPlan",
      title: plan.title,
      summary: `${itemCount} procedimento(s) · R$ ${total.toFixed(2)} · ${plan.status}`,
      detail: plan.notes,
      at: (plan.approvedAt ?? plan.createdAt).toISOString(),
      sourceId: plan.id,
    });
  }

  for (const o of prosthetics) {
    push(events, {
      id: `prost-${o.id}`,
      type: "prosthetic",
      category: "dental",
      moduleKey: "dental.prosthetic",
      title: `Prótese — ${o.labName}`,
      summary: `${o.description} · ${o.status}`,
      detail: o.notes,
      at: o.orderedAt.toISOString(),
      sourceId: o.id,
    });
  }

  for (const o of orthodontics) {
    push(events, {
      id: `ortho-${o.id}`,
      type: "orthodontics",
      category: "dental",
      moduleKey: "dental.orthodontics",
      title: "Ortodontia",
      summary: `${o.applianceType} · ${o.status}`,
      detail: o.notes,
      at: (o.lastMaintenanceAt ?? o.createdAt).toISOString(),
      sourceId: o.id,
    });
  }

  for (const ph of photos) {
    push(events, {
      id: `photo-${ph.id}`,
      type: "clinical_photo",
      category: "dental",
      moduleKey: "dental.photos",
      title: "Foto clínica",
      summary: ph.caption ?? ph.category,
      detail: null,
      at: ph.takenAt.toISOString(),
      sourceId: ph.id,
    });
  }

  for (const e of anthropometry) {
    const parts: string[] = [];
    if (e.weightKg) parts.push(`${e.weightKg} kg`);
    if (e.heightCm) parts.push(`${e.heightCm} cm`);
    if (e.bmi) parts.push(`IMC ${e.bmi.toFixed(1)}`);
    push(events, {
      id: `anthro-${e.id}`,
      type: "anthropometry",
      category: "nutrition",
      moduleKey: "nutrition.anthropometry",
      title: "Antropometria",
      summary: parts.join(" · ") || null,
      detail: e.notes,
      at: e.recordedAt.toISOString(),
      sourceId: e.id,
    });
  }

  for (const p of mealPlans) {
    push(events, {
      id: `meal-${p.id}`,
      type: "meal_plan",
      category: "nutrition",
      moduleKey: "nutrition.mealPlan",
      title: p.title,
      summary: p.dailyKcalTarget ? `${p.dailyKcalTarget} kcal/dia` : null,
      detail: p.notes,
      at: p.createdAt.toISOString(),
      sourceId: p.id,
    });
  }

  for (const f of nutritionIntakes) {
    push(events, {
      id: `nutri-intake-${f.id}`,
      type: "nutrition_intake",
      category: "nutrition",
      moduleKey: "nutrition.intake",
      title: "Questionário nutricional",
      summary: f.status,
      detail: f.responses ? JSON.stringify(f.responses, null, 2) : null,
      at: (f.completedAt ?? f.sentAt).toISOString(),
      sourceId: f.id,
    });
  }

  for (const d of foodDiaries) {
    push(events, {
      id: `food-diary-${d.id}`,
      type: "food_diary",
      category: "nutrition",
      moduleKey: "nutrition.foodDiary",
      title: `Diário alimentar — ${d.mealType}`,
      summary: d.description.slice(0, 120),
      detail: d.description,
      at: d.recordedAt.toISOString(),
      sourceId: d.id,
    });
  }

  for (const a of nutritionAnamneses) {
    push(events, {
      id: `nutri-anam-${a.id}`,
      type: "nutrition_anamnesis",
      category: "nutrition",
      moduleKey: "nutrition.anamnesis",
      title: "Anamnese alimentar",
      summary: null,
      detail: a.data ? JSON.stringify(a.data, null, 2) : null,
      at: a.updatedAt.toISOString(),
      sourceId: a.id,
    });
  }

  for (const a of nursingAssessments) {
    push(events, {
      id: `nurse-sae-${a.id}`,
      type: "nursing_assessment",
      category: "nursing",
      moduleKey: "nursing.assessment",
      title: "SAE — Avaliação de enfermagem",
      summary: null,
      detail: a.data ? JSON.stringify(a.data, null, 2) : null,
      at: a.updatedAt.toISOString(),
      sourceId: a.id,
    });
  }

  for (const p of nursingCarePlans) {
    push(events, {
      id: `nurse-plan-${p.id}`,
      type: "nursing_care_plan",
      category: "nursing",
      moduleKey: "nursing.carePlan",
      title: p.title,
      summary: p.isActive ? "Ativo" : "Inativo",
      detail: p.notes,
      at: p.createdAt.toISOString(),
      sourceId: p.id,
    });
  }

  for (const s of nursingScales) {
    push(events, {
      id: `nurse-scale-${s.id}`,
      type: "nursing_scale",
      category: "nursing",
      moduleKey: "nursing.scale",
      title: `Escala — ${s.scaleType}`,
      summary: `Score: ${s.score}`,
      detail: s.notes,
      at: s.recordedAt.toISOString(),
      sourceId: s.id,
    });
  }

  for (const f of nursingIntakes) {
    push(events, {
      id: `nurse-intake-${f.id}`,
      type: "nursing_intake",
      category: "nursing",
      moduleKey: "nursing.intake",
      title: "Questionário de enfermagem",
      summary: f.status,
      detail: f.responses ? JSON.stringify(f.responses, null, 2) : null,
      at: (f.completedAt ?? f.sentAt).toISOString(),
      sourceId: f.id,
    });
  }

  for (const m of nursingMonitoring) {
    push(events, {
      id: `nurse-mon-${m.id}`,
      type: "nursing_monitoring",
      category: "nursing",
      moduleKey: "nursing.monitoring",
      title: "Monitoramento",
      summary: m.symptoms.slice(0, 120),
      detail: m.notes ? `${m.symptoms}\n\n${m.notes}` : m.symptoms,
      at: m.recordedAt.toISOString(),
      sourceId: m.id,
    });
  }

  for (const s of nursingSbars) {
    push(events, {
      id: `nurse-sbar-${s.id}`,
      type: "nursing_sbar",
      category: "nursing",
      moduleKey: "nursing.sbar",
      title: "Relatório SBAR",
      summary: s.status,
      detail: `S: ${s.situation}\n\nB: ${s.background}\n\nA: ${s.assessment}\n\nR: ${s.recommendation}`,
      at: s.createdAt.toISOString(),
      sourceId: s.id,
    });
  }

  for (const c of nursingMedChecks) {
    push(events, {
      id: `nurse-check-${c.id}`,
      type: "nursing_med_check",
      category: "nursing",
      moduleKey: "nursing.medCheck",
      title: `Checagem — ${c.medicationName}`,
      summary: c.result,
      detail: c.notes,
      at: c.checkedAt.toISOString(),
      sourceId: c.id,
    });
  }

  for (const rx of nursingMedRxs) {
    push(events, {
      id: `nurse-rx-${rx.id}`,
      type: "nursing_med_rx",
      category: "nursing",
      moduleKey: "nursing.medRx",
      title: "Prescrição de enfermagem",
      summary: formatMedications(rx.medications),
      detail: rx.instructions,
      at: rx.createdAt.toISOString(),
      sourceId: rx.id,
    });
  }

  for (const f of pharmacyIntakes) {
    push(events, {
      id: `pharma-intake-${f.id}`,
      type: "pharmacy_intake",
      category: "pharmacy",
      moduleKey: "pharmacy.intake",
      title: "Questionário farmacêutico",
      summary: f.status,
      detail: f.responses ? JSON.stringify(f.responses, null, 2) : null,
      at: (f.completedAt ?? f.sentAt).toISOString(),
      sourceId: f.id,
    });
  }

  for (const r of pharmacyReviews) {
    push(events, {
      id: `pharma-review-${r.id}`,
      type: "pharmacy_med_review",
      category: "pharmacy",
      moduleKey: "pharmacy.medReview",
      title: "Revisão farmacoterapêutica",
      summary: formatMedications(r.medications),
      detail: r.recommendations,
      at: r.reviewedAt.toISOString(),
      sourceId: r.id,
    });
  }

  for (const r of pharmacyReconciliations) {
    push(events, {
      id: `pharma-recon-${r.id}`,
      type: "pharmacy_reconciliation",
      category: "pharmacy",
      moduleKey: "pharmacy.reconciliation",
      title: "Conciliação medicamentosa",
      summary: r.sourceContext,
      detail: r.notes,
      at: r.reconciledAt.toISOString(),
      sourceId: r.id,
    });
  }

  for (const m of pharmacyMonitoring) {
    push(events, {
      id: `pharma-mon-${m.id}`,
      type: "pharmacy_monitoring",
      category: "pharmacy",
      moduleKey: "pharmacy.monitoring",
      title: `Monitoramento — ${m.metricType}`,
      summary: `${m.value}${m.unit ? ` ${m.unit}` : ""}`,
      detail: m.notes,
      at: m.recordedAt.toISOString(),
      sourceId: m.id,
    });
  }

  for (const rx of pharmacyPrescriptions) {
    push(events, {
      id: `pharma-rx-${rx.id}`,
      type: "pharmacy_prescription",
      category: "pharmacy",
      moduleKey: "pharmacy.prescription",
      title: "Prescrição farmacêutica",
      summary: formatMedications(rx.medications),
      detail: rx.instructions,
      at: rx.createdAt.toISOString(),
      sourceId: rx.id,
    });
  }

  for (const e of pharmacyEducation) {
    push(events, {
      id: `pharma-edu-${e.id}`,
      type: "pharmacy_education",
      category: "pharmacy",
      moduleKey: "pharmacy.education",
      title: `Educação — ${e.topic}`,
      summary: e.educationType,
      detail: e.content,
      at: e.conductedAt.toISOString(),
      sourceId: e.id,
    });
  }

  for (const d of pharmacyDispensing) {
    push(events, {
      id: `pharma-disp-${d.id}`,
      type: "pharmacy_dispensing",
      category: "pharmacy",
      moduleKey: "pharmacy.dispensing",
      title: "Dispensação",
      summary: d.status,
      detail: d.validationNotes ?? d.rejectionReason,
      at: d.dispensedAt.toISOString(),
      sourceId: d.id,
    });
  }

  for (const c of pharmacyInteractions) {
    push(events, {
      id: `pharma-inter-${c.id}`,
      type: "pharmacy_interaction",
      category: "pharmacy",
      moduleKey: "pharmacy.interaction",
      title: "Verificação de interações",
      summary: `Severidade: ${c.maxSeverity}`,
      detail: c.recommendations,
      at: c.checkedAt.toISOString(),
      sourceId: c.id,
    });
  }

  for (const d of diagnoses) {
    push(events, {
      id: `diag-${d.id}`,
      type: "diagnosis",
      category: "diagnosis",
      moduleKey: "diagnosis",
      title: `${d.cidCode}${d.cidLabel ? ` — ${d.cidLabel}` : ""}`,
      summary: d.status,
      detail: null,
      at: d.notedAt.toISOString(),
      sourceId: d.id,
    });
  }

  for (const v of vaccinations) {
    push(events, {
      id: `vac-${v.id}`,
      type: "vaccination",
      category: "vaccine",
      moduleKey: "vaccine",
      title: v.vaccineName,
      summary: `Dose ${v.doseNumber} · ${v.network}`,
      detail: v.notes,
      at: v.administeredAt.toISOString(),
      sourceId: v.id,
    });
  }

  for (const m of metricSnapshots) {
    const parts: string[] = [];
    if (m.weightKg) parts.push(`${m.weightKg} kg`);
    if (m.systolicBp && m.diastolicBp) parts.push(`PA ${m.systolicBp}/${m.diastolicBp}`);
    if (m.heartRate) parts.push(`FC ${m.heartRate}`);
    if (m.spo2Percent) parts.push(`SpO₂ ${m.spo2Percent}%`);
    push(events, {
      id: `vitals-${m.id}`,
      type: "vitals",
      category: "vitals",
      moduleKey: "vitals",
      title: "Sinais vitais",
      summary: parts.join(" · ") || null,
      detail: null,
      at: m.recordedAt.toISOString(),
      sourceId: m.id,
    });
  }

  for (const a of audiograms) {
    push(events, {
      id: `audio-${a.id}`,
      type: "audiogram",
      category: "audio",
      moduleKey: "audio",
      title: "Audiometria",
      summary: null,
      detail: a.notes,
      at: a.testedAt.toISOString(),
      sourceId: a.id,
    });
  }

  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return events;
}

/** Tailwind badge classes per activity category. */
export const ACTIVITY_CATEGORY_COLORS: Record<ChartActivityCategory, string> = {
  record: "bg-brand-50 text-brand-700 border-brand-200",
  dental: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  nutrition: "bg-emerald-50 text-emerald-700 border-emerald-200",
  nursing: "bg-rose-50 text-rose-700 border-rose-200",
  pharmacy: "bg-indigo-50 text-indigo-700 border-indigo-200",
  diagnosis: "bg-violet-50 text-violet-700 border-violet-200",
  vaccine: "bg-cyan-50 text-cyan-700 border-cyan-200",
  vitals: "bg-orange-50 text-orange-700 border-orange-200",
  audio: "bg-sky-50 text-sky-700 border-sky-200",
};

/** Timeline dot colors per category. */
export const ACTIVITY_CATEGORY_DOT: Record<ChartActivityCategory, string> = {
  record: "bg-brand-400",
  dental: "bg-fuchsia-400",
  nutrition: "bg-emerald-400",
  nursing: "bg-rose-400",
  pharmacy: "bg-indigo-400",
  diagnosis: "bg-violet-400",
  vaccine: "bg-cyan-400",
  vitals: "bg-orange-400",
  audio: "bg-sky-400",
};

/** Map module keys to portal paths (without query string). */
export const ACTIVITY_MODULE_PATHS: Record<ChartActivityModuleKey, string> = {
  record: "/professional/patients",
  prescription: "/professional/prescriptions",
  "dental.anamnesis": "/odontologo/anamnese",
  "dental.odontogram": "/odontologo/odontograma",
  "dental.periodontogram": "/odontologo/periodontograma",
  "dental.treatmentPlan": "/odontologo/plano-tratamento",
  "dental.prosthetic": "/odontologo/protese",
  "dental.orthodontics": "/odontologo/ortodontia",
  "dental.photos": "/odontologo/fotos",
  "nutrition.anamnesis": "/nutricionista/anamnese",
  "nutrition.anthropometry": "/nutricionista/antropometria",
  "nutrition.mealPlan": "/nutricionista/planos",
  "nutrition.intake": "/nutricionista/anamnese",
  "nutrition.foodDiary": "/nutricionista/diario",
  "nursing.assessment": "/enfermeiro/sae",
  "nursing.carePlan": "/enfermeiro/prescricao",
  "nursing.scale": "/enfermeiro/escalas",
  "nursing.intake": "/enfermeiro/sae",
  "nursing.monitoring": "/enfermeiro/monitoramento",
  "nursing.sbar": "/enfermeiro/sbar",
  "nursing.medCheck": "/enfermeiro/checagem",
  "nursing.medRx": "/enfermeiro/medicamentos",
  "pharmacy.intake": "/farmaceutico/revisao",
  "pharmacy.medReview": "/farmaceutico/revisao",
  "pharmacy.reconciliation": "/farmaceutico/conciliacao",
  "pharmacy.monitoring": "/farmaceutico/monitoramento",
  "pharmacy.prescription": "/farmaceutico/prescricao",
  "pharmacy.education": "/farmaceutico/educacao",
  "pharmacy.dispensing": "/farmaceutico/dispensacao",
  "pharmacy.interaction": "/farmaceutico/interacoes",
  diagnosis: "/professional/patients",
  vaccine: "/professional/patients",
  vitals: "/professional/patients",
  audio: "/professional/patients",
};

export type ActivityTimelineFilter = "all" | ChartActivityCategory;

export function countActivityByCategory(
  events: ChartActivityEvent[],
): Partial<Record<ActivityTimelineFilter, number>> {
  const counts: Partial<Record<ActivityTimelineFilter, number>> = { all: events.length };
  for (const e of events) {
    counts[e.category] = (counts[e.category] ?? 0) + 1;
  }
  return counts;
}

export function filterActivityEvents(
  events: ChartActivityEvent[],
  filter: ActivityTimelineFilter,
): ChartActivityEvent[] {
  if (filter === "all") return events;
  return events.filter((e) => e.category === filter);
}
