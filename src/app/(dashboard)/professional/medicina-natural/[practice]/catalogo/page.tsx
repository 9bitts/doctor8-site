import MedicinaNaturalCatalog from "@/components/medicina-natural-catalog/MedicinaNaturalCatalog";
import { requireNaturalMedicinePractice } from "@/lib/natural-medicine/server";

export default async function ProfessionalMedicinaNaturalCatalogPage({
  params,
}: {
  params: Promise<{ practice: string }>;
}) {
  const { practice: practiceUrlSlug } = await params;
  const { practice } = await requireNaturalMedicinePractice("professional", practiceUrlSlug);
  return <MedicinaNaturalCatalog practice={practice} />;
}
