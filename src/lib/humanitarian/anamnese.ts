import { z } from "zod";

export const ANAMNESE_SERVICE_TYPES = [
  "medico",
  "psicologo",
  "psicanalista",
  "fisioterapeuta",
  "nutricionista",
  "terapeuta_integrativo",
  "cuidados_paliativos",
  "nao_sei",
] as const;

export type AnamneseServiceType = (typeof ANAMNESE_SERVICE_TYPES)[number];

export const identificationSchema = z.object({
  fullName: z.string().max(200).optional(),
  ageOrDob: z.string().max(50).optional(),
  sex: z.string().max(20).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().max(200).optional(),
  state: z.string().max(100).optional(),
  municipality: z.string().max(100).optional(),
  shelterStatus: z.enum(["abrigo", "casa"]).optional(),
  housingDamage: z.enum(["destruida", "danificada", "intacta"]).optional(),
  householdSize: z.string().max(20).optional(),
  deathsOrMissing: z.boolean().optional(),
  accessWaterFoodMeds: z.enum(["sim", "parcial", "nao"]).optional(),
});

export const serviceTypesSchema = z.object({
  serviceTypes: z.array(z.enum(ANAMNESE_SERVICE_TYPES)).min(1),
});

export const medicoSpecialtySchema = z.object({
  chiefReason: z.string().max(2000).optional(),
  physicalSymptoms: z.array(z.string()).optional(),
  chronicConditions: z.string().max(1000).optional(),
  medications: z.string().max(1000).optional(),
  allergies: z.string().max(500).optional(),
  seenDoctorSince: z.boolean().optional(),
});

export const psicologoSpecialtySchema = z.object({
  emotionalScale: z.number().min(0).max(10).optional(),
  emotionalSymptoms: z.array(z.string()).optional(),
  lostFamily: z.boolean().optional(),
  dependentsOk: z.boolean().optional(),
  priorSupport: z.boolean().optional(),
});

export const psicanalistaSpecialtySchema = z.object({
  reason: z.string().max(2000).optional(),
  safeSpace: z.string().max(2000).optional(),
  preferEarthquakeTopic: z.enum(["sim", "nao", "talvez"]).optional(),
});

export const fisioterapeutaSpecialtySchema = z.object({
  painLocation: z.string().max(500).optional(),
  painAfterEarthquake: z.boolean().optional(),
  canMoveLimbs: z.boolean().optional(),
  swellingOrNumbness: z.string().max(500).optional(),
});

export const nutricionistaSpecialtySchema = z.object({
  mealsPerDay: z.string().max(20).optional(),
  variedFoodAccess: z.boolean().optional(),
  dietaryRestrictions: z.string().max(500).optional(),
  weightChange: z.string().max(500).optional(),
  familyNutritionOk: z.boolean().optional(),
});

export const terapeutaIntegrativoSpecialtySchema = z.object({
  usedBefore: z.boolean().optional(),
  seeksReliefFor: z.array(z.string()).optional(),
  preferences: z.string().max(500).optional(),
});

export const cuidadosPaliativosSpecialtySchema = z.object({
  diagnosis: z.string().max(500).optional(),
  mainSymptoms: z.string().max(1000).optional(),
  curativeTreatment: z.boolean().optional(),
  hasCaregiver: z.boolean().optional(),
});

export const specialtyDataSchema = z.object({
  medico: medicoSpecialtySchema.optional(),
  psicologo: psicologoSpecialtySchema.optional(),
  psicanalista: psicanalistaSpecialtySchema.optional(),
  fisioterapeuta: fisioterapeutaSpecialtySchema.optional(),
  nutricionista: nutricionistaSpecialtySchema.optional(),
  terapeuta_integrativo: terapeutaIntegrativoSpecialtySchema.optional(),
  cuidados_paliativos: cuidadosPaliativosSpecialtySchema.optional(),
});

export const basicNeedsSchema = z.object({
  needsMedicationHelp: z.boolean(),
  needsShelterGuidance: z.boolean(),
  separatedChildOrElderlyAlone: z.boolean(),
});

export const consentSchema = z.object({
  shareWithVolunteer: z.boolean(),
  additionalNotes: z.string().max(2000).optional(),
});

export type IdentificationData = z.infer<typeof identificationSchema>;
export type SpecialtyData = z.infer<typeof specialtyDataSchema>;
export type BasicNeedsData = z.infer<typeof basicNeedsSchema>;

export const anamnesePatchSchema = z.discriminatedUnion("section", [
  z.object({ section: z.literal("identification"), data: identificationSchema }),
  z.object({ section: z.literal("services"), data: serviceTypesSchema }),
  z.object({ section: z.literal("specialty"), data: specialtyDataSchema }),
  z.object({ section: z.literal("basicNeeds"), data: basicNeedsSchema }),
  z.object({ section: z.literal("consent"), data: consentSchema }),
]);

export const MEDICO_SYMPTOMS = [
  "dor_muscular",
  "dor_abdominal",
  "respiracao_tosse",
  "febre",
  "vomito_diarreia",
  "dor_urinar",
  "pele",
  "dor_cabeca",
  "tontura",
  "receita",
  "outro",
] as const;

export const PSICO_SYMPTOMS = [
  "tristeza",
  "ansiedade",
  "panico",
  "medo",
  "irritabilidade",
  "culpa",
  "insonia",
  "pesadelos",
  "autolesao",
  "exaustao",
] as const;

export const INTEGRATIVE_RELIEF = ["dor", "ansiedade", "insonia", "estresse"] as const;
