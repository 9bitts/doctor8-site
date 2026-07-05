import NaturalMedicineMainHub from "@/components/natural-medicine/NaturalMedicineMainHub";
import { NATURAL_MEDICINE_PRACTICES } from "@/lib/natural-medicine/config";
import { requireNaturalMedicinePortal } from "@/lib/natural-medicine/server";

export default async function ProfessionalMedicinaNaturalPage() {
  await requireNaturalMedicinePortal("professional");
  return (
    <NaturalMedicineMainHub
      portal="professional"
      enabledPractices={NATURAL_MEDICINE_PRACTICES}
    />
  );
}
