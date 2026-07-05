import NaturalMedicineMainHub from "@/components/natural-medicine/NaturalMedicineMainHub";
import { requireNaturalMedicinePortal } from "@/lib/natural-medicine/server";

export default async function IntegrativeMedicinaNaturalPage() {
  const { enabledPractices } = await requireNaturalMedicinePortal("integrative");
  return (
    <NaturalMedicineMainHub portal="integrative" enabledPractices={enabledPractices} />
  );
}
