// src/lib/auth.ts
// Authentication configuration using Auth.js (NextAuth v5)
// HIPAA: session timeout, login auditing, failed attempt tracking
// Supports: Credentials (email+password) + Google OAuth

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

        // Reset failed attempts on success
        await db.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          },
        });

        // HIPAA audit log
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
            // New Google user — create account as PATIENT by default
            const nameParts = (user.name || "").split(" ");
            const firstName = nameParts[0] || "";
            const lastName = nameParts.slice(1).join(" ") || "";

            dbUser = await db.user.create({
              data: {
                email: user.email!,
                emailVerified: new Date(), // Google already verified the email
                role: "PATIENT",
                region: "US",
              },
            });

            await db.patientProfile.create({
              data: {
                userId: dbUser.id,
                firstName,
                lastName,
                avatarUrl: user.image || null,
              },
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

    async jwt({ token, user, account }) {
      // Set token data on first sign-in (Credentials)
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
        token.region = (user as { region: string }).region;
      }

      // For Google sign-in, fetch role/region from DB (first time only)
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
