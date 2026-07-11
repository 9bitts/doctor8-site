import MedicinaNaturalCatalog from "@/components/medicina-natural-catalog/MedicinaNaturalCatalog";
import { requireNaturalMedicinePractice } from "@/lib/natural-medicine/server";

export default async function IntegrativeMedicinaNaturalCatalogPage({
  params,
}: {
  params: Promise<{ practice: string }>;
}) {
  const { practice: practiceUrlSlug } = await params;
  const { practice } = await requireNaturalMedicinePractice("integrative", practiceUrlSlug);
  return <MedicinaNaturalCatalog practice={practice} />;
}
