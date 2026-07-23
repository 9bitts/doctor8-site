import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import DepressaoLanding from "@/components/marketing/DepressaoLanding";
import { DEPRESSAO_LANDING } from "@/lib/depressao-landing-content";

export const metadata = {
  title: DEPRESSAO_LANDING.meta.title,
  description: DEPRESSAO_LANDING.meta.description,
  openGraph: {
    title: DEPRESSAO_LANDING.meta.title,
    description: DEPRESSAO_LANDING.meta.description,
    url: "/depressao",
    type: "website",
    images: [
      {
        url: "/marketing/depressao/hero.webp",
        width: 1920,
        height: 1080,
        alt: DEPRESSAO_LANDING.hero.image.alt,
      },
    ],
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: DEPRESSAO_LANDING.faq.items.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.a,
    },
  })),
};

export default function DepressaoPage() {
  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <MarketingNav logoHref="/marketing" />
      <DepressaoLanding />
      <MarketingFooter />
    </div>
  );
}
