const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export function isWithinWhatsApp24hWindow(lastInboundAt: Date | null | undefined): boolean {
  if (!lastInboundAt) return false;
  return Date.now() - lastInboundAt.getTime() < TWENTY_FOUR_HOURS_MS;
}

export function conversationDisplayLabel(opts: {
  displayName?: string | null;
  patientName?: string | null;
  waPhone: string;
}): string {
  return opts.patientName?.trim() || opts.displayName?.trim() || opts.waPhone;
}

export function messagePreview(body: string | null | undefined, type: string): string {
  if (body?.trim()) return body.trim();
  if (type === "image") return "[Imagem]";
  if (type === "audio") return "[Áudio]";
  if (type === "document") return "[Documento]";
  if (type === "unsupported") return "[Mensagem não suportada]";
  return "";
}
