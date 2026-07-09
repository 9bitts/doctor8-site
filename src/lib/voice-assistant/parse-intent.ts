import type { Lang } from "@/lib/i18n/translations";
import { LANG_LABEL } from "@/lib/ai-clinical-standards";
import {
  buildNavigationIndex,
  getSkillsForPortal,
} from "./skill-registry";
import type { ParsedVoiceIntent, VoicePortalId } from "./types";

function skillsPromptBlock(portalId: VoicePortalId): string {
  const skills = getSkillsForPortal(portalId);
  return skills
    .map(
      (s) =>
        `- ${s.id}: ${s.description}. Examples: ${s.examples.slice(0, 2).join(" | ")}`,
    )
    .join("\n");
}

function navPromptBlock(portalId: VoicePortalId): string {
  return buildNavigationIndex(portalId)
    .slice(0, 24)
    .map((n) => `- ${n.href}`)
    .join("\n");
}

export async function parseVoiceIntent(params: {
  lang: Lang;
  portalId: VoicePortalId;
  transcript: string;
}): Promise<ParsedVoiceIntent> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("AI_NOT_CONFIGURED");

  const system = `You are the Doctor8 voice assistant intent parser for a licensed clinical professional portal.

Your job: read a spoken command (transcript) and return STRICT JSON only — no markdown, no commentary.

Portal: ${params.portalId}
Available skills:
${skillsPromptBlock(params.portalId)}

Navigation routes (use targetRoute when navigating):
${navPromptBlock(params.portalId)}

RULES:
- Choose exactly ONE skillId from the available skills list.
- confidence: 0.0 to 1.0
- Extract patientName when mentioned (full name preferred).
- For prescribe: extract medications array with name, dosage, frequency, duration, instructions when spoken.
- For clinical_note / sbar_note / med_review / anamnesis / meal_plan: put spoken clinical content in clinicalText.
- For navigate: set targetRoute to the best matching href from the navigation list, or null if unclear.
- For search_patient: set patientName.
- For schedule: set scheduleHint with date/time text if mentioned.
- Never invent patient names, drugs, doses, or diagnoses not reasonably present in the transcript.
- Write rawSummary as a one-line human summary in ${LANG_LABEL[params.lang]}.

Return JSON shape:
{
  "skillId": "navigate|prescribe|clinical_note|search_patient|schedule|sbar_note|med_review|anamnesis|meal_plan",
  "confidence": 0.0,
  "patientName": string|null,
  "medications": [{"name":"","dosage":"","frequency":"","duration":"","instructions":""}]|null,
  "clinicalText": string|null,
  "targetRoute": string|null,
  "targetLabel": string|null,
  "instructions": string|null,
  "validDays": number|null,
  "scheduleHint": string|null,
  "rawSummary": string|null
}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 900,
      system,
      messages: [
        {
          role: "user",
          content: `Transcript:\n${params.transcript.trim()}\n\nReturn JSON only.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    console.error("[VOICE-INTENT]", await response.text());
    throw new Error("AI_REQUEST_FAILED");
  }

  const data = await response.json();
  const text = data.content?.find((b: { type: string }) => b.type === "text")?.text;
  if (!text) throw new Error("AI_EMPTY_RESPONSE");

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI_PARSE_FAILED");

  const parsed = JSON.parse(jsonMatch[0]) as ParsedVoiceIntent;
  if (!parsed.skillId) throw new Error("AI_PARSE_FAILED");
  return parsed;
}
