"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { buildAdminWhatsAppInboxHref } from "@/lib/admin/whatsapp-inbox-links";
import { buildWhatsAppUrl } from "@/lib/humanitarian/angel-utils";

export default function AdminContactWhatsAppActions({
  phone,
  displayName,
  patientProfileId,
  whatsappMessage,
  layout = "stack",
  onInboxClick,
}: {
  phone: string;
  displayName?: string;
  patientProfileId?: string;
  whatsappMessage?: string;
  layout?: "stack" | "inline";
  onInboxClick?: () => void;
}) {
  const { t } = useI18n();
  const inboxHref = buildAdminWhatsAppInboxHref({
    phone,
    draft: whatsappMessage,
    displayName,
    patientProfileId,
  });
  const personalHref = buildWhatsAppUrl(phone, whatsappMessage || "");

  const stackClass = layout === "stack" ? "flex flex-col gap-2" : "flex flex-wrap gap-2";

  return (
    <div className={stackClass}>
      <Link
        href={inboxHref}
        onClick={onInboxClick}
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition"
      >
        <MessageCircle size={16} />
        {t("admin.viewPhone.inbox")}
      </Link>
      {personalHref && (
        <a
          href={personalHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#25D366] text-[#128C7E] bg-[#25D366]/5 text-sm font-semibold hover:bg-[#25D366]/10 transition"
        >
          <MessageCircle size={16} />
          {t("admin.viewPhone.personalWhatsApp")}
        </a>
      )}
    </div>
  );
}
