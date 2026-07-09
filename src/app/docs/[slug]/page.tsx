import DocsDocumentView from "@/components/compliance/DocsDocumentView";
import { getComplianceDoc, getComplianceDocSlugs } from "@/lib/legal/compliance-docs/catalog";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getComplianceDocSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const doc = getComplianceDoc(slug);
  if (!doc) return { title: "Documento não encontrado | Doctor8" };
  return {
    title: `${doc.title} | Doctor8 Docs`,
    description: doc.description,
    robots: { index: true, follow: true },
  };
}

export default async function DocsSlugPage({ params }: Props) {
  const { slug } = await params;
  return <DocsDocumentView slug={slug} />;
}
