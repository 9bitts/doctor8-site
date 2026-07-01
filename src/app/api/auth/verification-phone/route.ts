// POST /api/auth/verification-phone ? phone on file for unverified accounts (SMS pre-fill).

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAccountVerified } from "@/lib/account-verified";
import { formatInternationalPhoneDisplay } from "@/lib/international-phone";
import { userPhoneDigits } from "@/lib/user-phone";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ phone: null });
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        phone: true,
        emailVerified: true,
        phoneVerified: true,
        passwordHash: true,
      },
    });

    if (!user?.passwordHash || isAccountVerified(user) || !user.phone) {
      return NextResponse.json({ phone: null });
    }

    const digits = userPhoneDigits(user.phone);
    if (!digits) {
      return NextResponse.json({ phone: null });
    }

    return NextResponse.json({
      phone: formatInternationalPhoneDisplay(digits),
    });
  } catch (error) {
    console.error("[VERIFICATION PHONE]", error);
    return NextResponse.json({ phone: null });
  }
}
