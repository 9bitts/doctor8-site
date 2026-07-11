import { redirect } from "next/navigation";

export default async function ProfessionalFloralDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/professional/medicina-natural/terapia-florais/${encodeURIComponent(slug)}`);
}
