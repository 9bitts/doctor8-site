import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { updateSignupStatusAdmin } from "@/lib/humanitarian/angel-missions";

const patchSchema = z.object({
  signupId: z.string(),
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "DECLINED",
    "CANCELLED",
    "ATTENDED",
    "NO_SHOW",
    "COMPLETED",
  ]),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await updateSignupStatusAdmin({
    signupId: parsed.data.signupId,
    status: parsed.data.status,
    decidedById: session.user.id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
