import { z } from "zod";

export const saeDiagnosisItemSchema = z.object({
  id: z.string(),
  code: z.string().optional(),
  label: z.string(),
});

export const saeHistorySchema = z.object({
  chiefComplaint: z.string().optional(),
  allergies: z.string().optional(),
  medications: z.string().optional(),
  pastHistory: z.string().optional(),
  familyHistory: z.string().optional(),
  socialHistory: z.string().optional(),
});

export const saeAssessmentSchema = z.object({
  generalAppearance: z.string().optional(),
  vitalSigns: z.string().optional(),
  skin: z.string().optional(),
  respiratory: z.string().optional(),
  cardiovascular: z.string().optional(),
  neurological: z.string().optional(),
  gastrointestinal: z.string().optional(),
  notes: z.string().optional(),
});

export const saePlanSchema = z.object({
  goals: z.string().optional(),
  interventions: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

export const saeImplementationSchema = z.object({
  actions: z.string().optional(),
  evaluation: z.string().optional(),
  notes: z.string().optional(),
});

export const saeDataSchema = z.object({
  history: saeHistorySchema.default({}),
  assessment: saeAssessmentSchema.default({}),
  diagnoses: z.array(saeDiagnosisItemSchema).default([]),
  plan: saePlanSchema.default({}),
  implementation: saeImplementationSchema.default({}),
});

export const saeBodySchema = z.object({
  data: saeDataSchema,
});

export type SaeData = z.infer<typeof saeDataSchema>;
