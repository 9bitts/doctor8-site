import PicsReferenceView from "@/components/natural-medicine/PicsReferenceView";
import { naturalMedicineBasePath } from "@/lib/natural-medicine/config";
import { requireNaturalMedicinePractice } from "@/lib/natural-medicine/server";

export default async function IntegrativePracticeReferencePage({
  params,
}: {
  params: Promise<{ practice: string }>;
}) {
  const { practice: practiceUrlSlug } = await params;
  const { practice } = await requireNaturalMedicinePractice("integrative", practiceUrlSlug);
  const backHref = `${naturalMedicineBasePath("integrative")}/${practice.urlSlug}`;
  return <PicsReferenceView practice={practice} backHref={backHref} />;
}
