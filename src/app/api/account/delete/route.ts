import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { deletionScheduledDate } from "@/lib/account-deletion";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const now = new Date();

    await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: {
          deletedAt: now,
          deletionScheduledAt: deletionScheduledDate(now),
        },
      }),
      db.session.deleteMany({ where: { userId } }),
    ]);

    await audit.deletionRequest(userId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[ACCOUNT DELETE]", error);
    return NextResponse.json(
      { error: "Could not delete account. Please try again." },
      { status: 500 },
    );
  }
}
