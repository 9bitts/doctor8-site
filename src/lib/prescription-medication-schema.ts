import { z } from "zod";

export const PRESCRIPTION_ITEM_KINDS = [
  "medication",
  "device",
  "phytotherapy",
  "floral",
  "homeopathy",
  "aromatherapy",
  "apitherapy",
  "cannabis",
] as const;

export type PrescriptionItemKindZod = (typeof PRESCRIPTION_ITEM_KINDS)[number];

const STRUCTURED_KINDS = new Set<PrescriptionItemKindZod>(["medication"]);

export const prescriptionMedicationItemSchema = z
  .object({
    name: z.string().min(1),
    dosage: z.string().optional(),
    frequency: z.string().optional(),
    duration: z.string().optional(),
    instructions: z.string().optional(),
    continuousUse: z.boolean().optional(),
    presentation: z.string().optional(),
    pharmaceuticalForm: z.string().optional(),
    itemKind: z.enum(PRESCRIPTION_ITEM_KINDS).optional(),
    mnSlug: z.string().optional(),
    renisus: z.boolean().optional(),
    phytoProductId: z.string().optional(),
    floralProductId: z.string().optional(),
  })
  .superRefine((item, ctx) => {
    const kind = item.itemKind || "medication";
    if (STRUCTURED_KINDS.has(kind)) {
      if (!item.dosage?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "dosage required",
          path: ["dosage"],
        });
      }
      if (!item.frequency?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "frequency required",
          path: ["frequency"],
        });
      }
    }
  });

export function integrativeMedicationItemSchema() {
  return prescriptionMedicationItemSchema.superRefine((item, ctx) => {
    const kind = item.itemKind || "phytotherapy";
    const allowed = new Set<PrescriptionItemKindZod>([
      "phytotherapy",
      "floral",
      "homeopathy",
      "aromatherapy",
      "apitherapy",
    ]);
    if (!allowed.has(kind)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "only natural medicine items allowed",
        path: ["itemKind"],
      });
    }
  });
}
