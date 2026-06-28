type FhirResource = Record<string, unknown>;

export type PatientFhirInput = {
  patientId: string;
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  sex?: string | null;
  bloodType?: string | null;
  allergies?: string | null;
  chronicConditions?: string | null;
  medications: {
    id: string;
    name: string;
    dosage?: string | null;
    frequency?: string | null;
    prescribedBy?: string | null;
  }[];
  encounters?: {
    id: string;
    scheduledAt: string;
    status: string;
    type: string;
    professionalName?: string | null;
  }[];
  examRequests?: {
    id: string;
    title: string;
    createdAt: string;
    items: string[];
  }[];
};

function fhirDate(value: string): string {
  return value.slice(0, 10);
}

function splitList(text: string | null | undefined): string[] {
  if (!text?.trim()) return [];
  return text
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function genderFromSex(sex: string | null | undefined): string | undefined {
  if (!sex) return undefined;
  const s = sex.toLowerCase();
  if (s.startsWith("m") || s === "male") return "male";
  if (s.startsWith("f") || s === "female") return "female";
  return "unknown";
}

function encounterStatus(status: string): string {
  const s = status.toLowerCase();
  if (s === "completed") return "finished";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  if (s === "in_progress" || s === "in progress") return "in-progress";
  if (s === "no_show" || s === "no show") return "cancelled";
  return "planned";
}

function encounterClass(type: string): string {
  return type === "IN_PERSON" ? "AMB" : "VR";
}

export function buildPatientFhirBundle(input: PatientFhirInput): FhirResource {
  const patientRef = `Patient/${input.patientId}`;
  const fullName = `${input.firstName} ${input.lastName}`.trim();

  const patient: FhirResource = {
    resourceType: "Patient",
    id: input.patientId,
    meta: {
      profile: ["http://hl7.org/fhir/StructureDefinition/Patient"],
      tag: [{ system: "https://doctor8.app/fhir", code: "patient-self-export" }],
    },
    identifier: [
      {
        system: "https://doctor8.app/patient",
        value: input.patientId,
      },
    ],
    active: true,
    name: [{ use: "official", text: fullName, family: input.lastName, given: [input.firstName] }],
    ...(input.dateOfBirth ? { birthDate: fhirDate(input.dateOfBirth) } : {}),
    ...(genderFromSex(input.sex) ? { gender: genderFromSex(input.sex) } : {}),
  };

  const entries: { fullUrl: string; resource: FhirResource }[] = [
    { fullUrl: `urn:uuid:${input.patientId}`, resource: patient },
  ];

  for (const allergy of splitList(input.allergies)) {
    const id = `allergy-${allergy.slice(0, 24).replace(/\W+/g, "-")}`;
    entries.push({
      fullUrl: `urn:uuid:${id}`,
      resource: {
        resourceType: "AllergyIntolerance",
        id,
        clinicalStatus: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
              code: "active",
            },
          ],
        },
        patient: { reference: patientRef },
        code: { text: allergy },
      },
    });
  }

  for (const condition of splitList(input.chronicConditions)) {
    const id = `condition-${condition.slice(0, 24).replace(/\W+/g, "-")}`;
    entries.push({
      fullUrl: `urn:uuid:${id}`,
      resource: {
        resourceType: "Condition",
        id,
        clinicalStatus: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
              code: "active",
            },
          ],
        },
        subject: { reference: patientRef },
        code: { text: condition },
      },
    });
  }

  for (const med of input.medications) {
    entries.push({
      fullUrl: `urn:uuid:med-${med.id}`,
      resource: {
        resourceType: "MedicationStatement",
        id: med.id,
        status: "active",
        subject: { reference: patientRef },
        medicationCodeableConcept: { text: med.name },
        ...(med.dosage ? { dosage: [{ text: med.dosage }] } : {}),
        ...(med.frequency ? { note: [{ text: med.frequency }] } : {}),
      },
    });
  }

  for (const enc of input.encounters || []) {
    entries.push({
      fullUrl: `urn:uuid:enc-${enc.id}`,
      resource: {
        resourceType: "Encounter",
        id: enc.id,
        status: encounterStatus(enc.status),
        class: {
          system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
          code: encounterClass(enc.type),
        },
        subject: { reference: patientRef },
        period: { start: enc.scheduledAt },
        ...(enc.professionalName
          ? {
              participant: [
                {
                  individual: {
                    display: enc.professionalName,
                  },
                },
              ],
            }
          : {}),
      },
    });
  }

  for (const exam of input.examRequests || []) {
    entries.push({
      fullUrl: `urn:uuid:sr-${exam.id}`,
      resource: {
        resourceType: "ServiceRequest",
        id: exam.id,
        status: "active",
        intent: "order",
        subject: { reference: patientRef },
        authoredOn: exam.createdAt,
        code: {
          text: exam.title,
          ...(exam.items.length
            ? {
                coding: exam.items.map((item, i) => ({
                  system: "https://doctor8.app/exam-item",
                  code: String(i + 1),
                  display: item,
                })),
              }
            : {}),
        },
      },
    });
  }

  return {
    resourceType: "Bundle",
    type: "collection",
    timestamp: new Date().toISOString(),
    identifier: {
      system: "https://doctor8.app/fhir/bundle",
      value: input.userId,
    },
    entry: entries,
  };
}
