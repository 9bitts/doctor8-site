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
  // Legacy: plain-text body with one exam per line
  const lines = body
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter(Boolean);
  if (lines.length > 0 && !body.trimStart().startsWith("{")) {
    return { items: lines, notes: "", cid: "", cidLabel: "" };
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

/** Resolve display/apply category when older rows were saved without templateCategory. */
export function resolveDocumentTemplateCategory(tpl: {
  templateCategory?: string | null;
  documentType?: string | null;
  body?: string | null;
}): TemplateCategory | null {
  if (
    tpl.templateCategory === TEMPLATE_CATEGORIES.EXAM_CLINICAL ||
    tpl.templateCategory === TEMPLATE_CATEGORIES.EXAM_PREOP ||
    tpl.templateCategory === TEMPLATE_CATEGORIES.CERTIFICATE
  ) {
    return tpl.templateCategory;
  }
  if (tpl.documentType === "EXAM_REQUEST") return TEMPLATE_CATEGORIES.EXAM_CLINICAL;
  if (tpl.documentType === "CERTIFICATE") return TEMPLATE_CATEGORIES.CERTIFICATE;
  if (tpl.body && parseExamTemplateBody(tpl.body).items.length > 0) {
    return TEMPLATE_CATEGORIES.EXAM_CLINICAL;
  }
  return null;
}

export function resolvePrescriptionTemplateCategory(tpl: {
  templateCategory?: string | null;
}): TemplateCategory | null {
  if (tpl.templateCategory === TEMPLATE_CATEGORIES.RX_POSTOP) {
    return TEMPLATE_CATEGORIES.RX_POSTOP;
  }
  // Legacy prescription templates (saved from the rx form without category) belong here.
  if (!tpl.templateCategory) return TEMPLATE_CATEGORIES.RX_POSTOP;
  return null;
}

export function getTemplateUrl(category: TemplateCategory, id: string): string {
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
