"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import { Lang } from "@/lib/i18n/translations";
import HumanitarianShell from "@/components/humanitarian/HumanitarianShell";
import HumanitarianAnamneseForm from "@/components/humanitarian/HumanitarianAnamneseForm";
import { getHumanitarianLang } from "@/components/humanitarian/HumanitarianLangSwitcher";

export default function HumanitarianAnamnesePage() {
  const router = useRouter();
  const slug = VENEZUELA_CAMPAIGN_SLUG;

  const [lang, setLang] = useState<Lang>("es");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLang(getHumanitarianLang());
  }, []);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => {
        if (!s?.user) {
          router.push(`/login?callbackUrl=/humanitarian/${slug}/anamnese`);
          return;
        }
        if (s.user.role !== "PATIENT") {
          router.push("/humanitarian/volunteer");
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
