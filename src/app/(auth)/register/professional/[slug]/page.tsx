import { notFound } from "next/navigation";
import ProfessionalProfessionClient from "@/components/professional/ProfessionalProfessionClient";
import { isValidProfessionSlug, PROFESSION_SLUGS } from "@/lib/professional-landing-content";
import { getProLandingContent } from "@/lib/professional-landing-content";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return PROFESSION_SLUGS.map((slug) => ({ slug }));
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
