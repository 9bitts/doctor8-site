import {
  getRegistrationPhoneIssue,
  registrationPhoneErrorMessage,
} from "@/lib/international-phone";

export type PortalRegisterForm = {
  fullName: string;
  email: string;
  phoneDdi: string;
  phoneDdd: string;
  phoneNumber: string;
  state: string;
  city: string;
  description: string;
  password: string;
  acceptedTelemedicineTcle: boolean;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
};

const PASSWORD_HINT =
  "Mín. 8 caracteres, 1 maiúscula, 1 número e 1 símbolo (!@#$% etc.)";

function translateZodMessage(field: string, message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("at least 8") || lower.includes("pelo menos 8")) {
    return "Use pelo menos 8 caracteres.";
  }
  if (lower.includes("uppercase") || lower.includes("maiúscula")) {
    return "Inclua pelo menos 1 letra maiúscula.";
  }
  if (lower.includes("number") || lower.includes("número")) {
    return "Inclua pelo menos 1 número.";
  }
  if (lower.includes("special") || lower.includes("símbolo")) {
    return "Inclua pelo menos 1 símbolo (!@#$% etc.).";
  }
  if (lower.includes("email")) return "E-mail inválido.";
  if (field === "description" && lower.includes("10")) {
    return "Descreva com pelo menos 10 caracteres.";
  }
  if (field === "fullName" && lower.includes("at least")) {
    return "Informe seu nome completo.";
  }
  if (message === "Required") return "Campo obrigatório.";
  return message;
}

export function parseRegisterHumanitarianErrors(
  json: { error?: unknown } | null,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!json?.error || typeof json.error !== "object") return out;

  const err = json.error as Record<string, unknown>;

  if (err.fieldErrors && typeof err.fieldErrors === "object") {
    for (const [field, messages] of Object.entries(err.fieldErrors as Record<string, string[]>)) {
      const first = Array.isArray(messages) ? messages[0] : "";
      if (first) out[field] = translateZodMessage(field, first);
    }
  }

  if (Array.isArray(err.phoneNumber) && err.phoneNumber[0]) {
    out.phoneNumber = String(err.phoneNumber[0]);
  }

  if (Array.isArray(err.formErrors)) {
    for (const msg of err.formErrors) {
      if (typeof msg === "string" && msg) out._form = msg;
    }
  }

  return out;
}

export function validatePortalRegisterForm(form: PortalRegisterForm): Record<string, string> {
  const errors: Record<string, string> = {};

  if (form.fullName.trim().length < 2) {
    errors.fullName = "Informe seu nome completo.";
  }

  const email = form.email.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "E-mail inválido.";
  }

  const phoneIssue = getRegistrationPhoneIssue(
    form.phoneDdi,
    `${form.phoneDdd}${form.phoneNumber}`,
  );
  if (phoneIssue) {
    errors.phoneNumber = registrationPhoneErrorMessage("pt", phoneIssue);
  }

  if (!form.state.trim()) errors.state = "Informe o estado.";
  if (!form.city.trim()) errors.city = "Informe a cidade.";

  if (form.description.trim().length < 10) {
    errors.description = "Descreva com pelo menos 10 caracteres.";
  }

  if (form.password.length < 8) {
    errors.password = PASSWORD_HINT;
  } else if (!/[A-Z]/.test(form.password)) {
    errors.password = "Inclua pelo menos 1 letra maiúscula.";
  } else if (!/[0-9]/.test(form.password)) {
    errors.password = "Inclua pelo menos 1 número.";
  } else if (!/[^A-Za-z0-9]/.test(form.password)) {
    errors.password = "Inclua pelo menos 1 símbolo (!@#$% etc.).";
  }

  if (!form.acceptedTelemedicineTcle) errors.acceptedTelemedicineTcle = "Aceite o TCLE.";
  if (!form.acceptedTerms) errors.acceptedTerms = "Aceite os Termos de uso.";
  if (!form.acceptedPrivacy) errors.acceptedPrivacy = "Aceite a Política de privacidade.";

  return errors;
}

export function firstPortalRegisterErrorMessage(errors: Record<string, string>): string {
  if (errors._form) return errors._form;
  return "Verifique os campos destacados em vermelho.";
}

export function portalRegisterFieldAnchor(field: string): string {
  if (field === "phoneNumber" || field === "phoneDdi" || field === "phoneDdd") return "phone";
  if (field.startsWith("accepted")) return "consent";
  return field;
}
