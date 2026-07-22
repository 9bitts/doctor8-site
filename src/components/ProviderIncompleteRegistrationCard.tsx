"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { RegistrationChecklistKey } from "@/lib/provider-registration-complete";
import { registrationChecklistHash } from "@/lib/provider-registration-complete";

export default function ProviderIncompleteRegistrationCard({
  settingsHref,
  missing,
}: {
  settingsHref: string;
  missing?: RegistrationChecklistKey[];
}) {
  const { t } = useI18n();

  const firstMissing = missing?.[0];
  const href = firstMissing
    ? `${settingsHref}#${registrationChecklistHash(firstMissing)}`
    : settingsHref;

  return (
    <div className="mb-6">
      <Link
        href={href}
        className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
      >
        {t("provider.registration.action")} <ChevronRight size={16} />
      </Link>
    </div>
  );
}
