import MedicinaNaturalItemDetail from "@/components/medicina-natural-catalog/MedicinaNaturalItemDetail";
import { requireNaturalMedicinePractice } from "@/lib/natural-medicine/server";

const RESERVED_SLUGS = new Set(["catalogo", "reference", "sessions", "templates"]);

export default async function ProfessionalMedicinaNaturalItemPage({
  params,
}: {
  params: Promise<{ practice: string; slug: string }>;
}) {
  const { practice: practiceUrlSlug, slug } = await params;
  if (RESERVED_SLUGS.has(slug)) {
    const { redirect } = await import("next/navigation");
    redirect(`/professional/medicina-natural/${practiceUrlSlug}`);
  }
  const { practice } = await requireNaturalMedicinePractice("professional", practiceUrlSlug);
  return <MedicinaNaturalItemDetail practice={practice} slug={slug} />;
}
