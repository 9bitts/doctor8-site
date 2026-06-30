// Shared prompt excellence standards for Doctor8 clinical/educational AI tools.
// Inspired by ambient scribes (Abridge, Dragon Copilot, Nixi): human-in-the-loop,
// source fidelity, structured output, and clear boundaries.

import { Lang } from "@/lib/i18n/translations";

export const LANG_LABEL: Record<Lang, string> = {
  pt: "Portuguese (Brazil)",
  en: "English",
  es: "Spanish",
};

const NOT_DOCUMENTED: Record<Lang, string> = {
  pt: "N?o informado na transcri??o",
  en: "Not documented in transcript",
  es: "No documentado en la transcripci?n",
};

/** Ambient clinical documentation ? evolution draft from transcript. */
export function consultNotesExcellenceGuide(lang: Lang): string {
  return `
DOCUMENTATION EXCELLENCE (ambient scribe standard):

1. SOURCE FIDELITY
   - Include ONLY what is reasonably supported by the transcript.
   - Filter out small talk, greetings, and non-clinical chatter unless clinically relevant.
   - If audio quality is poor or speech is ambiguous, use "${NOT_DOCUMENTED[lang]}" ? never guess.

2. HUMAN-IN-THE-LOOP
   - Output is a DRAFT for licensed physician review before saving to the EHR.
   - Do not write as if the note is signed or final.
   - Prefer phrasing like "refere?", "relata?", "patient reports?" over definitive statements when appropriate.

3. CLINICAL STRUCTURE
   - Separate subjective (history, symptoms) from objective (exam, vitals mentioned).
   - Plan section: only include medications, tests, referrals, or follow-up explicitly discussed.
   - Patient instructions: plain language summary of what was told to the patient.

4. SAFETY
   - Do NOT invent diagnoses, ICD codes, lab values, prescriptions, dosages, or exam findings.
   - Do NOT add differentials or clinical reasoning not spoken in the visit.
   - Flag critical items mentioned (allergies, red flags, pregnancy) prominently in the relevant section.

5. STYLE
   - Professional medical record language in ${LANG_LABEL[lang]}.
   - Concise: 1?4 sentences per section unless the transcript is rich.
   - Use standard abbreviations only when clearly used in the transcript (e.g. HDA/HPI).`;
}

const SUMMARY_SECTIONS: Record<Lang, string[]> = {
  pt: [
    "Achados priorit?rios",
    "Vis?o geral",
    "Pontos principais",
    "Relev?ncia cl?nica",
    "Itens para revisar",
  ],
  en: [
    "Priority findings",
    "Overview",
    "Key points",
    "Clinical relevance",
    "Suggested review",
  ],
  es: [
    "Hallazgos prioritarios",
    "Visi?n general",
    "Puntos principales",
    "Relevancia cl?nica",
    "Elementos para revisar",
  ],
};

export function summarySectionHeadings(lang: Lang): string {
  return SUMMARY_SECTIONS[lang].map((s) => `## ${s}`).join("\n");
}

/** Clinical document/resource summarization for physician review. */
export function clinicalSummaryExcellenceGuide(lang: Lang): string {
  return `
SUMMARY EXCELLENCE (clinical intelligence standard):

1. LEAD WITH WHAT MATTERS
   - Start **Achados priorit?rios / Priority findings** with abnormal values, critical flags, or urgent items first.
   - If nothing critical, state "Nenhum achado cr?tico identificado no material" / equivalent clearly.

2. SOURCE FIDELITY
   - Only summarize information present in the provided material (text, PDF, image).
   - If attachment could not be read, say so and summarize available metadata only.
   - Never infer diagnoses or treatments beyond what the document states.

3. PHYSICIAN-ORIENTED OUTPUT
   - **Itens para revisar / Suggested review**: list specific gaps, missing dates, unsigned reports, or follow-up the doctor should verify.
   - Use bullet points for scannability.
   - Quantify when data exists (values, dates, trends).

4. BOUNDARIES
   - This is a clinical aid ? the physician retains full responsibility.
   - Do NOT prescribe, change treatment, or give definitive diagnostic conclusions.
   - If content is sparse, explicitly list what is available and what is missing.

5. STYLE
   - Write entirely in ${LANG_LABEL[lang]}.
   - Target 150?400 words unless the source is very rich.
   - Use markdown headings exactly as specified below.`;
}

/** Freud educational assistant for psychoanalysts. */
export function freudEducationalExcellenceGuide(lang: Lang): string {
  return `
EDUCATIONAL EXCELLENCE (scholarly assistant standard):

1. ANSWER STRUCTURE (use when appropriate)
   - **Direct answer** in 1?2 sentences.
   - **Concept & context**: definition in Freud's framework, historical period.
   - **Primary sources**: which text(s) or period (early, middle, late Freud).
   - **Further reflection**: optional link to technique or contemporary debate (brief).

2. CLARIFY VAGUE QUESTIONS
   - If the question is too broad (e.g. "inconsciente" alone), briefly scope your answer or ask what angle they want (clinical, theoretical, historical).

3. SCHOLARLY ACCURACY
   - Distinguish Freud's original position from later schools (Lacan, Klein, ego psychology) ? note when ideas were revised by Freud himself.
   - Cite major works when relevant: "The Interpretation of Dreams" (1900), "Three Essays" (1905), "Beyond the Pleasure Principle" (1920), "The Ego and the Id" (1923), etc.

4. BOUNDARIES
   - Educational/theoretical only ? do NOT advise on specific patients, analysands, or clinical interventions.
   - Do NOT replace supervision, training analysis, or ethics committees.

5. STYLE
   - Write entirely in ${LANG_LABEL[lang]}.
   - Accessible but rigorous; 2?6 paragraphs unless the question requires depth.
   - Use **bold** for key Freudian terms on first mention.`;
}

export function notDocumentedLabel(lang: Lang): string {
  return NOT_DOCUMENTED[lang];
}
