import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import HipertensaoLanding from "@/components/marketing/HipertensaoLanding";
import { HIPERTENSAO_LANDING } from "@/lib/hipertensao-landing-content";

export const metadata = {
  title: HIPERTENSAO_LANDING.meta.title,
  description: HIPERTENSAO_LANDING.meta.description,
  openGraph: {
    title: HIPERTENSAO_LANDING.meta.title,
    description: HIPERTENSAO_LANDING.meta.description,
    url: "/hipertensao",
    type: "website",
    images: [
      {
        url: "/marketing/hipertensao/hero.webp",
        width: 1920,
        height: 1080,
        alt: HIPERTENSAO_LANDING.hero.image.alt,
      },
    ],
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: HIPERTENSAO_LANDING.faq.items.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.a,
    },
  })),
};

export default function HipertensaoPage() {
  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <MarketingNav logoHref="/marketing" />
      <HipertensaoLanding />
      <MarketingFooter />
    </div>
  );
}
