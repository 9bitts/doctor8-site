/** Deep link into the admin WhatsApp inbox. */
export function buildAdminWhatsAppInboxHref(opts: {
  phone?: string | null;
  conversationId?: string | null;
  draft?: string | null;
  displayName?: string | null;
  patientProfileId?: string | null;
}): string {
  const params = new URLSearchParams();
  if (opts.conversationId?.trim()) {
    params.set("conversation", opts.conversationId.trim());
  } else if (opts.phone?.trim()) {
    params.set("phone", opts.phone.trim());
  }
  if (opts.draft?.trim()) params.set("draft", opts.draft.trim());
  if (opts.displayName?.trim()) params.set("name", opts.displayName.trim());
  if (opts.patientProfileId?.trim()) {
    params.set("patientProfileId", opts.patientProfileId.trim());
  }
  const qs = params.toString();
  return qs ? `/admin/mensagens?${qs}` : "/admin/mensagens";
}
