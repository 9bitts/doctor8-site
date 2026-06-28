import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/** Legacy URL — redirects to role-specific account page (password, email, region). */
export default async function SettingsRedirectPage() {
  const session = await auth();
  const role = session?.user?.role;

  switch (role) {
    case "PATIENT":
      redirect("/patient/account");
    case "PROFESSIONAL":
      redirect("/professional/account");
    case "PSYCHOANALYST":
      redirect("/psychoanalyst/settings");
    case "INTEGRATIVE_THERAPIST":
      redirect("/integrative-therapist/settings");
    case "ORGANIZATION":
      redirect("/organization/settings");
    case "ADMIN":
      redirect("/admin");
    default:
      redirect("/login");
  }
}
