// src/lib/auth.ts
// Authentication configuration using Auth.js (NextAuth v5)
// HIPAA: session timeout, login auditing, failed attempt tracking
// Supports: Credentials (email+password) + Google OAuth
// Google new users get the role from a signed httpOnly cookie set via POST /api/auth/oauth-intent

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { CredentialsSignin } from "@auth/core/errors";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { isAccountVerified } from "@/lib/account-verified";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { saveRegistrationPhone } from "@/lib/save-registration-phone";
import { resolveDeletedAccountOnLogin } from "@/lib/account-deletion";
import { createSignupProfile } from "@/lib/signup-profile-create";
import type { ParsedSignupIntent } from "@/lib/oauth-signup-intent";
import {
  resolveRegistrationRegion,
} from "@/lib/detect-registration-region";
import {
  computeProfileComplete,
  isProfileExemptRole,
} from "@/lib/user-profile-complete";
import { fetchUserProfileSnapshot } from "@/lib/user-profile-db";
import { canSkipHumanitarianEmailVerification } from "@/lib/humanitarian/feature-flags";
import { isVolunteerGuideProviderRole } from "@/lib/volunteer-attend-guide";
import {
  readServerHumAuthCookies,
  resolveHumanitarianAuthCallback,
} from "@/lib/humanitarian/origin-cookie";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  callbackUrl: z.string().optional(),
});

class EmailNotVerifiedError extends CredentialsSignin {
  code = "EmailNotVerified";
}

class AccountLockedError extends CredentialsSignin {
  code = "AccountLocked";
}

// HIPAA: 15 minutes session timeout
const SESSION_MAX_AGE = parseInt(
  process.env.SESSION_MAX_AGE_SECONDS || "900"
);

const TOKEN_VERSION_CHECK_MS = 60_000;

const isProduction = process.env.NODE_ENV === "production";

