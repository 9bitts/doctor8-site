export type NursingDiagnosis = {
  id: string;
  code: string;
  labelKey: string;
  domain: string;
};

export const NURSING_DIAGNOSES: NursingDiagnosis[] = [
  { id: "nd001", code: "00004", labelKey: "nurse.dx.riskInfection", domain: "safety" },
  { id: "nd002", code: "00046", labelKey: "nurse.dx.impairedSkin", domain: "integumentary" },
  { id: "nd003", code: "00085", labelKey: "nurse.dx.acutePain", domain: "comfort" },
  { id: "nd004", code: "00126", labelKey: "nurse.dx.riskFalls", domain: "safety" },
  { id: "nd005", code: "00031", labelKey: "nurse.dx.anxiety", domain: "psychosocial" },
  { id: "nd006", code: "00032", labelKey: "nurse.dx.fear", domain: "psychosocial" },
  { id: "nd007", code: "00094", labelKey: "nurse.dx.ineffectiveBreathing", domain: "respiratory" },
  { id: "nd008", code: "00030", labelKey: "nurse.dx.impairedMobility", domain: "activity" },
  { id: "nd009", code: "00026", labelKey: "nurse.dx.constipation", domain: "elimination" },
  { id: "nd010", code: "00016", labelKey: "nurse.dx.deficientFluid", domain: "fluid" },
  { id: "nd011", code: "00027", labelKey: "nurse.dx.excessFluid", domain: "fluid" },
  { id: "nd012", code: "00155", labelKey: "nurse.dx.riskAspiration", domain: "safety" },
  { id: "nd013", code: "00141", labelKey: "nurse.dx.impairedSleep", domain: "rest" },
  { id: "nd014", code: "00146", labelKey: "nurse.dx.ineffectiveCoping", domain: "psychosocial" },
  { id: "nd015", code: "00098", labelKey: "nurse.dx.impairedSwallowing", domain: "nutrition" },
];

export function findDiagnosis(id: string): NursingDiagnosis | undefined {
  return NURSING_DIAGNOSES.find((d) => d.id === id);
}
