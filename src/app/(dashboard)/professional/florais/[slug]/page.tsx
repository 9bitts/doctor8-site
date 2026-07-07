import FloralItemDetail from "@/components/florais-catalog/FloralItemDetail";

export default async function ProfessionalFloralDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <FloralItemDetail slug={slug} />;
}
