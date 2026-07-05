import MedicinalTeaDetail from "@/components/medicinal-teas/MedicinalTeaDetail";

export default async function ProfessionalChaDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <MedicinalTeaDetail slug={slug} />;
}
