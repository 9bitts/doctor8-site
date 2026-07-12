import { isProfessionSignupSlug } from "@/lib/profession-signup";

export type ProSignupRole =
  | "PROFESSIONAL"
  | "PSYCHOLOGIST"
  | "PSYCHOANALYST"
  | "INTEGRATIVE_THERAPIST"
  | "NUTRITIONIST"
  | "NURSE"
  | "PHARMACIST"
  | "DENTIST";

export type ProfessionSignupSlug =
  | "medico"
  | "fisioterapeuta"
  | "nutricionista"
  | "enfermeiro"
  | "farmaceutico"
  | "dentista"
  | "cuidados_paliativos";

export type ProfessionalSignupParams = {
  role: ProSignupRole;
  professionSlug: ProfessionSignupSlug | undefined;
  step: 1 | 2;
};

/**
 * Derives signup UI state from URL query params.
 * Precedence: portal > role > profession (each layer only applies when higher layers did not set step 2).
 */
export function resolveProfessionalSignupParams(input: {
  portal?: string | null;
  role?: string | null;
  profession?: string | null;
}): ProfessionalSignupParams {
  let role: ProSignupRole = "PROFESSIONAL";
  let professionSlug: ProfessionSignupSlug | undefined;
  let step: 1 | 2 = 1;

  const portal = input.portal?.trim() || null;
  const roleParam = input.role?.trim() || null;
  const professionParam = input.profession?.trim() || null;

  if (portal === "psychologist") {
    role = "PSYCHOLOGIST";
    step = 2;
  } else if (portal === "nutritionist") {
    role = "NUTRITIONIST";
    professionSlug = "nutricionista";
    step = 2;
  } else if (portal === "nurse") {
    role = "NURSE";
    professionSlug = "enfermeiro";
    step = 2;
  } else if (portal === "pharmacist") {
    role = "PHARMACIST";
    professionSlug = "farmaceutico";
    step = 2;
  } else if (portal === "dentist") {
    role = "DENTIST";
    professionSlug = "dentista";
    step = 2;
  }

  if (step === 1 && roleParam === "PSYCHOANALYST") {
    role = "PSYCHOANALYST";
    step = 2;
  } else if (step === 1 && roleParam === "INTEGRATIVE_THERAPIST") {
    role = "INTEGRATIVE_THERAPIST";
    step = 2;
  } else if (step === 1 && roleParam === "PROFESSIONAL") {
    role = "PROFESSIONAL";
    professionSlug = undefined;
    step = 2;
  }

  if (step === 1 && professionParam && isProfessionSignupSlug(professionParam)) {
    if (professionParam === "psicologo") {
      role = "PSYCHOLOGIST";
    } else if (professionParam === "psicanalista") {
      role = "PSYCHOANALYST";
    } else if (professionParam === "terapeuta_integrativo") {
      role = "INTEGRATIVE_THERAPIST";
    } else {
      role = "PROFESSIONAL";
      professionSlug = professionParam as ProfessionSignupSlug;
    }
    step = 2;
  }

  return { role, professionSlug, step };
}

/** Maps UI role + slug to RegisterAccountForm professionSlug prop. */
export function resolveRegisterProfessionSlug(
  role: ProSignupRole,
  professionSlug: ProfessionSignupSlug | undefined,
): ProfessionSignupSlug | undefined {
  if (role === "NUTRITIONIST") return "nutricionista";
  if (role === "NURSE") return "enfermeiro";
  if (role === "PHARMACIST") return "farmaceutico";
  if (role === "DENTIST") return "dentista";
  if (role === "PROFESSIONAL") return professionSlug;
  return undefined;
}
