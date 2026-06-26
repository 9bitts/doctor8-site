// Merge document template placeholders with patient + professional context.

export type TemplateTagContext = {
  patientName?: string;
  patientCpf?: string;
  patientDob?: string;
  professionalName?: string;
  licenseNumber?: string;
  specialty?: string;
  address?: string;
  clinicName?: string;
  today?: string;
};

const TAG_MAP: Record<string, keyof TemplateTagContext> = {
  nome: "patientName",
  name: "patientName",
  cpf: "patientCpf",
  data_nasc: "patientDob",
  dob: "patientDob",
  data_hoje: "today",
  today: "today",
  crm: "licenseNumber",
  license: "licenseNumber",
  especialidade: "specialty",
  specialty: "specialty",
  endereco: "address",
  address: "address",
  clinica: "clinicName",
  clinic: "clinicName",
  medico: "professionalName",
  doctor: "professionalName",
};

export const TEMPLATE_TAG_HINTS = [
  "#nome", "#cpf", "#data_nasc", "#data_hoje",
  "#crm", "#especialidade", "#endereco", "#clinica",
] as const;

export function applyTemplateTags(text: string, ctx: TemplateTagContext): string {
  if (!text) return text;
  return text.replace(/#([a-zA-Z_]+)/g, (match, rawKey: string) => {
    const key = rawKey.toLowerCase();
    const field = TAG_MAP[key];
    if (!field) return match;
    const value = ctx[field];
    return value != null && value !== "" ? value : match;
  });
}

export function formatAddress(parts: {
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
}): string {
  return [
    parts.addressLine1,
    [parts.city, parts.state].filter(Boolean).join(" - "),
    parts.zipCode,
    parts.country && parts.country !== "BR" ? parts.country : null,
  ]
    .filter(Boolean)
    .join(", ");
}

export function formatDobDisplay(iso: string, locale = "pt-BR"): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(locale);
}
