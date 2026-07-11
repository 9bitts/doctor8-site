import AcuraIntakeDetailClient from "./AcuraIntakeDetailClient";

export default async function AcuraIntakeDetailPage({
  params,
}: {
  params: Promise<{ protocolo: string }>;
}) {
  const { protocolo } = await params;
  return <AcuraIntakeDetailClient protocolo={decodeURIComponent(protocolo)} />;
}
