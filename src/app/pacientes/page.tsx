import AudienceMarketingPage from "@/components/marketing/AudienceMarketingPage";
import { getAudienceLanding } from "@/lib/audience-landing-content";

const content = getAudienceLanding("pacientes");

export const metadata = {
  title: content.meta.title,
  description: content.meta.description,
};

export default function PacientesLandingPage() {
  return <AudienceMarketingPage audience="pacientes" />;
}
