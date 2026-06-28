import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import {
  createAuthorizationCode,
  getSmartClientId,
  isRedirectUriAllowed,
  isSmartClientIdAllowed,
} from "@/lib/fhir/smart-oauth";
import { z } from "zod";

const schema = z.object({
  redirect_uri: z.string().url(),
  client_id: z.string().optional(),
  state: z.string().optional(),
  scope: z.string().optional(),
  code_challenge: z.string(),
  code_challenge_method: z.literal("S256"),
  action: z.enum(["allow", "deny"]),
});

function denyRedirect(redirectUri: string, state?: string) {
  const url = new URL(redirectUri);
  url.searchParams.set("error", "access_denied");
  url.searchParams.set("error_description", "User denied authorization.");
  if (state) url.searchParams.set("state", state);
  return NextResponse.json({ redirectUrl: url.toString() });
}

/** Patient consent ? issue authorization code after explicit Allow. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const {
    redirect_uri: redirectUri,
    client_id: clientId = getSmartClientId(),
    state,
    scope = "patient/*.read",
    code_challenge: codeChallenge,
    action,
  } = parsed.data;

  if (!(await isRedirectUriAllowed(redirectUri, clientId))) {
    return NextResponse.json({ error: "redirect_uri not allowed" }, { status: 400 });
  }
  if (!(await isSmartClientIdAllowed(clientId))) {
    return NextResponse.json({ error: "invalid_client" }, { status: 400 });
  }

  if (action === "deny") {
    return denyRedirect(redirectUri, state);
  }

  const patient = await db.patientProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!patient) return NextResponse.json({ error: "Patient profile required" }, { status: 404 });

  const code = await createAuthorizationCode({
    clientId,
    userId: session.user.id,
    patientId: patient.id,
    redirectUri,
    scope,
    codeChallenge,
  });

  await audit.exportData(session.user.id);

  const callback = new URL(redirectUri);
  callback.searchParams.set("code", code);
  if (state) callback.searchParams.set("state", state);

  return NextResponse.json({ redirectUrl: callback.toString() });
}
