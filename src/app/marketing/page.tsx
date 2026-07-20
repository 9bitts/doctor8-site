import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import MarketingHub from "@/components/marketing/MarketingHub";
import { MARKETING_HUB_META } from "@/lib/marketing-hub-content";

export const metadata = {
  title: MARKETING_HUB_META.title,
  description: MARKETING_HUB_META.description,
  openGraph: {
    title: MARKETING_HUB_META.title,
    description: MARKETING_HUB_META.description,
    url: "/marketing",
    type: "website",
  },
};

export default function MarketingHubPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav logoHref="/marketing" />
      <MarketingHub />
      <MarketingFooter />
    </div>
  );
}
