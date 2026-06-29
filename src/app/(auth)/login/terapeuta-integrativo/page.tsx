import PortalLoginPage from "@/components/auth/PortalLoginPage";
import { PORTAL_BY_ID } from "@/lib/auth-portals";

export default function IntegrativeTherapistLoginPage() {
  return <PortalLoginPage config={PORTAL_BY_ID["integrative-therapist"]} />;
}
