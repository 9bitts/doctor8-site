import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getProviderRegistrationStatus,
  isProviderDashboardAlertRole,
} from "@/lib/provider-registration-complete";
import { getPatientRegistrationStatus } from "@/lib/patient-registration-complete";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role, id: userId } = session.user;

  if (role === "PATIENT") {
    const status = await getPatientRegistrationStatus(userId);
    if (!status) {
      return NextResponse.json({ applicable: true, complete: false, checklist: null, missing: [] });
    }
    return NextResponse.json({
      applicable: true,
      role,
      complete: status.complete,
      checklist: status.checklist,
      missing: status.missing,
    });
  }

  if (!isProviderDashboardAlertRole(role)) {
    return NextResponse.json({ applicable: false });
  }

  const status = await getProviderRegistrationStatus(userId, role);
  if (!status) {
    return NextResponse.json({
      applicable: true,
      role,
      complete: false,
      verified: false,
      checklist: {
        professionalData: false,
        verificationDocuments: false,
        careSettings: false,
      },
      missing: ["professionalData", "verificationDocuments", "careSettings"],
    });
  }

  return NextResponse.json({
    applicable: true,
    role,
    complete: status.complete,
    verified: status.verified,
    checklist: status.checklist,
    missing: status.missing,
  });
}
