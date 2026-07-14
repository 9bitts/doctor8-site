import type { Lang } from "@/lib/i18n/translations";
import { LANG_LABEL } from "@/lib/ai-clinical-standards";
import { SESSION_FORMATS } from "@/lib/psychology-templates";
import type {
  VoiceFormData,
  VoiceFormType,
} from "./types";

const FORM_SCHEMAS: Record<VoiceFormType, string> = {
  sbar: `{
  "situation": "string",
  "background": "string",
  "assessment": "string",
  "recommendation": "string",
  "recipientNote": "string optional"
}`,
  care_plan: `{
  "title": "string",
  "interventionText": "newline-separated interventions",
  "notes": "string optional",
  "diagnosisLabels": ["nursing diagnosis labels mentioned, optional"]
}`,
  med_review: `{
  "medications": [{"name":"","dosage":"","route":"","frequency":""}],
  "problems": [{"type":"","description":"","severity":"LOW|MEDIUM|HIGH"}],
  "recommendations": "string",
  "adherenceNotes": "string optional"
}`,
  reconciliation: `{
  "sourceContext": "string",
  "notes": "string",
  "medicationsBefore": [{"name":"","dosage":""}],
  "medicationsAfter": [{"name":"","dosage":""}]
}`,
  session_note: `{
  "format": "DAP",
  "fields": {"data":"","assessment":"","plan":""},
  "rawNotes": "string optional",
  "durationMins": number optional
}`,
  nutrition_anamnesis: `{
  "chiefComplaint": "string",
  "clinicalHistory": "string",
  "familyHistory": "string optional",
  "allergies": "string optional",
  "medications": "string optional",
  "dietaryRestrictions": "string optional",
  "physicalActivity": "string optional",
  "weightGoal": "string optional",
  "bowelHabits": "string optional",
  "alcoholUse": "string optional",
  "notes": "string optional"
}`,
  dental_anamnesis: `{
  "chiefComplaint": "string",
  "responses": {"fieldId": "text or boolean as string"}
}`,
  treatment_plan: `{
  "items": [{"description":"","toothNumbers":[16],"procedureCode":""}],
  "discountCents": 0
}`,
  chart_evolution: `{
  "draft": "markdown clinical evolution",
  "title": "string optional"
}`,
  meal_plan: `{
  "title": "string",
  "dailyKcalTarget": number optional,
  "notes": "string optional",
  "meals": [{"name":"Café da manhã|Almoço|Jantar","items":[{"foodName":"","portionG":100}]}]
}`,
  exam_request: `{
  "title": "string optional",
  "examItems": ["hemograma completo","glicemia"],
  "notes": "string optional",
  "cid": "string optional"
}`,
  clinical_document: `{
  "documentType": "CERTIFICATE|REPORT|OTHER",
  "title": "string",
  "body": "full document text"
}`,
};

export async function generateStructuredFormPrefill(params: {
  lang: Lang;
  formType: VoiceFormType;
  transcript: string;
  patientName?: string | null;
}): Promise<VoiceFormData> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("AI_NOT_CONFIGURED");

  const dapFields = SESSION_FORMATS.find((f) => f.id === "DAP")!.fields.map((f) => f.key).join(", ");

  let schemaHint = FORM_SCHEMAS[params.formType];
  if (params.formType === "session_note") {
    schemaHint = schemaHint.replace('"data":"","assessment":"","plan":""', `"${dapFields.split(", ").join('":"","')}"`);
  }

  const system = `You extract structured clinical form data from a spoken command for Doctor8 EHR.

Output STRICT JSON only matching this schema for form type "${params.formType}":
${schemaHint}

RULES:
- Write text values in ${LANG_LABEL[params.lang]}.
- Include ONLY information reasonably present in the transcript.
- Use empty strings or omit optional fields when not mentioned.
- Do NOT invent clinical facts, doses, or diagnoses.
- This is a DRAFT for licensed professional review before saving.`;

  const userText = [
    params.patientName ? `Patient: ${params.patientName}` : "",
    "Spoken command / clinical dictation:",
    params.transcript.trim(),
    "",
    "Return JSON only.",
  ].filter(Boolean).join("\n\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1400,
      system,
      messages: [{ role: "user", content: userText }],
    }),
  });

  if (!response.ok) {
    console.error("[VOICE-FORM-PREFILL]", await response.text());
    throw new Error("AI_REQUEST_FAILED");
  }

  const data = await response.json();
  const text = data.content?.find((b: { type: string }) => b.type === "text")?.text;
  if (!text) throw new Error("AI_EMPTY_RESPONSE");

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI_PARSE_FAILED");

  return JSON.parse(jsonMatch[0]) as VoiceFormData;
}
