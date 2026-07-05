import PicsPracticeHub from "@/components/natural-medicine/PicsPracticeHub";
import { requireNaturalMedicinePractice } from "@/lib/natural-medicine/server";

export default async function IntegrativePracticePage({
  params,
}: {
  params: Promise<{ practice: string }>;
}) {
  const { practice: practiceUrlSlug } = await params;
  const { practice } = await requireNaturalMedicinePractice("integrative", practiceUrlSlug);
  return <PicsPracticeHub portal="integrative" practice={practice} />;
}
