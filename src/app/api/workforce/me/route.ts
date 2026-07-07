import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getWorkforceMembershipForUser,
  resolveWorkforceSessionQuota,
  workforceSessionsRemaining,
} from "@/lib/employer-workforce";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await getWorkforceMembershipForUser(session.user.id, session.user.email);
  if (!membership) {
    return NextResponse.json({ error: "No active benefit" }, { status: 404 });
  }

  const eap = await db.employerEapBenefit.findUnique({
    where: { employerCompanyId: membership.employerCompanyId },
  });

  const quota = resolveWorkforceSessionQuota(membership.sessionsQuota, eap?.sessionsPerEmployee ?? 6);
  const remaining = workforceSessionsRemaining(quota, membership.sessionsUsed);

  return NextResponse.json({
    companyName: membership.employerCompany.nomeFantasia,
    firstName: membership.firstName,
    sessionsQuota: quota,
    sessionsUsed: membership.sessionsUsed,
    sessionsRemaining: remaining,
    eapEnabled: eap?.enabled ?? false,
    bookUrl: "/patient/appointments?eap=1",
  });
}
