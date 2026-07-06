import { z } from "zod";

export const recallItemSchema = z.object({
  meal: z.string(),
  time: z.string().optional(),
  foods: z.string(),
  portion: z.string().optional(),
});

export const foodAnamnesisBodySchema = z.object({
  mealsPerDay: z.number().int().min(1).max(12).optional(),
  waterLiters: z.number().min(0).max(20).optional(),
  wakeTime: z.string().max(20).optional(),
  sleepTime: z.string().max(20).optional(),
  physicalActivity: z.string().max(100).optional(),
  dietaryRestrictions: z.string().max(2000).optional(),
  allergies: z.string().max(2000).optional(),
  medications: z.string().max(2000).optional(),
  weightGoal: z.enum(["lose", "maintain", "gain"]).optional(),
  cookingHabits: z.string().max(2000).optional(),
  weekendHabits: z.string().max(2000).optional(),
  chiefComplaint: z.string().max(2000).optional(),
  clinicalHistory: z.string().max(5000).optional(),
  familyHistory: z.string().max(5000).optional(),
  bowelHabits: z.string().max(500).optional(),
  alcoholUse: z.string().max(500).optional(),
  recall24h: z.array(recallItemSchema).optional(),
  notes: z.string().max(5000).optional(),
});

export type FoodAnamnesisData = z.infer<typeof foodAnamnesisBodySchema>;

export const ANTHRO_CONTEXTS = ["ADULT", "PREGNANT", "PEDIATRIC"] as const;
export type AnthroContext = (typeof ANTHRO_CONTEXTS)[number];
