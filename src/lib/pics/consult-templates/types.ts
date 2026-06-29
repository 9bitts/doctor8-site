export type StructuredFieldType = "text" | "textarea" | "select" | "checkbox" | "number";

export interface StructuredFieldOption {
  value: string;
  labelKey: string;
}

export interface StructuredField {
  key: string;
  labelKey: string;
  type: StructuredFieldType;
  sectionKey?: string;
  placeholderKey?: string;
  options?: StructuredFieldOption[];
  rows?: number;
}

export interface ConsultTemplate {
  slug: string;
  fields: StructuredField[];
  emptyValues(): Record<string, string | boolean>;
}

export type StructuredValues = Record<string, string | boolean>;

export function hasStructuredTemplate(slug: string): boolean {
  return ["homeopatia", "acupuntura", "fitoterapia"].includes(slug);
}
