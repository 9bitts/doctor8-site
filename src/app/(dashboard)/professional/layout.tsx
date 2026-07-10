import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { resolveHealthProfessionalPortalBaseForUser } from "@/lib/nutritionist-portal";
import SpecialtyPortalRedirect from "./SpecialtyPortalRedirect";

export default async function ProfessionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (session?.user?.role === "PROFESSIONAL") {
    const portalBase = await resolveHealthProfessionalPortalBaseForUser(session.user.id);
    if (portalBase !== "/professional") {
      return (
        <Suspense>
          <SpecialtyPortalRedirect portalBase={portalBase} />
        </Suspense>
      );
    }
  }

  return children;
}
