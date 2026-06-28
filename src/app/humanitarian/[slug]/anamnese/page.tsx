"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import { Lang } from "@/lib/i18n/translations";
import HumanitarianShell from "@/components/humanitarian/HumanitarianShell";
import HumanitarianAnamneseForm from "@/components/humanitarian/HumanitarianAnamneseForm";
import { getHumanitarianLang } from "@/components/humanitarian/HumanitarianLangSwitcher";
import { useHumanitarianOutboxFlush } from "@/hooks/useHumanitarianOutboxFlush";

export default function HumanitarianAnamnesePage() {
  const router = useRouter();
  const slug = VENEZUELA_CAMPAIGN_SLUG;

  const [lang, setLang] = useState<Lang>("es");
  const [loading, setLoading] = useState(true);

  useHumanitarianOutboxFlush(() => router.refresh());

  useEffect(() => {
    setLang(getHumanitarianLang());
  }, []);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then(async (s) => {
        if (!s?.user) {
          router.push(`/login?callbackUrl=/humanitarian/${slug}/anamnese`);
          return;
        }
        if (s.user.role !== "PATIENT") {
          router.push("/humanitarian/volunteer");
          return;
        }

        const intakeRes = await fetch(`/api/humanitarian/intake?campaignSlug=${slug}`);
        const intakeData = await intakeRes.json();
        if (!intakeRes.ok || !intakeData.intake?.triageValid) {
          router.replace(`/humanitarian/${slug}/triage`);
          return;
        }
        if (!intakeData.intake?.tcleAccepted) {
          router.replace(`/humanitarian/${slug}/tcle?return=${encodeURIComponent(`/humanitarian/${slug}/anamnese`)}`);
          return;
        }

        setLoading(false);
      })
      .catch(() => router.push(`/login?callbackUrl=/humanitarian/${slug}/anamnese`));
  }, [router, slug]);

  if (loading) {
    return (
      <HumanitarianShell lang={lang} onLangChange={setLang} dark>
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-emerald-400" />
        </div>
      </HumanitarianShell>
    );
  }

  return (
    <HumanitarianShell lang={lang} onLangChange={setLang} dark>
      <HumanitarianAnamneseForm lang={lang} campaignSlug={slug} />
    </HumanitarianShell>
  );
}
