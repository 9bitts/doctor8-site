import { notFound } from "next/navigation";
import { getLivePublicProfileBySlug } from "@/lib/public-profile";
import EmbedBookingClient from "@/components/public/EmbedBookingClient";

export const dynamic = "force-dynamic";

export default async function EmbedAgendaPage({
  params,
}: {
  params: { slug: string };
}) {
  const profile = await getLivePublicProfileBySlug(params.slug);
  if (!profile) notFound();

  return <EmbedBookingClient profile={profile} />;
}
