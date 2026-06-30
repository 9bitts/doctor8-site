import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProviderRegistrationStatus, isProviderDashboardAlertRole } from "@/lib/provider-registration-complete";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isProviderDashboardAlertRole(session.user.role)) {
    return NextResponse.json({ applicable: false });
  }

  const status = await getProviderRegistrationStatus(session.user.id, session.user.role);
  if (!status) {
    return NextResponse.json({ applicable: true, complete: false, verified: false });
  }

  return NextResponse.json({
    applicable: true,
    complete: status.complete,
    verified: status.verified,
  });
}
