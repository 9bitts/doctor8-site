export const TEMPLATE_CATEGORIES = {
  EXAM_CLINICAL: "exam_clinical",
  EXAM_PREOP: "exam_preop",
  RX_POSTOP: "rx_postop",
  CERTIFICATE: "certificate",
} as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[keyof typeof TEMPLATE_CATEGORIES];

export interface ExamTemplatePayload {
  items: string[];
  notes?: string;
  cid?: string;
  cidLabel?: string;
}

export function parseExamTemplateBody(body: string): ExamTemplatePayload {
  try {
    const parsed = JSON.parse(body) as ExamTemplatePayload;
    if (parsed && Array.isArray(parsed.items)) {
      return {
        items: parsed.items.filter((i) => typeof i === "string" && i.trim()),
        notes: parsed.notes || "",
        cid: parsed.cid || "",
        cidLabel: parsed.cidLabel || "",
      };
    }
  } catch {
    /* legacy plain text */
  }
  return { items: [], notes: "", cid: "", cidLabel: "" };
}

export function stringifyExamTemplateBody(payload: ExamTemplatePayload): string {
  return JSON.stringify({
    items: payload.items,
    notes: payload.notes || "",
    cid: payload.cid || "",
    cidLabel: payload.cidLabel || "",
  });
}

export function isExamTemplateCategory(category: string | null | undefined): boolean {
  return category === TEMPLATE_CATEGORIES.EXAM_CLINICAL || category === TEMPLATE_CATEGORIES.EXAM_PREOP;
}

export function useTemplateUrl(category: TemplateCategory, id: string): string {
  switch (category) {
    case TEMPLATE_CATEGORIES.EXAM_CLINICAL:
    case TEMPLATE_CATEGORIES.EXAM_PREOP:
      return `/professional/prescriptions?view=exam&docTemplateId=${id}`;
    case TEMPLATE_CATEGORIES.RX_POSTOP:
      return `/professional/prescriptions?view=prescription&templateId=${id}`;
    case TEMPLATE_CATEGORIES.CERTIFICATE:
      return `/professional/prescriptions?view=document&docTemplateId=${id}`;
    default:
      return `/professional/prescriptions`;
  }
}
