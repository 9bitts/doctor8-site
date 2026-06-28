import type {
  AnamneseServiceType,
  BasicNeedsData,
  IdentificationData,
  SpecialtyData,
} from "@/lib/humanitarian/anamnese";
import type { HumanitarianTriageData } from "@/lib/humanitarian/triage";

export interface AnamneseHintsFromTriage {
  identification?: Partial<IdentificationData>;
  serviceTypes?: AnamneseServiceType[];
  specialty?: SpecialtyData;
  basicNeeds?: Partial<BasicNeedsData>;
}

/** Maps quick triage answers into optional anamnese defaults (only fills empty fields on the client). */
export function buildAnamneseHintsFromTriage(
  triage: HumanitarianTriageData,
  forceMedicalPool: boolean,
): AnamneseHintsFromTriage {
  const serviceTypes = new Set<AnamneseServiceType>();
  const physicalSymptoms: string[] = [];
  const emotionalSymptoms: string[] = [];

  const hasPhysicalUrgency =
    forceMedicalPool ||
    triage.activeBleeding ||
    triage.chestPainOrSevereDyspnea ||
    triage.feverOrGi ||
    triage.headTrauma ||
    triage.breathing !== "normal" ||
    triage.walking === "nao";

  if (hasPhysicalUrgency) serviceTypes.add("medico");
  if (triage.selfHarmThoughts) {
    serviceTypes.add("psicologo");
    emotionalSymptoms.push("autolesao");
  } else if (
    triage.consciousness === "confuso" ||
    triage.breathing === "ofegante"
  ) {
    serviceTypes.add("psicologo");
    if (triage.consciousness === "confuso") emotionalSymptoms.push("panico");
  }

  if (serviceTypes.size === 0) serviceTypes.add("nao_sei");

  if (triage.feverOrGi) {
    physicalSymptoms.push("febre", "vomito_diarreia");
  }
  if (triage.chestPainOrSevereDyspnea || triage.breathing !== "normal") {
    physicalSymptoms.push("respiracao_tosse");
  }
  if (triage.headTrauma) {
    physicalSymptoms.push("dor_cabeca");
    if (triage.headTraumaDescription?.trim()) {
      // stored in medico chiefReason below
    }
  }
  if (triage.activeBleeding) physicalSymptoms.push("pele");
  if (triage.walking === "nao") physicalSymptoms.push("dor_muscular");

  const specialty: SpecialtyData = {};
  if (serviceTypes.has("medico") && physicalSymptoms.length > 0) {
    specialty.medico = {
      physicalSymptoms: [...new Set(physicalSymptoms)],
      ...(triage.headTrauma && triage.headTraumaDescription?.trim()
        ? { chiefReason: triage.headTraumaDescription.trim() }
        : {}),
      ...(triage.chronicDiseaseNeedsMeds
        ? { chronicConditions: "Doen\u00e7a cr\u00f4nica \u2014 informado na triagem" }
        : {}),
      ...(triage.lostMedicationAccess
        ? { medications: "Sem acesso a medicamentos \u2014 informado na triagem" }
        : {}),
    };
  }
  if (serviceTypes.has("psicologo") && emotionalSymptoms.length > 0) {
    specialty.psicologo = {
      emotionalSymptoms: [...new Set(emotionalSymptoms)],
      emotionalScale: triage.selfHarmThoughts ? 9 : 7,
    };
  }

  const basicNeeds: Partial<BasicNeedsData> = {};
  if (triage.lostMedicationAccess || triage.chronicDiseaseNeedsMeds) {
    basicNeeds.needsMedicationHelp = true;
  }
  if (triage.childUnder12Responsible) {
    basicNeeds.separatedChildOrElderlyAlone = true;
  }

  const identification: Partial<IdentificationData> = {};
  if (triage.lostMedicationAccess) {
    identification.accessWaterFoodMeds = "parcial";
  }

  return {
    ...(Object.keys(identification).length ? { identification } : {}),
    serviceTypes: [...serviceTypes],
    ...(Object.keys(specialty).length ? { specialty } : {}),
    ...(Object.keys(basicNeeds).length ? { basicNeeds } : {}),
  };
}

/** Merge saved anamnese with triage hints ? hints only fill gaps. */
export function mergeAnamneseWithTriageHints(
  saved: {
    identification?: IdentificationData | null;
    serviceTypes?: string[];
    specialty?: SpecialtyData | null;
    basicNeeds?: BasicNeedsData | null;
  },
  hints: AnamneseHintsFromTriage,
): {
  identification: IdentificationData;
  serviceTypes: AnamneseServiceType[];
  specialty: SpecialtyData;
  basicNeeds: BasicNeedsData;
  usedHints: boolean;
} {
  const identification: IdentificationData = { ...(saved.identification || {}) };
  if (hints.identification) {
    for (const [k, v] of Object.entries(hints.identification)) {
      const key = k as keyof IdentificationData;
      if (identification[key] === undefined || identification[key] === "") {
        (identification as Record<string, unknown>)[key] = v;
      }
    }
  }

  const serviceTypes =
    saved.serviceTypes && saved.serviceTypes.length > 0
      ? (saved.serviceTypes as AnamneseServiceType[])
      : hints.serviceTypes || [];

  const specialty: SpecialtyData = { ...(saved.specialty || {}) };
  if (hints.specialty) {
    for (const [pool, data] of Object.entries(hints.specialty)) {
      const key = pool as keyof SpecialtyData;
      if (!specialty[key]) {
        specialty[key] = data as SpecialtyData[keyof SpecialtyData];
      }
    }
  }

  const basicNeeds: BasicNeedsData = {
    needsMedicationHelp: saved.basicNeeds?.needsMedicationHelp ?? false,
    needsShelterGuidance: saved.basicNeeds?.needsShelterGuidance ?? false,
    separatedChildOrElderlyAlone: saved.basicNeeds?.separatedChildOrElderlyAlone ?? false,
  };
  if (hints.basicNeeds) {
    if (hints.basicNeeds.needsMedicationHelp) basicNeeds.needsMedicationHelp = true;
    if (hints.basicNeeds.needsShelterGuidance) basicNeeds.needsShelterGuidance = true;
    if (hints.basicNeeds.separatedChildOrElderlyAlone) basicNeeds.separatedChildOrElderlyAlone = true;
  }

  const usedHints =
    (!saved.serviceTypes?.length && !!hints.serviceTypes?.length) ||
    (!saved.specialty && !!hints.specialty) ||
    (!saved.basicNeeds && !!hints.basicNeeds);

  return { identification, serviceTypes, specialty, basicNeeds, usedHints };
}
