import { z } from "zod";

export const medicationItemSchema = z.object({
  name: z.string().min(1),
  dosage: z.string().optional(),
  route: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  instructions: z.string().optional(),
});

export const medReviewBodySchema = z.object({
  medications: z.array(medicationItemSchema).min(1),
  problems: z.array(z.object({
    type: z.string(),
    description: z.string(),
    severity: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  })).default([]),
  recommendations: z.string().optional(),
  adherenceNotes: z.string().optional(),
  followUpAt: z.string().datetime().optional(),
});

export const reconciliationBodySchema = z.object({
  sourceContext: z.string().min(1),
  medicationsBefore: z.array(medicationItemSchema),
  medicationsAfter: z.array(medicationItemSchema),
  discrepancies: z.array(z.object({
    medication: z.string(),
    type: z.enum(["OMISSION", "COMMISSION", "DOSE", "FREQUENCY", "OTHER"]),
    note: z.string().optional(),
  })).default([]),
  notes: z.string().optional(),
});

export const pharmaPrescriptionBodySchema = z.object({
  medications: z.array(medicationItemSchema).min(1),
  instructions: z.string().optional(),
  validUntil: z.string().datetime().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "SUSPENDED", "EXPIRED"]).optional(),
});

export const educationBodySchema = z.object({
  topic: z.string().min(1),
  educationType: z.enum(["MEDICATION", "DISEASE", "LIFESTYLE", "ADHERENCE", "OTHER"]).optional(),
  content: z.string().min(1),
  materials: z.array(z.object({ title: z.string(), url: z.string().optional() })).optional(),
  patientFeedback: z.string().optional(),
  durationMin: z.number().int().positive().optional(),
});

export const dispensingBodySchema = z.object({
  prescriptionId: z.string().optional(),
  prescriptionSnapshot: z.record(z.unknown()),
  medicationsDispensed: z.array(z.object({
    name: z.string(),
    quantity: z.string().optional(),
    batch: z.string().optional(),
  })).min(1),
  status: z.enum(["VALIDATED", "DISPENSED", "PARTIAL", "REJECTED"]),
  validationNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export const interactionCheckBodySchema = z.object({
  medications: z.array(medicationItemSchema).min(2),
  recommendations: z.string().optional(),
});

export const intakeFormBodySchema = z.object({
  appointmentId: z.string().optional(),
});

export const patientMonitoringBodySchema = z.object({
  chartId: z.string().min(1),
  metricType: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().optional(),
  medicationName: z.string().optional(),
  notes: z.string().optional(),
});

export type MedicationItem = z.infer<typeof medicationItemSchema>;
