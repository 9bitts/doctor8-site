import { existsSync } from "fs";
import path from "path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import ConditionLanding from "@/components/marketing/ConditionLanding";
import {
  buildConditionLanding,
  categoriaSlug,
  CONDITION_RESERVED_SLUGS,
  getConditionBySlug,
  listConditionSlugsForStatic,
} from "@/lib/condition-seo";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return listConditionSlugsForStatic().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = getConditionBySlug(slug);
  if (!entry || CONDITION_RESERVED_SLUGS.has(slug)) return {};
  const content = buildConditionLanding(entry);
  const hero = resolveHeroSrc(entry.slug, entry.categoria);
  return {
    title: content.meta.title,
    description: content.meta.description,
    openGraph: {
      title: content.meta.title,
      description: content.meta.description,
      url: `/${slug}`,
      type: "website",
      images: [{ url: hero, width: 1920, height: 1080, alt: content.hero.image.alt }],
    },
  };
}

function resolvePublicImage(...relativeParts: string[]): string | null {
  const candidate = path.join(process.cwd(), "public", ...relativeParts);
  if (existsSync(candidate)) return `/${relativeParts.join("/")}`;
  const asWebp = candidate.replace(/\.png$/i, ".webp");
  if (asWebp !== candidate && existsSync(asWebp)) {
    return `/${relativeParts.join("/").replace(/\.png$/i, ".webp")}`;
  }
  const asPng = candidate.replace(/\.webp$/i, ".png");
  if (asPng !== candidate && existsSync(asPng)) {
    return `/${relativeParts.join("/").replace(/\.webp$/i, ".png")}`;
  }
  return null;
}

function resolveHeroSrc(slug: string, categoria: string): string {
  const unique =
    resolvePublicImage("marketing", "condicoes", slug, "hero.png") ||
    resolvePublicImage("marketing", "condicoes", slug, "hero.webp");
  if (unique) return unique;
  const cat = categoriaSlug(categoria);
  const category =
    resolvePublicImage("marketing", "condicoes", "_categorias", `${cat}.png`) ||
    resolvePublicImage("marketing", "condicoes", "_categorias", `${cat}.webp`);
  if (category) return category;
  return (
    resolvePublicImage("marketing", "condicoes", "_shared", "hero-fallback.png") ||
    resolvePublicImage("marketing", "condicoes", "_shared", "hero-fallback.webp") ||
    "/marketing/condicoes/_shared/hero-fallback.png"
  );
}

function resolveCareSrc(): string {
  return (
    resolvePublicImage("marketing", "condicoes", "_shared", "cuidado.png") ||
    resolvePublicImage("marketing", "condicoes", "_shared", "cuidado.webp") ||
    resolveHeroSrc("hipertensao-arterial", "Cardiovascular")
  );
}

export default async function ConditionSeoPage({ params }: Props) {
  const { slug } = await params;
  if (CONDITION_RESERVED_SLUGS.has(slug)) notFound();
  const entry = getConditionBySlug(slug);
  if (!entry) notFound();

  const content = buildConditionLanding(entry);
  const heroSrc = resolveHeroSrc(entry.slug, entry.categoria);
  const careSrc = resolveCareSrc();
  content.howItWorks.image.src =
    resolvePublicImage("marketing", "condicoes", "_shared", "consulta.png") ||
    resolvePublicImage("marketing", "condicoes", "_shared", "consulta.webp") ||
    heroSrc;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: content.faq.items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <ConditionLanding content={content} heroSrc={heroSrc} careSrc={careSrc} />
      <MarketingFooter />
    </div>
  );
}
