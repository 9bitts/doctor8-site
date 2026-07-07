import FloralPrescriptionTemplates from "@/components/natural-medicine/FloralPrescriptionTemplates";
import { naturalMedicineBasePath } from "@/lib/natural-medicine/config";
import { requireNaturalMedicinePractice } from "@/lib/natural-medicine/server";
import { redirect } from "next/navigation";

export default async function IntegrativePracticeTemplatesPage({
  params,
}: {
  params: Promise<{ practice: string }>;
}) {
  const { practice: practiceUrlSlug } = await params;
  const { practice } = await requireNaturalMedicinePractice("integrative", practiceUrlSlug);
  if (practice.id !== "terapia_florais") {
    redirect(`${naturalMedicineBasePath("integrative")}/${practice.urlSlug}`);
  }
  const backHref = `${naturalMedicineBasePath("integrative")}/${practice.urlSlug}`;
  return <FloralPrescriptionTemplates practice={practice} backHref={backHref} />;
}
