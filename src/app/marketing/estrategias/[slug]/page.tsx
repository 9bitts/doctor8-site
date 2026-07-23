import { notFound } from "next/navigation";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import MarketingStrategyView from "@/components/marketing/MarketingStrategyView";
import {
  getMarketingStrategy,
  getMarketingStrategySlugs,
} from "@/lib/marketing-strategy-content";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getMarketingStrategySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const strategy = getMarketingStrategy(slug);
  if (!strategy) return { title: "Estratégia — Doctor8" };
  return {
    title: strategy.meta.title,
    description: strategy.meta.description,
    openGraph: {
      title: strategy.meta.title,
      description: strategy.meta.description,
      url: `/marketing/estrategias/${strategy.slug}`,
      type: "website",
    },
  };
}

export default async function MarketingStrategySlugPage({ params }: Props) {
  const { slug } = await params;
  const strategy = getMarketingStrategy(slug);
  if (!strategy) notFound();

  return (
    <div className="min-h-screen bg-white">
      <MarketingNav logoHref="/marketing" />
      <MarketingStrategyView strategy={strategy} />
      <MarketingFooter />
    </div>
  );
}