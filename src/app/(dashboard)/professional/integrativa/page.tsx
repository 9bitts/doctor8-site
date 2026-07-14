import { redirect } from "next/navigation";
import { PROFESSIONAL_INTEGRATIVE_HUB } from "@/lib/integrative-medicine/professional-routes";

export default function ProfessionalIntegrativaAliasPage() {
  redirect(PROFESSIONAL_INTEGRATIVE_HUB);
}
