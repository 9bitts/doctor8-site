import { z } from "zod";

export const sbarBodySchema = z.object({
  situation: z.string().min(1),
  background: z.string().min(1),
  assessment: z.string().min(1),
  recommendation: z.string().min(1),
  recipientNote: z.string().optional(),
  appointmentId: z.string().optional(),
  status: z.enum(["DRAFT", "SENT"]).optional(),
});

export type SbarBody = z.infer<typeof sbarBodySchema>;
