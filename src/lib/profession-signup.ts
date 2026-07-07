import type { HumanitarianPoolSlug } from "@/lib/humanitarian/constants";
import type { UserRole } from "@prisma/client";

/** Maps public profession landing slugs to signup role + initial profile specialty. */
export const PROFESSION_SIGNUP: Record<
  HumanitarianPoolSlug,
  { role: UserRole; specialty: string | null }
> = {
  medico: { role: "PROFESSIONAL", specialty: "General Practice" },
  psicologo: { role: "PROFESSIONAL", specialty: "Psychologist" },
  psicanalista: { role: "PSYCHOANALYST", specialty: null },
  terapeuta_integrativo: { role: "INTEGRATIVE_THERAPIST", specialty: null },
  fisioterapeuta: { role: "PROFESSIONAL", specialty: "Physiotherapist" },
  nutricionista: { role: "PROFESSIONAL", specialty: "Nutritionist" },
  enfermeiro: { role: "PROFESSIONAL", specialty: "Nurse" },
  farmaceutico: { role: "PROFESSIONAL", specialty: "Pharmacist" },
  dentista: { role: "PROFESSIONAL", specialty: "Dentist (General)" },
  cuidados_paliativos: { role: "PROFESSIONAL", specialty: "General Practice" },
};

export const PROFESSION_SIGNUP_SLUGS = Object.keys(PROFESSION_SIGNUP) as HumanitarianPoolSlug[];

export function isProfessionSignupSlug(slug: string): slug is HumanitarianPoolSlug {
  return slug in PROFESSION_SIGNUP;
}

export function resolveSignupFromProfessionSlug(slug: HumanitarianPoolSlug): {
  role: UserRole;
  specialty: string;
  professionalKind?: "psychologist";
} {
  const cfg = PROFESSION_SIGNUP[slug];
  if (cfg.role === "PSYCHOANALYST" || cfg.role === "INTEGRATIVE_THERAPIST") {
    return { role: cfg.role, specialty: "" };
  }
  if (slug === "psicologo") {
    return { role: "PROFESSIONAL", specialty: "Psychologist", professionalKind: "psychologist" };
  }
  return { role: "PROFESSIONAL", specialty: cfg.specialty ?? "" };
}

export function buildProfessionalSignupHref(
  slug: HumanitarianPoolSlug,
  opts?: { region?: string; callbackUrl?: string },
): string {
  const params = new URLSearchParams();
  const cfg = PROFESSION_SIGNUP[slug];

  if (cfg.role === "PSYCHOANALYST") {
    params.set("role", "PSYCHOANALYST");
  } else if (cfg.role === "INTEGRATIVE_THERAPIST") {
    params.set("role", "INTEGRATIVE_THERAPIST");
  } else if (slug === "psicologo") {
    params.set("portal", "psychologist");
  } else if (slug === "nutricionista") {
    params.set("portal", "nutritionist");
    params.set("profession", "nutricionista");
  } else if (slug === "enfermeiro") {
    params.set("portal", "nurse");
    params.set("profession", "enfermeiro");
  } else if (slug === "farmaceutico") {
    params.set("portal", "pharmacist");
    params.set("profession", "farmaceutico");
  } else if (slug === "dentista") {
    params.set("portal", "dentist");
    params.set("profession", "dentista");
  } else {
    params.set("role", "PROFESSIONAL");
    params.set("profession", slug);
  }

  if (opts?.region) params.set("region", opts.region);
  if (opts?.callbackUrl) params.set("callbackUrl", opts.callbackUrl);

  const qs = params.toString();
  return `/register/professional/signup${qs ? `?${qs}` : ""}`;
}
