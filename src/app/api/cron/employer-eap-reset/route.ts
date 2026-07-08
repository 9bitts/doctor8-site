import { NextRequest, NextResponse } from "next/server";
import { resetAllEmployerEapQuotas } from "@/lib/employer-eap-quota";
import { logQStashJob } from "@/lib/integration-logs";

function authorized(req: NextRequest): boolean {
  const secret = req.headers.get("x-cron-secret");
  return Boolean(process.env.CRON_SECRET && secret === process.env.CRON_SECRET);
}

/** Reset annual EAP session quotas (1/jan or when quotaYear lags). */
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await resetAllEmployerEapQuotas();
    await logQStashJob({
      jobType: "employer_eap_quota_reset",
      status: "sent",
      detail: `companies=${result.companies} members=${result.members}`,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await logQStashJob({
      jobType: "employer_eap_quota_reset",
      status: "failed",
      detail: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
