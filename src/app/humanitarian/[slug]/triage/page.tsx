"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import { Lang } from "@/lib/i18n/translations";
import HumanitarianShell from "@/components/humanitarian/HumanitarianShell";
import HumanitarianTriageForm from "@/components/humanitarian/HumanitarianTriageForm";
import HumanitarianFlowStepper from "@/components/humanitarian/HumanitarianFlowStepper";
import { getHumanitarianLang } from "@/components/humanitarian/HumanitarianLangSwitcher";
import { useHumanitarianOutboxFlush } from "@/hooks/useHumanitarianOutboxFlush";

export default function HumanitarianTriagePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const retake = searchParams.get("retake") === "1";
  const slug = VENEZUELA_CAMPAIGN_SLUG;

  const [lang, setLang] = useState<Lang>("pt");
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
          router.push(`/login?callbackUrl=/humanitarian/${slug}/triage`);
          return;
        }
        if (s.user.role !== "PATIENT") {
          router.push("/humanitarian/volunteer");
          return;
        }

        const res = await fetch(`/api/humanitarian/intake?campaignSlug=${slug}`);
        const data = await res.json();
        if (res.ok && data.intake?.triageValid && !retake) {
          if (!data.intake?.tcleAccepted) {
            router.replace(`/humanitarian/${slug}/tcle`);
          } else {
            router.replace(`/humanitarian/${slug}`);
          }
          return;
        }
        setLoading(false);
      })
      .catch(() => router.push(`/login?callbackUrl=/humanitarian/${slug}/triage`));
  }, [router, slug, retake]);

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
      <div className="max-w-lg mx-auto space-y-5 py-2">
        <HumanitarianFlowStepper lang={lang} current="triage" dark />
        <HumanitarianTriageForm
        lang={lang}
        campaignSlug={slug}
        onComplete={() => router.push(`/humanitarian/${slug}/tcle`)}
      />
      </div>
    </HumanitarianShell>
  );
}
