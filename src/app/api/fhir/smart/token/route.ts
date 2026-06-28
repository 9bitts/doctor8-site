import { NextResponse } from "next/server";

/** SMART OAuth token endpoint ? third-party app launch planned; patient export uses session auth. */
export async function POST() {
  return NextResponse.json(
    {
      error: "unsupported_grant_type",
      error_description:
        "SMART OAuth for third-party apps is not enabled yet. Patients can export FHIR via /api/patient/history/fhir when logged in.",
    },
    { status: 501 },
  );
}
