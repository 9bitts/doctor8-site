// src/lib/auth.ts
// Authentication configuration using Auth.js (NextAuth v5)
// HIPAA: session timeout, login auditing, failed attempt tracking
// Supports: Credentials (email+password) + Google OAuth
// Google new users get the role they chose on the registration screen (signup_role cookie)

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// HIPAA: 15 minutes session timeout
const SESSION_MAX_AGE = parseInt(
  process.env.SESSION_MAX_AGE_SECONDS || "900"
);

// Reads the role the user picked on the registration screen, stored in a cookie
// before the Google redirect. Dynamic import keeps next/headers out of edge bundles.
async function readSignupRole(): Promise<"PATIENT" | "PROFESSIONAL" | "PSYCHOANALYST"> {
  try {
    const { cookies } = await import("next/headers");
    const value = cookies().get("signup_role")?.value;
    if (value === "PROFESSIONAL") return "PROFESSIONAL";
    if (value === "PSYCHOANALYST") return "PSYCHOANALYST";
    return "PATIENT";
  } catch {
    return "PATIENT";
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
        if (!user || user.deletedAt || user.role !== "PATIENT") return null;

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
        };
      },
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await db.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!user || !user.passwordHash) return null;
        if (user.deletedAt) return null;

        // Block login if email not verified
        if (!user.emailVerified) {
          throw new Error("EmailNotVerified");
        }

        // HIPAA: account lockout after failed attempts
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error("AccountLocked");
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          const attempts = user.failedLoginAttempts + 1;
          await db.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: attempts,
              lockedUntil: attempts >= 5
                ? new Date(Date.now() + 30 * 60 * 1000)
                : null,
            },
          });
          return null;
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
        };
      },
    }),
  ],
  callbacks: {
    // Handle Google sign-in: create/link user manually (no PrismaAdapter needed)
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          let dbUser = await db.user.findUnique({
            where: { email: user.email! },
          });

          if (!dbUser) {
            // New Google user — use the role chosen on the registration screen
            const signupRole = await readSignupRole();

            const nameParts = (user.name || "").split(" ");
            const firstName = nameParts[0] || "";
            const lastName = nameParts.slice(1).join(" ") || "";

            dbUser = await db.user.create({
              data: {
                email: user.email!,
                emailVerified: new Date(), // Google already verified the email
                role: signupRole,
                region: "US",
              },
            });

            if (signupRole === "PROFESSIONAL") {
              await db.professionalProfile.create({
                data: {
                  userId: dbUser.id,
                  firstName,
                  lastName,
                  avatarUrl: user.image || null,
                  licenseNumber: "",
                  specialty: "",
                  consultPrice: 0,
                },
              });
            } else if (signupRole === "PSYCHOANALYST") {
              await db.psychoanalystProfile.create({
                data: {
                  userId: dbUser.id,
                  firstName,
                  lastName,
                  avatarUrl: user.image || null,
                  trainingInstitution: "",
                  consultPrice: 0,
                },
              });
            } else {
              await db.patientProfile.create({
                data: {
                  userId: dbUser.id,
                  firstName,
                  lastName,
                  avatarUrl: user.image || null,
                },
              });
            }
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

    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
        token.region = (user as { region: string }).region;
      }

      // For Google sign-in, fetch role/region from DB
      if (account?.provider === "google" && token.email) {
        const dbUser = await db.user.findUnique({
          where: { email: token.email },
          select: { id: true, role: true, region: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.region = dbUser.region;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.region = token.region as string;
      }
      return session;
    },
  },
  events: {
    async signOut(message) {
      const token = "token" in message ? message.token : null;
      if (token?.id) {
        await audit.logout(token.id as string);
      }
    },
  },
});
