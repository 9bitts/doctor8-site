import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSmartClientId, isSmartClientIdAllowed } from "@/lib/fhir/smart-oauth";
import { getSmartClientName } from "@/lib/fhir/smart-oauth-clients";

/** Resolve display name for a SMART client_id (consent screen). */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = req.nextUrl.searchParams.get("client_id")?.trim();
  if (!clientId) return NextResponse.json({ error: "client_id required" }, { status: 400 });

  if (!(await isSmartClientIdAllowed(clientId))) {
    return NextResponse.json({ error: "invalid_client" }, { status: 404 });
  }

  const name = (await getSmartClientName(clientId)) || clientId;
  const isDefault = clientId === getSmartClientId();

  return NextResponse.json({ clientId, name, isDefault });
}
