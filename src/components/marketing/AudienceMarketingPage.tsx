import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import MarketingAccessHub from "@/components/marketing/MarketingAccessHub";
import AudienceMarketingLanding from "@/components/marketing/AudienceMarketingLanding";
import type { AudienceId } from "@/lib/audience-landing-content";
import { getAudienceLanding } from "@/lib/audience-landing-content";

type Props = {
  audience: AudienceId;
  showAccessHub?: boolean;
};

export default function AudienceMarketingPage({ audience, showAccessHub = true }: Props) {
  const content = getAudienceLanding(audience);

  return (
    <div className="min-h-screen bg-white">
      <MarketingNav active={audience} />
      {showAccessHub && <MarketingAccessHub content={content} />}
      <AudienceMarketingLanding content={content} />
      <MarketingFooter />
    </div>
  );
}
