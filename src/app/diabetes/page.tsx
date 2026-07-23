import MarketingFooter from "@/components/marketing/MarketingFooter";
import DiabetesLanding from "@/components/marketing/DiabetesLanding";
import { DIABETES_LANDING } from "@/lib/diabetes-landing-content";

export const metadata = {
  title: DIABETES_LANDING.meta.title,
  description: DIABETES_LANDING.meta.description,
  openGraph: {
    title: DIABETES_LANDING.meta.title,
    description: DIABETES_LANDING.meta.description,
    url: "/diabetes",
    type: "website",
    images: [
      {
        url: "/marketing/diabetes/hero.webp",
        width: 1920,
        height: 1080,
        alt: DIABETES_LANDING.hero.image.alt,
      },
    ],
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: DIABETES_LANDING.faq.items.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.a,
    },
  })),
};

export default function DiabetesPage() {
  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <DiabetesLanding />
      <MarketingFooter />
    </div>
  );
}
