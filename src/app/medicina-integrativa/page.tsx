import { redirect } from "next/navigation";
import { INTEGRATIVE_MEDICINE_LANDING } from "@/lib/integrative-medicine/professional-routes";

export default function MedicinaIntegrativaAliasPage() {
  redirect(INTEGRATIVE_MEDICINE_LANDING);
}
