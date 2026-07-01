import { MeetingRoomsDashboardPage } from "@/lib/meeting-rooms-dashboard-page";

export default function PsychoanalystMeetingRoomsPage() {
  return MeetingRoomsDashboardPage({ allowedRoles: ["PSYCHOANALYST"] });
}
