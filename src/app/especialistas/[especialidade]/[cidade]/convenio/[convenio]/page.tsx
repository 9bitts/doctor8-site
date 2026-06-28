import { Suspense } from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { normalizeLang } from "@/lib/i18n/translations";
import {
  seoSlugToSpecialtyLabel,
  citySlugToLabel,
  buildPublicSearchConvenioUrl,
} from "@/lib/public-slugs";
import { db } from "@/lib/db";
import PublicSearchClient from "@/components/public/PublicSearchClient";
import { Loader2 } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: { especialidade: string; cidade: string; convenio: string };
}) {
  const lang = normalizeLang(cookies().get("doctor8.lang")?.value);
  const specialty = seoSlugToSpecialtyLabel(params.especialidade, lang);
  const city = citySlugToLabel(params.cidade);
  const plan = await db.healthPlan.findUnique({
    where: { slug: params.convenio },
    select: { name: true },
  });
  const planName = plan?.name || params.convenio.replace(/-/g, " ");

  return {
    title: `${specialty} em ${city} — ${planName} | Doctor8`,
    description: `Encontre ${specialty} em ${city} que atendem ${planName}. Compare horários e agende online.`,
    alternates: {
      canonical: buildPublicSearchConvenioUrl(
        params.especialidade,
        params.cidade,
        params.convenio
      ),
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

export default async function PublicSearchConvenioPage({
  params,
}: {
  params: { especialidade: string; cidade: string; convenio: string };
}) {
  const plan = await db.healthPlan.findUnique({
    where: { slug: params.convenio },
    select: { slug: true },
  });
  if (!plan) notFound();

  return (
    <Suspense fallback={<SearchFallback />}>
      <PublicSearchClient
        especialidade={params.especialidade}
        cidade={params.cidade}
        initialConvenio={params.convenio}
        seoConvenioMode
      />
    </Suspense>
  );
}
