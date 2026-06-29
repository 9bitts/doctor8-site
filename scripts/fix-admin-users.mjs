#!/usr/bin/env node
/**
 * Inspect or promote Doctor8 admin users (run on Railway with DATABASE_URL set).
 *
 *   node scripts/fix-admin-users.mjs
 *   node scripts/fix-admin-users.mjs --promote
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ADMIN_EMAILS = [
  "crislhullier@gmail.com",
  "thamara.kalil@yahoo.com.br",
  "celesthina@terra.com.br",
];

const promote = process.argv.includes("--promote");

async function main() {
  for (const email of ADMIN_EMAILS) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        role: true,
        emailVerified: true,
        phoneVerified: true,
        lockedUntil: true,
        failedLoginAttempts: true,
        deletedAt: true,
        passwordHash: true,
      },
    });

    if (!user) {
      console.log(`\n? NOT FOUND: ${email}`);
      continue;
    }

    console.log(`\n--- ${user.email} ---`);
    console.log(`  role: ${user.role}`);
    console.log(`  emailVerified: ${user.emailVerified ? user.emailVerified.toISOString() : "NO"}`);
    console.log(`  phoneVerified: ${user.phoneVerified ? user.phoneVerified.toISOString() : "NO"}`);
    console.log(`  lockedUntil: ${user.lockedUntil ? user.lockedUntil.toISOString() : "no"}`);
    console.log(`  failedLoginAttempts: ${user.failedLoginAttempts}`);
    console.log(`  hasPassword: ${user.passwordHash ? "yes" : "no"}`);
    console.log(`  deletedAt: ${user.deletedAt ? user.deletedAt.toISOString() : "no"}`);

    if (promote) {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          role: "ADMIN",
          emailVerified: user.emailVerified ?? new Date(),
          lockedUntil: null,
          failedLoginAttempts: 0,
        },
      });
      console.log(`  ? promoted ? role=${updated.role}, emailVerified set`);
    } else if (user.role !== "ADMIN") {
      console.log("  ??  not ADMIN ? run with --promote to fix");
    } else if (!user.emailVerified) {
      console.log("  ??  ADMIN but email not verified ? run with --promote to fix");
    } else {
      console.log("  ? looks OK");
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
