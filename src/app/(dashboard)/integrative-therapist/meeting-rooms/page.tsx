import { MeetingRoomsDashboardPage } from "@/lib/meeting-rooms-dashboard-page";

export default function IntegrativeTherapistMeetingRoomsPage() {
  return MeetingRoomsDashboardPage({ allowedRoles: ["INTEGRATIVE_THERAPIST"] });
}
