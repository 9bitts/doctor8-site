import { z } from "zod";

export const nursingMedItemSchema = z.object({
  name: z.string().min(1),
  dosage: z.string().min(1),
  route: z.string().min(1),
  frequency: z.string().min(1),
  duration: z.string().optional(),
  instructions: z.string().optional(),
  catalogId: z.string().optional(),
});

export const nursingMedRxBodySchema = z.object({
  medications: z.array(nursingMedItemSchema).min(1),
  instructions: z.string().optional(),
  validDays: z.number().min(1).max(365).default(30),
  cofenCategory: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "SUSPENDED", "EXPIRED"]).optional(),
});

export type NursingMedItem = z.infer<typeof nursingMedItemSchema>;
export type NursingMedRxBody = z.infer<typeof nursingMedRxBodySchema>;
