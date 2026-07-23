import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import MarketingStrategyIndex from "@/components/marketing/MarketingStrategyIndex";
import { MARKETING_STRATEGY_META } from "@/lib/marketing-strategy-content";

export const metadata = {
  title: MARKETING_STRATEGY_META.title,
  description: MARKETING_STRATEGY_META.description,
  openGraph: {
    title: MARKETING_STRATEGY_META.title,
    description: MARKETING_STRATEGY_META.description,
    url: "/marketing/estrategias",
    type: "website",
  },
};

export default function MarketingStrategiesPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav logoHref="/marketing" />
      <MarketingStrategyIndex />
      <MarketingFooter />
    </div>
  );
}
