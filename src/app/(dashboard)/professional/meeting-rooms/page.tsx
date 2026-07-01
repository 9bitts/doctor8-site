import { MeetingRoomsDashboardPage } from "@/lib/meeting-rooms-dashboard-page";

export default function ProfessionalMeetingRoomsPage() {
  return MeetingRoomsDashboardPage({ allowedRoles: ["PROFESSIONAL"] });
}