// Reads the signed OAuth signup intent cookie set before the Google redirect.
async function readSignupIntent(): Promise<ParsedSignupIntent | null> {
  try {
    const { cookies } = await import("next/headers");
    const { parseSignupRoleToken, OAUTH_SIGNUP_ROLE_COOKIE } = await import(
      "@/lib/oauth-signup-intent"
    );
    const token = cookies().get(OAUTH_SIGNUP_ROLE_COOKIE)?.value;
    return parseSignupRoleToken(token);
  } catch {
    return null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // Always show Google account picker (avoids silent login as wrong account).
          prompt: "select_account",
        },
      },
    }),
    Credentials({
      id: "magic-link",
      name: "magic-link",
      credentials: {
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        const token = credentials?.token;
        if (!token || typeof token !== "string") return null;

        const record = await db.verificationToken.findUnique({
          where: { token },
        });
        if (!record?.identifier.startsWith("magic:")) return null;
        if (record.expires < new Date()) {
          await db.verificationToken.delete({ where: { token } }).catch(() => {});
          return null;
        }

        const userId = record.identifier.slice("magic:".length);
        const user = await db.user.findUnique({ where: { id: userId } });
        if (!user || user.role !== "PATIENT") return null;

        const deletion = await resolveDeletedAccountOnLogin(user);
        if (deletion.blocked) return null;

        await db.verificationToken.delete({ where: { token } });

        if (!user.emailVerified) {
          await db.user.update({
            where: { id: user.id },
            data: { emailVerified: new Date() },
          });
        }

        await db.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          },
        });

        await audit.login(user.id);

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          region: user.region,
          tokenVersion: user.tokenVersion,
        };
      },
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        callbackUrl: { label: "Callback", type: "text" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password, callbackUrl } = parsed.data;
        const user = await db.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!user || !user.passwordHash) return null;

        let originCookie = false;
        let returnPath: string | null = null;
        try {
          const hum = await readServerHumAuthCookies();
          originCookie = hum.originCookie;
          returnPath = hum.returnPath;
        } catch {
          /* ignore */
        }

        const effectiveCallback = resolveHumanitarianAuthCallback(callbackUrl, {
          originCookie,
          returnPath,
        });

        const skipEmailVerification = canSkipHumanitarianEmailVerification(
          effectiveCallback,
          originCookie,
        );

        // Block login until email or SMS verification (humanitarian context may bypass)
        if (!isAccountVerified(user)) {
          if (!skipEmailVerification) {
            throw new EmailNotVerifiedError();
          }
          await db.user.update({
            where: { id: user.id },
            data: { emailVerified: new Date() },
          });
        }

        // HIPAA: account lockout after failed attempts
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new AccountLockedError();
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          const updated = await db.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: { increment: 1 } },
            select: { failedLoginAttempts: true },
          });
          if (updated.failedLoginAttempts >= 5) {
            await db.user.update({
              where: { id: user.id },
              data: { lockedUntil: new Date(Date.now() + 30 * 60 * 1000) },
            });
          }
          return null;
        }

        const deletion = await resolveDeletedAccountOnLogin(user);
        if (deletion.blocked) return null;

        await db.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          },
        });

        await audit.login(user.id);

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          region: user.region,
          tokenVersion: user.tokenVersion,
        };
      },
    }),
  ],
  cookies: {
    sessionToken: {
      name: isProduction ? "__Secure-authjs.session-token" : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
  },
  callbacks: {
    // Handle Google sign-in: create/link user manually (no PrismaAdapter needed)
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const googleEmail = user.email!.toLowerCase();
          let dbUser = await db.user.findUnique({
            where: { email: googleEmail },
          });

          if (dbUser) {
            const deletion = await resolveDeletedAccountOnLogin(dbUser);
            if (deletion.blocked) return false;
          }

          if (!dbUser) {
            const intent = await readSignupIntent();
            if (!intent) {
              return "/signup/role";
            }

            const {
              role: signupRole,
              professionalKind,
              profession,
              phoneE164,
              region: intentRegion,
            } = intent;
            const nameParts = (user.name || "").split(" ");
            const firstName = nameParts[0] || "";
            const lastName = nameParts.slice(1).join(" ") || "";
            const signupRegion = resolveRegistrationRegion({
              explicit: intentRegion,
              phoneE164,
            });

            dbUser = await db.$transaction(async (tx) => {
              const newUser = await tx.user.create({
                data: {
                  email: googleEmail,
                  emailVerified: new Date(),
                  role: signupRole,
                  region: signupRegion,
                },
              });

              await createSignupProfile(tx, {
                userId: newUser.id,
                role: signupRole,
                professionalKind,
                profession,
                firstName,
                lastName,
                avatarUrl: user.image || null,
              });

              if (phoneE164) {
                await saveRegistrationPhone(tx, newUser.id, signupRole, phoneE164);
              }

              return newUser;
            });
          } else if (!dbUser.emailVerified) {
            // Existing user who hadn't verified — Google now confirms their email
            await db.user.update({
              where: { id: dbUser.id },
              data: { emailVerified: new Date() },
            });
          }

          // Link Google account if not already linked
          const existingAccount = await db.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: "google",
                providerAccountId: account.providerAccountId,
              },
            },
          });

          if (!existingAccount) {
            await db.account.create({
              data: {
                userId: dbUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
              },
            });
          }

          return true;
        } catch (error) {
          console.error("[GOOGLE SIGNIN ERROR]", error);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
        token.region = (user as { region: string }).region;
        token.tokenVersion = (user as { tokenVersion?: number }).tokenVersion ?? 0;
        token.tvCheckedAt = Date.now();
        if (user.email) token.email = user.email;
      }

      // For Google sign-in, fetch role/region from DB
      if (account?.provider === "google" && token.email) {
        const dbUser = await db.user.findUnique({
          where: { email: String(token.email).toLowerCase() },
          select: { id: true, role: true, region: true, tokenVersion: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.region = dbUser.region;
          token.tokenVersion = dbUser.tokenVersion;
          token.tvCheckedAt = Date.now();
        }
      }

      const shouldRefreshProfileComplete =
        token.id &&
        (user ||
          account ||
          (trigger === "update" &&
            (session as { refreshProfileComplete?: boolean })?.refreshProfileComplete) ||
          token.profileComplete === undefined);

      if (shouldRefreshProfileComplete) {
        const role = String(token.role ?? "");
        if (isProfileExemptRole(role)) {
          token.profileComplete = true;
        } else {
          const snapshot = await fetchUserProfileSnapshot(token.id as string);
          token.profileComplete = snapshot ? computeProfileComplete(snapshot) : true;
        }
      }

      // Load specialty on sign-in or when legacy tokens lack it — not on every session poll.
      const shouldLoadSpecialty =
        token.role === "PROFESSIONAL" &&
        token.id &&
        (user || account || token.professionalSpecialty === undefined);

      if (shouldLoadSpecialty) {
        const profile = await db.professionalProfile.findUnique({
          where: { userId: token.id as string },
          select: { specialty: true },
        });
        token.professionalSpecialty = profile?.specialty ?? null;
      } else if (token.role !== "PROFESSIONAL") {
        token.professionalSpecialty = null;
      }

      // Refresh specialty after profile update (settings) without forcing re-login.
      if (
        trigger === "update" &&
        token.role === "PROFESSIONAL" &&
        token.id &&
        (session as { refreshSpecialty?: boolean })?.refreshSpecialty
      ) {
        const profile = await db.professionalProfile.findUnique({
          where: { userId: token.id as string },
          select: { specialty: true },
        });
        token.professionalSpecialty = profile?.specialty ?? null;
      }

      if (trigger === "update" && (session as { clearVolunteerGuide?: boolean })?.clearVolunteerGuide) {
        token.showVolunteerGuide = false;
      } else if ((user || account) && isVolunteerGuideProviderRole(String(token.role ?? ""))) {
        token.showVolunteerGuide = true;
      }

      // Extend session during active teleconsult (video room keepalive)
      if (trigger === "update" && (session as { consultActive?: boolean })?.consultActive) {
        const consultMaxAge = parseInt(
          process.env.SESSION_CONSULT_MAX_AGE_SECONDS || "7200",
          10,
        );
        token.exp = Math.floor(Date.now() / 1000) + consultMaxAge;
      }

      if (token.id) {
        const lastChecked = (token.tvCheckedAt as number | undefined) ?? 0;
        if (Date.now() - lastChecked > TOKEN_VERSION_CHECK_MS) {
          try {
            const dbUser = await db.user.findUnique({
              where: { id: token.id as string },
              select: { tokenVersion: true, lockedUntil: true },
            });
            if (!dbUser) return null;
            if (dbUser.lockedUntil && dbUser.lockedUntil > new Date()) return null;
            const tokenVersion = (token.tokenVersion as number | undefined) ?? 0;
            if (dbUser.tokenVersion > tokenVersion) return null;
            token.tvCheckedAt = Date.now();
          } catch {
            /* DB unavailable — keep session, retry on next window */
          }
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.region = token.region as string;
        session.user.professionalSpecialty =
          (token.professionalSpecialty as string | null | undefined) ?? null;
        session.user.showVolunteerGuide = token.showVolunteerGuide === true;
        (session.user as { profileComplete?: boolean }).profileComplete =
          token.profileComplete !== false;
      }
      return session;
    },
  },
  events: {
    async signOut(message) {
      const token = "token" in message ? message.token : null;
      if (token?.id) {
        const userId = token.id as string;
        await audit.logout(userId);
        const { closeJitSessionsForUser } = await import("@/lib/jit-session-lifecycle");
        await closeJitSessionsForUser(userId);
      }
    },
  },
});
