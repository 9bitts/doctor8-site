#!/usr/bin/env node
/**
 * Inspect a provider user by email (run on Railway with DATABASE_URL set).
 *
 *   node scripts/inspect-provider-email.mjs diegoalbspassos@gmail.com
 *   node scripts/inspect-provider-email.mjs diegoalbspassos@gmail.com --set-psychologist
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const email = (process.argv[2] || "diegoalbspassos@gmail.com").trim().toLowerCase();
const setPsychologist = process.argv.includes("--set-psychologist");

function guessAdminTab(specialty, licenseNumber) {
  const s = (specialty || "").toLowerCase();
  const license = (licenseNumber || "").toLowerCase();
  if (/psicanal|psychoanal|psicoanal/.test(s)) return "psicanalistas";
  if (/crp/.test(license)) return "psicologos";
  if (/psicolog|psycholog|psychology|psychoter/.test(s)) return "psicologos";
  if (!s.trim()) return license.includes("crp") ? "psicologos" : "medicos (specialty empty)";
  if (/medic|clinic|general practice|crm/.test(s) || !s) return "medicos";
  return "outros or nutricionistas/fisioterapeutas ? check specialty value";
}

async function main() {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      professionalProfile: true,
      psychoanalystProfile: true,
      integrativeTherapistProfile: true,
      angelProfile: true,
    },
  });

  if (!user) {
    console.log(`\nNOT FOUND: ${email}`);
    console.log("No User row with this email.");
    return;
  }

  console.log(`\n--- User: ${user.email} ---`);
  console.log(`  id: ${user.id}`);
  console.log(`  role: ${user.role}`);
  console.log(`  emailVerified: ${user.emailVerified ? user.emailVerified.toISOString() : "NO"}`);
  console.log(`  deletedAt: ${user.deletedAt ? user.deletedAt.toISOString() : "no"}`);

  const pro = user.professionalProfile;
  if (pro) {
    console.log(`\n  ProfessionalProfile:`);
    console.log(`    id: ${pro.id}`);
    console.log(`    name: ${pro.firstName} ${pro.lastName}`);
    console.log(`    specialty: "${pro.specialty}"`);
    console.log(`    licenseNumber: "${pro.licenseNumber}"`);
    console.log(`    verified: ${pro.verified}`);
    console.log(`    verifiedAt: ${pro.verifiedAt ? pro.verifiedAt.toISOString() : "null"}`);
    console.log(`    admin tab (guess): ${guessAdminTab(pro.specialty, pro.licenseNumber)}`);

    if (setPsychologist) {
      const updated = await prisma.professionalProfile.update({
        where: { id: pro.id },
        data: { specialty: "Psychologist" },
      });
      console.log(`\n  >> Updated specialty to "${updated.specialty}"`);
      console.log(`    admin tab (guess): ${guessAdminTab(updated.specialty, updated.licenseNumber)}`);
    }
  } else {
    console.log(`\n  ProfessionalProfile: NONE`);
    console.log("  >> This email will NOT appear under Profissionais until a profile exists.");
  }

  if (user.psychoanalystProfile) {
    const p = user.psychoanalystProfile;
    console.log(`\n  PsychoanalystProfile: ${p.firstName} ${p.lastName}, verified=${p.verified}`);
  }
  if (user.integrativeTherapistProfile) {
    const p = user.integrativeTherapistProfile;
    console.log(`\n  IntegrativeTherapistProfile: ${p.firstName} ${p.lastName}, verified=${p.verified}`);
  }
  if (user.angelProfile) {
    const a = user.angelProfile;
    console.log(`\n  AngelProfile: ${a.firstName} ${a.lastName}, status=${a.approvalStatus}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
