import { z } from "zod";

export const carePlanDiagnosisSchema = z.object({
  id: z.string(),
  code: z.string().optional(),
  label: z.string().optional(),
});

export const carePlanInterventionSchema = z.object({
  id: z.string(),
  description: z.string().min(1),
  frequency: z.string().optional(),
});

export const carePlanBodySchema = z.object({
  title: z.string().min(1),
  diagnoses: z.array(carePlanDiagnosisSchema).default([]),
  interventions: z.array(carePlanInterventionSchema).default([]),
  notes: z.string().optional(),
});

export type CarePlanDiagnosis = z.infer<typeof carePlanDiagnosisSchema>;
export type CarePlanIntervention = z.infer<typeof carePlanInterventionSchema>;
export type CarePlanBody = z.infer<typeof carePlanBodySchema>;
