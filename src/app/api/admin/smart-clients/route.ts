import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import {
  invalidateSmartClientCache,
  listSmartOAuthClients,
} from "@/lib/fhir/smart-oauth-clients";
import { db } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  clientId: z.string().min(3).max(64).regex(/^[a-zA-Z0-9._-]+$/),
  name: z.string().min(2).max(120),
  redirectUris: z.string().min(8),
});

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const clients = await listSmartOAuthClients();
  return NextResponse.json({ clients });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const uris = parsed.data.redirectUris
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const uri of uris) {
    try {
      new URL(uri);
    } catch {
      return NextResponse.json({ error: `Invalid redirect URI: ${uri}` }, { status: 400 });
    }
  }

  const client = await db.smartOAuthClient.create({
    data: {
      clientId: parsed.data.clientId,
      name: parsed.data.name,
      redirectUris: uris.join(","),
    },
  });

  invalidateSmartClientCache();
  return NextResponse.json({ client }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.smartOAuthClient.delete({ where: { id } }).catch(() => null);
  invalidateSmartClientCache();
  return NextResponse.json({ ok: true });
}
