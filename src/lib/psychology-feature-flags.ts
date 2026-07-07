/** Feature flags for psychology enhancements — default ON when env unset. */

function envOn(raw: string | undefined, defaultOn = true): boolean {
  if (raw === undefined || raw === "") return defaultOn;
  const n = raw.trim().toLowerCase();
  return n === "true" || n === "1" || n === "yes";
}

export function isPsychologyAnamnesisEnabled(): boolean {
  return envOn(process.env.PSYCHOLOGY_ANAMNESIS_ENABLED);
}

export function isPsychologyAiNotesEnabled(): boolean {
  return envOn(process.env.PSYCHOLOGY_AI_NOTES_ENABLED);
}

export function isPsychologyReceitaSaudeEnabled(): boolean {
  return envOn(process.env.PSYCHOLOGY_RECEITA_SAUDE_ENABLED);
}

export function isPsychology24hWhatsAppEnabled(): boolean {
  return envOn(process.env.PSYCHOLOGY_24H_WHATSAPP_ENABLED);
}

export function isPsychologyRiskAlertsEnabled(): boolean {
  return envOn(process.env.PSYCHOLOGY_RISK_ALERTS_ENABLED);
}

export function isPsychologyGoogleCalendarEnabled(): boolean {
  return envOn(process.env.PSYCHOLOGY_GOOGLE_CALENDAR_ENABLED);
}

export function isPsychologyChartChatEnabled(): boolean {
  return envOn(process.env.PSYCHOLOGY_CHART_CHAT_ENABLED);
}
