import { z } from "zod";

export const sixRightsSchema = z.object({
  patient: z.boolean(),
  medication: z.boolean(),
  dose: z.boolean(),
  route: z.boolean(),
  time: z.boolean(),
  documentation: z.boolean(),
});

export const medCheckBodySchema = z.object({
  sourceType: z.enum(["MEDICAL_PRESCRIPTION", "NURSING_MEDICATION_PRESCRIPTION"]),
  medicalPrescriptionId: z.string().optional(),
  nursingMedPrescriptionId: z.string().optional(),
  medicationName: z.string().min(1),
  medicationSnapshot: z.record(z.string(), z.unknown()),
  sixRights: sixRightsSchema,
  result: z.enum(["APPROVED", "DIVERGENCE", "NOT_ADMINISTERED"]),
  divergenceReason: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.sourceType === "MEDICAL_PRESCRIPTION" && !data.medicalPrescriptionId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "medicalPrescriptionId required", path: ["medicalPrescriptionId"] });
  }
  if (data.sourceType === "NURSING_MEDICATION_PRESCRIPTION" && !data.nursingMedPrescriptionId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "nursingMedPrescriptionId required", path: ["nursingMedPrescriptionId"] });
  }
  if (data.result === "DIVERGENCE" && !data.divergenceReason?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "divergenceReason required", path: ["divergenceReason"] });
  }
});

export type MedCheckBody = z.infer<typeof medCheckBodySchema>;
