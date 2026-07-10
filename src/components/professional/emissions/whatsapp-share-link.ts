/** Opens WhatsApp Web/app with a pre-filled message (no Cloud API). */
export function openWhatsAppShareLink(opts: {
  patientName: string;
  shareUrl: string;
  messageTemplate: string;
}): void {
  const url = opts.shareUrl || `${window.location.origin}/register`;
  const msg = opts.messageTemplate
    .replace(/\{\{name\}\}/g, opts.patientName)
    .replace(/\{\{link\}\}/g, url);
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
}
