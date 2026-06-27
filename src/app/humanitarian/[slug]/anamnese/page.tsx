"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, FileText, ChevronRight } from "lucide-react";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import { translate, Lang } from "@/lib/i18n/translations";
import HumanitarianShell from "@/components/humanitarian/HumanitarianShell";
import { getHumanitarianLang } from "@/components/humanitarian/HumanitarianLangSwitcher";

function t(lang: Lang, key: string) {
  return translate(lang, key);
}

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
      <div className="space-y-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto">
          <FileText size={28} className="text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">{t(lang, "hum.anamnese.title")}</h1>
          <p className="text-slate-400 text-sm mt-3 leading-relaxed max-w-md mx-auto">
            {t(lang, "hum.anamnese.comingSoon")}
          </p>
        </div>
        <Link
          href={`/humanitarian/${slug}`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm"
        >
          {t(lang, "hum.anamnese.backToCare")}
          <ChevronRight size={16} />
        </Link>
      </div>
    </HumanitarianShell>
  );
}
