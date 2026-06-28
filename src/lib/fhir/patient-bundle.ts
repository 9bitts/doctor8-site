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
