import type { PlatformPortalId } from "@/lib/platform-nav-registry";
import type { PrescriptionMedItem } from "@/components/professional/prescriptions/PrescriptionMedItemForm";
import type { Lang } from "@/lib/i18n/translations";

/** Clinical provider portals that support the voice assistant. */
export type VoicePortalId = Extract<
  PlatformPortalId,
  | "PROFESSIONAL"
  | "PSYCHOLOGIST"
  | "NUTRITIONIST"
  | "NURSE"
  | "PHARMACIST"
  | "DENTIST"
  | "PSYCHOANALYST"
  | "INTEGRATIVE_THERAPIST"
>;

export type VoiceSkillId =
  | "navigate"
  | "prescribe"
  | "clinical_note"
  | "search_patient"
  | "schedule"
  | "sbar_note"
  | "sae_note"
  | "med_review"
  | "anamnesis"
  | "meal_plan"
  | "exam_request"
  | "clinical_document";

export type VoiceFormType =
  | "sbar"
  | "sae"
  | "care_plan"
  | "med_review"
  | "reconciliation"
  | "session_note"
  | "nutrition_anamnesis"
  | "dental_anamnesis"
  | "treatment_plan"
  | "chart_evolution"
  | "meal_plan"
  | "exam_request"
  | "clinical_document";

export type SbarPrefill = {
  situation?: string;
  background?: string;
  assessment?: string;
  recommendation?: string;
  recipientNote?: string;
};

export type SaePrefill = {
  history?: {
    chiefComplaint?: string;
    allergies?: string;
    medications?: string;
    pastHistory?: string;
    familyHistory?: string;
    socialHistory?: string;
  };
  assessment?: {
    generalAppearance?: string;
    vitalSigns?: string;
    skin?: string;
    respiratory?: string;
    cardiovascular?: string;
    neurological?: string;
    gastrointestinal?: string;
    notes?: string;
  };
  diagnoses?: Array<{ id: string; code?: string; label: string }>;
  plan?: {
    goals?: string;
    interventions?: string[];
    notes?: string;
  };
  implementation?: {
    actions?: string;
    evaluation?: string;
    notes?: string;
  };
};

export type CarePlanPrefill = {
  title?: string;
  interventionText?: string;
  notes?: string;
  diagnosisLabels?: string[];
};

export type MedReviewPrefill = {
  medications?: Array<{ name: string; dosage?: string; route?: string; frequency?: string }>;
  problems?: Array<{ type: string; description: string; severity?: string }>;
  recommendations?: string;
  adherenceNotes?: string;
};

export type ReconciliationPrefill = {
  sourceContext?: string;
  notes?: string;
  medicationsBefore?: Array<{ name: string; dosage?: string }>;
  medicationsAfter?: Array<{ name: string; dosage?: string }>;
};

export type SessionNotePrefill = {
  format?: "DAP" | "BIRP" | "SOAP" | "FREE";
  fields: Record<string, string>;
  rawNotes?: string;
  durationMins?: number;
};

export type NutritionAnamnesisPrefill = {
  chiefComplaint?: string;
  clinicalHistory?: string;
  familyHistory?: string;
  allergies?: string;
  medications?: string;
  dietaryRestrictions?: string;
  physicalActivity?: string;
  weightGoal?: string;
  bowelHabits?: string;
  alcoholUse?: string;
  notes?: string;
};

export type DentalAnamnesisPrefill = {
  chiefComplaint?: string;
  responses?: Record<string, string | boolean>;
};

export type TreatmentPlanPrefill = {
  items?: Array<{ description: string; toothNumbers?: number[]; procedureCode?: string }>;
  discountCents?: number;
};

export type ChartEvolutionPrefill = {
  draft: string;
  title?: string;
};

export type MealPlanPrefill = {
  title?: string;
  dailyKcalTarget?: number;
  meals?: Array<{ name: string; items?: Array<{ foodName: string; portionG?: number }> }>;
  notes?: string;
};

