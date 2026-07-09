import AudienceMarketingPage from "@/components/marketing/AudienceMarketingPage";
import { getAudienceLanding } from "@/lib/audience-landing-content";

const content = getAudienceLanding("parceiros");

export const metadata = {
  title: content.meta.title,
  description: content.meta.description,
};

export default function ParceirosLandingPage() {
  return <AudienceMarketingPage audience="parceiros" />;
}
