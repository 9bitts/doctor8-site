import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import AnsiedadeLanding from "@/components/marketing/AnsiedadeLanding";
import { ANSIEDADE_LANDING } from "@/lib/ansiedade-landing-content";

export const metadata = {
  title: ANSIEDADE_LANDING.meta.title,
  description: ANSIEDADE_LANDING.meta.description,
  openGraph: {
    title: ANSIEDADE_LANDING.meta.title,
    description: ANSIEDADE_LANDING.meta.description,
    url: "/ansiedade",
    type: "website",
    images: [
      {
        url: "/marketing/ansiedade/hero.webp",
        width: 1920,
        height: 1080,
        alt: ANSIEDADE_LANDING.hero.image.alt,
      },
    ],
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: ANSIEDADE_LANDING.faq.items.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.a,
    },
  })),
};

export default function AnsiedadePage() {
  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <MarketingNav logoHref="/marketing" />
      <AnsiedadeLanding />
      <MarketingFooter />
    </div>
  );
}
