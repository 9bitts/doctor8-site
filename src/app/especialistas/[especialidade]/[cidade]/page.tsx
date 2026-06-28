import { Suspense } from "react";
import { cookies } from "next/headers";
import { normalizeLang } from "@/lib/i18n/translations";
import {
  seoSlugToSpecialtyLabel,
  citySlugToLabel,
  buildPublicSearchUrl,
} from "@/lib/public-profile";
import PublicSearchClient from "@/components/public/PublicSearchClient";
import { Loader2 } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: { especialidade: string; cidade: string };
}) {
  const lang = normalizeLang(cookies().get("doctor8.lang")?.value);
  const specialty = seoSlugToSpecialtyLabel(params.especialidade, lang);
  const city = citySlugToLabel(params.cidade);

  return {
    title: `${specialty} em ${city} | Doctor8`,
    description: `Encontre ${specialty} em ${city}. Compare profissionais, horários e agende sua consulta.`,
    alternates: {
      canonical: buildPublicSearchUrl(params.especialidade, params.cidade),
    },
  };
}

function SearchFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-brand-500" size={32} />
    </div>
  );
}

export default function PublicSearchPage({
  params,
}: {
  params: { especialidade: string; cidade: string };
}) {
  return (
    <Suspense fallback={<SearchFallback />}>
      <PublicSearchClient
        especialidade={params.especialidade}
        cidade={params.cidade}
      />
    </Suspense>
  );
}
