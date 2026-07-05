import PicsSessionsList from "@/components/natural-medicine/PicsSessionsList";
import { naturalMedicineBasePath } from "@/lib/natural-medicine/config";
import { requireNaturalMedicinePractice } from "@/lib/natural-medicine/server";

export default async function IntegrativePracticeSessionsPage({
  params,
}: {
  params: Promise<{ practice: string }>;
}) {
  const { practice: practiceUrlSlug } = await params;
  const { practice } = await requireNaturalMedicinePractice("integrative", practiceUrlSlug);
  const backHref = `${naturalMedicineBasePath("integrative")}/${practice.urlSlug}`;
  return <PicsSessionsList practice={practice} backHref={backHref} />;
}
