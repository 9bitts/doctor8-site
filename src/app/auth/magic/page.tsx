"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function MagicLinkPage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    const callback = searchParams.get("callback") || "/patient/appointments";

    if (!token) {
      setError("invalid");
      return;
    }

    signIn("magic-link", {
      token,
      redirect: true,
      callbackUrl: callback,
    }).catch(() => setError("failed"));
  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center">
          <h1 className="text-lg font-bold text-slate-800 mb-2">
            {error === "invalid" ? t("auth.magic.invalidTitle") : t("auth.magic.failedTitle")}
          </h1>
          <p className="text-slate-500 text-sm mb-6">{t("auth.magic.expiredHint")}</p>
          <Link
            href="/login"
            className="inline-block bg-brand-500 text-white font-semibold px-6 py-2.5 rounded-xl text-sm"
          >
            {t("auth.magic.goToLogin")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="flex items-center gap-3 text-slate-500 text-sm">
        <Loader2 className="animate-spin" size={22} />
        {t("auth.magic.signingIn")}
      </div>
    </div>
  );
}
