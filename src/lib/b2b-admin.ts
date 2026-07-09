import { randomBytes } from "crypto";
import type { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { sendEmailVerification } from "@/lib/email";
import { isAccountVerified } from "@/lib/account-verified";

type ExistingB2BUser = {
  id: string;
  role: UserRole;
  emailVerified: Date | null;
  phoneVerified: Date | null;
  language: string | null;
};

export async function verifyB2BOwnerEmail(userId: string, email?: string | null) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true, phoneVerified: true },
  });
  if (!user || isAccountVerified(user)) return;

  await db.user.update({
    where: { id: userId },
    data: { emailVerified: new Date(), failedLoginAttempts: 0, lockedUntil: null },
  });

  if (email) {
    await db.verificationToken.deleteMany({ where: { identifier: email } });
  }
}

export async function resendB2BVerificationEmail(opts: {
  email: string;
  name: string;
  language: string;
  from: string;
  callbackUrl: string;
}): Promise<boolean> {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.verificationToken.deleteMany({ where: { identifier: opts.email } });
  await db.verificationToken.create({
    data: { identifier: opts.email, token, expires },
  });

  try {
    await sendEmailVerification({
      email: opts.email,
      name: opts.name,
      token,
      language: opts.language,
      from: opts.from,
      callbackUrl: opts.callbackUrl,
    });
    return true;
  } catch (error) {
    console.error("[B2B REGISTER EMAIL RESEND]", error);
    return false;
  }
}

export async function handleExistingB2BRegistration(opts: {
  existingUser: ExistingB2BUser | null;
  expectedRole: UserRole;
  email: string;
  name: string;
  language: string;
  from: string;
  callbackUrl: string;
}) {
  if (!opts.existingUser) return null;

  if (opts.existingUser.role === opts.expectedRole && !isAccountVerified(opts.existingUser)) {
    const emailSent = await resendB2BVerificationEmail({
      email: opts.email,
      name: opts.name,
      language: opts.language || opts.existingUser.language || "pt",
      from: opts.from,
      callbackUrl: opts.callbackUrl,
    });

    return {
      success: true as const,
      userId: opts.existingUser.id,
      pendingVerification: true as const,
      emailSent,
    };
  }

  return { success: true as const, existingAccount: true as const };
}

export function mapOwnerVerificationFields(owner?: {
  id: string;
  email: string;
  emailVerified: Date | null;
  phoneVerified: Date | null;
  lockedUntil: Date | null;
} | null, fallbackEmail?: string | null) {
  return {
    ownerUserId: owner?.id ?? null,
    ownerEmail: owner?.email ?? fallbackEmail ?? null,
    ownerEmailVerified: Boolean(owner?.emailVerified || owner?.phoneVerified),
    ownerLocked: Boolean(owner?.lockedUntil && owner.lockedUntil > new Date()),
  };
}
