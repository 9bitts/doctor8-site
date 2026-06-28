"use client";

import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function MagicLinkFallback() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-sm">
      <Loader2 className="animate-spin mr-2" size={18} />
      {t("auth.magic.signingIn")}
    </div>
  );
}
