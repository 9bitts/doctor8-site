import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import AnfiteatroInviteClient from "@/components/anfiteatro/AnfiteatroInviteClient";
import { MEETING_ROOMS } from "@/lib/meeting-rooms";
import { resolveProfessionalPortalBaseForUser } from "@/lib/psychologist-portal";

export default async function AnfiteatroInvitePage({
  params,
}: {
  params: { roomId: string };
}) {
  const room = MEETING_ROOMS.find((r) => r.id === params.roomId);
  if (!room) notFound();

  const session = await auth();
  if (session?.user?.role === "PROFESSIONAL") {
    const base = await resolveProfessionalPortalBaseForUser(session.user.id);
    redirect(`${base}/meeting-rooms`);
  }
  if (session?.user?.role === "ADMIN") {
    redirect("/professional/meeting-rooms");
  }

  return <AnfiteatroInviteClient room={room} />;
}
