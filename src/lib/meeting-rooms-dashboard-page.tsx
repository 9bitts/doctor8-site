import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { resolveRoleHome } from "@/lib/role-home";
import { resolveProfessionalPortalBaseForUser } from "@/lib/psychologist-portal";
import MeetingRoomsClient from "@/components/professional/MeetingRoomsClient";
import {
  MEETING_ROOMS,
  getMeetingRoomMeetUrl,
  getMeetingRoomInviteUrl,
} from "@/lib/meeting-rooms";

type ProviderRole = "PROFESSIONAL" | "PSYCHOANALYST" | "INTEGRATIVE_THERAPIST";

export async function MeetingRoomsDashboardPage({
  allowedRoles,
}: {
  allowedRoles: ProviderRole[];
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!allowedRoles.includes(session.user.role as ProviderRole)) {
    redirect(resolveRoleHome(session.user.role, session.user.professionalSpecialty));
  }

  const rooms = MEETING_ROOMS.map((room) => ({
    ...room,
    meetUrl: getMeetingRoomMeetUrl(room.id),
    inviteUrl: getMeetingRoomInviteUrl(room.id),
  }));

  return <MeetingRoomsClient rooms={rooms} />;
}

export async function meetingRoomsHomeForSession(user: {
  id: string;
  role: string;
  professionalSpecialty?: string | null;
}): Promise<string | null> {
  if (user.role === "ADMIN") return "/professional/meeting-rooms";
  if (user.role === "PSYCHOANALYST") return "/psychoanalyst/meeting-rooms";
  if (user.role === "INTEGRATIVE_THERAPIST") return "/integrative-therapist/meeting-rooms";
  if (user.role === "PROFESSIONAL") {
    const base = await resolveProfessionalPortalBaseForUser(user.id);
    return `${base}/meeting-rooms`;
  }
  return null;
}
