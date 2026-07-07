// Receita Saúde helper — guides psychologists through official RF receipt obligations (PF).

export interface ReceitaSaudeSessionData {
  patientName: string;
  patientCpf: string;
  beneficiaryCpf?: string;
  serviceDate: string; // YYYY-MM-DD
  amountBrl: string;
  description: string;
}

export const RECEITA_SAUDE_OFFICIAL_URL =
  "https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/receita-saude";

export const RECEITA_SAUDE_APP_LINKS = {
  android: "https://play.google.com/store/apps/details?id=br.gov.receita.receitasaude",
  ios: "https://apps.apple.com/br/app/receita-sa%C3%BAde/id6478903842",
  web: "https://cav.receita.fazenda.gov.br/ecac/",
};

export function formatReceitaSaudeDescription(sessionDate: string, sessionType = "Psicoterapia"): string {
  const [y, m, d] = sessionDate.split("-");
  const brDate = d && m && y ? `${d}/${m}/${y}` : sessionDate;
  return `${sessionType} — sessão em ${brDate}`;
}

export function buildReceitaSaudeChecklist(lang: "pt" | "en" | "es" = "pt"): string[] {
  if (lang === "en") {
    return [
      "Confirm you bill as individual (PF), not as a company (PJ/DMED).",
      "Open the Receita Saúde app or e-CAC and log in with gov.br.",
      "Issue one digital receipt per payment received from the patient.",
      "Enter patient CPF (payer) and beneficiary CPF if different.",
      "Service code: 255 — Psychologist.",
      "Amount must match what was actually received.",
      "Monthly Carnê-Leão: declare revenue from PF patients each month.",
    ];
  }
  if (lang === "es") {
    return [
      "Confirme que factura como persona física (PF), no como empresa.",
      "Abra la app Receita Saúde o e-CAC con gov.br.",
      "Emita un recibo digital por cada pago recibido.",
      "CPF del pagador y del beneficiario si son distintos.",
      "Código de servicio: 255 — Psicólogo.",
      "El valor debe coincidir con lo recibido.",
      "Carnê-Leão mensual: declare ingresos de pacientes PF cada mes.",
    ];
  }
  return [
    "Confirme que você atende como pessoa física (PF) — PJ usa DMED, não Receita Saúde.",
    "Acesse o app Receita Saúde ou o Carnê-Leão Web (e-CAC) com login gov.br.",
    "Emita um recibo digital para cada pagamento recebido do paciente.",
    "Informe o CPF de quem pagou e o CPF do beneficiário se forem pessoas diferentes.",
    "Código do serviço: 255 — Psicólogo.",
    "O valor deve ser exatamente o recebido na prestação do serviço.",
    "Todo mês: apure o Carnê-Leão com a receita declarada no Receita Saúde.",
  ];
}
