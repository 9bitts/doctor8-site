import { notFound } from "next/navigation";
import ProfessionalProfessionClient from "@/components/professional/ProfessionalProfessionClient";
import { isValidProfessionSlug } from "@/lib/professional-landing-content";
import { getProLandingContent } from "@/lib/professional-landing-content";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return [
    { slug: "medico" },
    { slug: "psicologo" },
    { slug: "psicanalista" },
    { slug: "terapeuta_integrativo" },
    { slug: "fisioterapeuta" },
    { slug: "nutricionista" },
    { slug: "enfermeiro" },
    { slug: "farmaceutico" },
    { slug: "cuidados_paliativos" },
  ];
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  if (!isValidProfessionSlug(slug)) return {};
  const prof = getProLandingContent("pt").professionPages[slug];
  return {
    title: `${prof.title} — Doctor8 Profissionais`,
    description: prof.heroDesc,
  };
}

export default async function ProfessionalProfessionPage({ params }: Props) {
  const { slug } = await params;
  if (!isValidProfessionSlug(slug)) notFound();
  return <ProfessionalProfessionClient slug={slug} />;
}