export type ExamRequestPrefill = {
  title?: string;
  examItems?: string[];
  notes?: string;
  cid?: string;
};

export type ClinicalDocumentPrefill = {
  documentType?: "CERTIFICATE" | "REPORT" | "OTHER";
  title?: string;
  body?: string;
};

export type VoiceFormData =
  | SbarPrefill
  | SaePrefill
  | CarePlanPrefill
  | MedReviewPrefill
  | ReconciliationPrefill
  | SessionNotePrefill
  | NutritionAnamnesisPrefill
  | DentalAnamnesisPrefill
  | TreatmentPlanPrefill
  | ChartEvolutionPrefill
  | MealPlanPrefill
  | ExamRequestPrefill
  | ClinicalDocumentPrefill;

export type VoiceSkill = {
  id: VoiceSkillId;
  labelKey: string;
  route?: string;
  description: string;
  examples: string[];
};

export type ParsedVoiceIntent = {
  skillId: VoiceSkillId;
  confidence: number;
  patientName?: string | null;
  medications?: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
    itemKind?: string;
  }>;
  clinicalText?: string | null;
  targetRoute?: string | null;
  targetLabel?: string | null;
  instructions?: string | null;
  validDays?: number | null;
  scheduleHint?: string | null;
  rawSummary?: string | null;
  examItems?: string[] | null;
  documentType?: string | null;
};

export type PatientMatch = {
  kind: "chart" | "platform";
  patientRecordId?: string;
  patientUserId?: string;
  displayName: string;
  email?: string | null;
};

export type PrescriptionPrefill = {
  patient?: PatientMatch;
  patientAmbiguities?: PatientMatch[];
  medications: PrescriptionMedItem[];
  instructions?: string;
  validDays?: number;
};

export type VoiceProcessResult =
  | {
      action: "navigate";
      route: string;
      message: string;
      transcript: string;
    }
  | {
      action: "prescription_prefill";
      route: string;
      message: string;
      transcript: string;
      prefill: PrescriptionPrefill;
    }
  | {
      action: "form_prefill";
      route: string;
      message: string;
      transcript: string;
      formType: VoiceFormType;
      patientRecordId?: string;
      patientName?: string;
      data: VoiceFormData;
    }
  | {
      action: "clinical_note";
      message: string;
      transcript: string;
      draft: string;
      patientRecordId?: string;
      patientName?: string;
      chartRoute?: string;
    }
  | {
      action: "clarify";
      message: string;
      transcript: string;
      question: string;
      options?: string[];
    }
  | {
      action: "unknown";
      message: string;
      transcript: string;
    };

export type VoicePrefillPayload =
  | {
      type: "prescription";
      portalId: VoicePortalId;
      prefill: PrescriptionPrefill;
      createdAt: number;
    }
  | {
      type: "form";
      portalId: VoicePortalId;
      formType: VoiceFormType;
      patientRecordId?: string;
      patientName?: string;
      data: VoiceFormData;
      createdAt: number;
    };

export type VoiceSessionContext = {
  portalId: VoicePortalId;
  patientRecordId?: string;
  patientName?: string;
  updatedAt: number;
};

/** Logged-in provider profile fields used to tailor voice skills and navigation. */
export type VoiceProfileContext = {
  specialty?: string | null;
  practicesIntegrativeMedicine?: boolean;
  picsPractices?: string[];
};

export const VOICE_PREFILL_STORAGE_KEY = "doctor8:voiceAssistant:prefill";
export const VOICE_FORM_PREFILL_STORAGE_KEY = "doctor8:voiceAssistant:formPrefill";
export const VOICE_NOTE_STORAGE_KEY = "doctor8:voiceAssistant:clinicalNote";
export const VOICE_SESSION_STORAGE_KEY = "doctor8:voiceAssistant:session";

export const VOICE_PRESCRIPTION_PREFILL_EVENT = "doctor8:voice-assistant:prescription-prefill";
export const VOICE_FORM_PREFILL_EVENT = "doctor8:voice-assistant:form-prefill";
