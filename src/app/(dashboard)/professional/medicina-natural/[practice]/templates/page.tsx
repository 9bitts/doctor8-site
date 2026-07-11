import MnPrescriptionTemplates from "@/components/natural-medicine/MnPrescriptionTemplates";
import { naturalMedicineBasePath } from "@/lib/natural-medicine/config";
import { requireNaturalMedicinePractice } from "@/lib/natural-medicine/server";

export default async function ProfessionalPracticeTemplatesPage({
  params,
}: {
  params: Promise<{ practice: string }>;
}) {
  const { practice: practiceUrlSlug } = await params;
  const { practice } = await requireNaturalMedicinePractice("professional", practiceUrlSlug);
  const backHref = `${naturalMedicineBasePath("professional")}/${practice.urlSlug}`;
  return (
    <MnPrescriptionTemplates portal="professional" practice={practice} backHref={backHref} />
  );
}
