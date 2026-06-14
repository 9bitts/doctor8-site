// src/app/api/user/language/route.ts
// POST — save the user's language preference to User.language.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  language: z.enum(["pt", "en", "es"]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid language" }, { status: 400 });

  await db.user.update({
    where: { id: session.user.id },
    data: { language: parsed.data.language },
  });

  return NextResponse.json({ ok: true, language: parsed.data.language });
}
