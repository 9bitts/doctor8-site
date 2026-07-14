export const CANNABIS_MEDICINAL_TCLE_VERSION = "1.0";

export const CANNABIS_TCLE_VERSION_LABEL = `TCLE Cannabis Medicinal v${CANNABIS_MEDICINAL_TCLE_VERSION} (RDC 1.015/2026)`;

export function cannabisTcleAuditLine(acceptedAt: Date = new Date()): string {
  return `[${CANNABIS_TCLE_VERSION_LABEL} — registrado em ${acceptedAt.toISOString()}]`;
}

export const CANNABIS_TCLE_BULLETS_PT = [
  "Produtos de cannabis são indicados quando alternativas terapêuticas registradas foram esgotadas ou são inadequadas.",
  "O paciente foi informado sobre benefícios esperados, riscos, efeitos adversos e limitações regulatórias.",
  "A prescrição segue a RDC Anvisa nº 1.015/2026 e a Portaria SVS/MS nº 344/1998.",
  "O profissional responsável acompanha clinicamente o paciente e documenta a evolução no prontuário.",
] as const;
