import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  accountNeedsProfileCompletion,
  isProfileExemptRole,
} from "@/lib/user-profile-complete";
import { fetchUserProfileSnapshot } from "@/lib/user-profile-db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ authenticated: false, needsCompletion: false });
  }

  const user = await fetchUserProfileSnapshot(session.user.id);
  if (!user) {
    return NextResponse.json({ authenticated: true, needsCompletion: false });
  }

  return NextResponse.json({
    authenticated: true,
    needsCompletion: accountNeedsProfileCompletion(user),
    role: user.role,
    email: session.user.email ?? null,
  });
}
