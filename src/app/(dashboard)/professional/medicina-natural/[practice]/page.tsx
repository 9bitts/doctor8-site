import PicsPracticeHub from "@/components/natural-medicine/PicsPracticeHub";
import { requireNaturalMedicinePractice } from "@/lib/natural-medicine/server";

export default async function ProfessionalPracticePage({
  params,
}: {
  params: Promise<{ practice: string }>;
}) {
  const { practice: practiceUrlSlug } = await params;
  const { practice } = await requireNaturalMedicinePractice("professional", practiceUrlSlug);
  return <PicsPracticeHub portal="professional" practice={practice} />;
}
