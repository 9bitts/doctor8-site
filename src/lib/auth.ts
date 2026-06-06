// src/lib/auth.ts
// Authentication configuration using Auth.js (NextAuth v5)
// HIPAA: session timeout, login auditing, failed attempt tracking

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
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
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
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

        // HIPAA: account lockout after failed attempts
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error("AccountLocked");
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);

        if (!isValid) {
          // Increment failed attempts — lock after 5
          const attempts = user.failedLoginAttempts + 1;
          await db.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: attempts,
              lockedUntil: attempts >= 5
                ? new Date(Date.now() + 30 * 60 * 1000) // 30 min lockout
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
        token.region = (user as { region: string }).region;
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
    async signOut({ token }) {
      if (token?.id) {
        await audit.logout(token.id as string);
      }
    },
  },
});
