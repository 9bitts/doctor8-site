// Dental anamnesis + TCLE fields (CFO-compliant structure).

export type DentalAnamnesisField = {
  id: string;
  labelKey: string;
  type: "boolean" | "text" | "select" | "multiselect";
  options?: { value: string; labelKey: string }[];
  alertOnYes?: boolean;
};

export const DENTAL_ANAMNESIS_FIELDS: DentalAnamnesisField[] = [
  { id: "chiefComplaint", labelKey: "dental.anam.chiefComplaint", type: "text" },
  { id: "lastDentalVisit", labelKey: "dental.anam.lastVisit", type: "text" },
  {
    id: "brushingFrequency",
    labelKey: "dental.anam.brushing",
    type: "select",
    options: [
      { value: "1x", labelKey: "dental.anam.brush1x" },
      { value: "2x", labelKey: "dental.anam.brush2x" },
      { value: "3x", labelKey: "dental.anam.brush3x" },
      { value: "rarely", labelKey: "dental.anam.brushRarely" },
    ],
  },
  { id: "usesFloss", labelKey: "dental.anam.floss", type: "boolean" },
  { id: "bleedingGums", labelKey: "dental.anam.bleeding", type: "boolean", alertOnYes: true },
  { id: "toothSensitivity", labelKey: "dental.anam.sensitivity", type: "boolean" },
  { id: "grinding", labelKey: "dental.anam.grinding", type: "boolean" },
  { id: "smoking", labelKey: "dental.anam.smoking", type: "boolean", alertOnYes: true },
  { id: "alcohol", labelKey: "dental.anam.alcohol", type: "boolean" },
  { id: "pregnancy", labelKey: "dental.anam.pregnancy", type: "boolean", alertOnYes: true },
  { id: "diabetes", labelKey: "dental.anam.diabetes", type: "boolean", alertOnYes: true },
  { id: "heartDisease", labelKey: "dental.anam.heart", type: "boolean", alertOnYes: true },
  { id: "hypertension", labelKey: "dental.anam.hypertension", type: "boolean", alertOnYes: true },
  { id: "anticoagulants", labelKey: "dental.anam.anticoagulants", type: "boolean", alertOnYes: true },
  { id: "allergies", labelKey: "dental.anam.allergies", type: "text" },
  { id: "medications", labelKey: "dental.anam.medications", type: "text" },
  { id: "previousSurgeries", labelKey: "dental.anam.surgeries", type: "text" },
  { id: "anesthesiaReaction", labelKey: "dental.anam.anesthesia", type: "boolean", alertOnYes: true },
  { id: "hepatitis", labelKey: "dental.anam.hepatitis", type: "boolean", alertOnYes: true },
  { id: "hiv", labelKey: "dental.anam.hiv", type: "boolean", alertOnYes: true },
];

export const DENTAL_TCLE_TEXT_KEY = "dental.anam.tcleText";
