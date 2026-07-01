import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { resolveRoleHome } from "@/lib/role-home";
import MeetingRoomsClient from "@/components/professional/MeetingRoomsClient";
import { MEETING_ROOMS, getMeetingRoomMeetUrl } from "@/lib/meeting-rooms";

export default async function ProfessionalMeetingRoomsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PROFESSIONAL") redirect(resolveRoleHome(session.user.role));

  const rooms = MEETING_ROOMS.map((room) => ({
    ...room,
    meetUrl: getMeetingRoomMeetUrl(room.id),
  }));

  return <MeetingRoomsClient rooms={rooms} />;
}
