#!/usr/bin/env node
/**
 * Inspect a provider user by email (run on Railway with DATABASE_URL set).
 *
 *   node scripts/inspect-provider-email.mjs cbsolmucci@gmail.com
 *   node scripts/inspect-provider-email.mjs diegoalbspassos@gmail.com
 *   node scripts/inspect-provider-email.mjs diegoalbspassos@gmail.com --set-psychologist
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const email = (process.argv[2] || "diegoalbspassos@gmail.com").trim().toLowerCase();
const setPsychologist = process.argv.includes("--set-psychologist");

const PROFESSION_GROUPS = [
  { groupKey: "set.profGroup.medical", options: [
    "Acupuncture", "Allergy and Immunology", "Anesthesiology", "Angiology", "Cardiology", "Cardiovascular Surgery",
    "Hand Surgery", "Head and Neck Surgery", "Digestive System Surgery", "General Surgery", "Pediatric Surgery",
    "Plastic Surgery", "Thoracic Surgery", "Vascular Surgery", "Internal Medicine", "Coloproctology", "Dermatology",
    "Endocrinology and Metabolism", "Endoscopy", "Gastroenterology", "Medical Genetics", "Geriatrics",
    "Gynecology and Obstetrics", "Hematology and Hemotherapy", "Homeopathy", "Infectious Diseases", "Mastology",
    "Family and Community Medicine", "Physical Medicine and Rehabilitation", "Occupational Medicine", "Sports Medicine",
    "Emergency Medicine", "Legal Medicine and Forensics", "Nuclear Medicine", "Intensive Care Medicine",
    "Preventive and Social Medicine", "Nephrology", "Neurosurgery", "Neurology", "Nutrology", "Ophthalmology", "Oncology",
    "Orthopedics and Traumatology", "Otorhinolaryngology (ENT)", "Pathology", "Clinical Pathology / Laboratory Medicine",
    "Pediatrics", "Pneumology", "Psychiatry", "Radiology and Diagnostic Imaging", "Radiotherapy", "Rheumatology", "Urology",
    "Cannabis Medicine", "General Practice",
  ]},
  { groupKey: "set.profGroup.psychology", options: [
    "Psychologist", "Psychoanalyst", "Neuropsychologist", "Psychotherapist", "Behavioral Therapist",
  ]},
  { groupKey: "set.profGroup.nutrition", options: ["Nutritionist", "Dietitian", "Sports Nutritionist"] },
  { groupKey: "set.profGroup.rehab", options: [
    "Physiotherapist", "Occupational Therapist", "Speech Therapist (Speech-Language Pathologist)",
    "Osteopath", "Chiropractor",
  ]},
  { groupKey: "set.profGroup.nursing", options: ["Nurse", "Nurse Practitioner", "Midwife", "Obstetric Nurse"] },
  { groupKey: "set.profGroup.dentistry", options: [
    "Dentist (General)", "Orthodontist", "Endodontist", "Periodontist",
    "Oral and Maxillofacial Surgeon", "Pediatric Dentist",
  ]},
  { groupKey: "set.profGroup.other", options: [
    "Pharmacist", "Biomedical Scientist", "Physical Educator / Personal Trainer", "Social Worker (Health)",
    "Optometrist", "Podiatrist", "Acupuncturist (non-medical)", "Naturopath", "Veterinarian", "Other",
  ]},
];

const GROUP_TAB = {
  "set.profGroup.medical": "medicos",
  "set.profGroup.psychology": "psicologos",
  "set.profGroup.nutrition": "nutricionistas",
  "set.profGroup.rehab": "fisioterapeutas",
  "set.profGroup.nursing": "outros",
  "set.profGroup.dentistry": "medicos",
  "set.profGroup.other": "outros",
};

function normalize(s) {
  return (s || "").trim().toLowerCase();
}

function inferTabFromLicense(licenseNumber) {
  const lic = (licenseNumber || "").trim().toUpperCase();
  if (!lic) return null;
  if (/\bCRM\b|\bCRO\b|CRM[\s/-]|CRO[\s/-]/.test(lic)) return "medicos";
  if (/\bCRP\b|CRP[\s/-]/.test(lic)) return "psicologos";
  if (/\bCRN\b|CRN[\s/-]/.test(lic)) return "nutricionistas";
  if (/\bCREFITO\b|CREFITO[\s/-]/.test(lic)) return "fisioterapeutas";
  if (/\bCOREN\b|COREN[\s/-]/.test(lic)) return "outros";
  return null;
}

function tabFromCanonicalProfession(raw) {
  const canonical = raw.trim();
  if (!canonical) return null;
  if (canonical === "Psychoanalysis" || canonical === "Psychoanalyst") return "psicanalistas";
  if (canonical === "Acupuncturist (non-medical)" || canonical === "Naturopath") return "terapeutas";
  for (const group of PROFESSION_GROUPS) {
    if (!group.options.includes(canonical)) continue;
    return GROUP_TAB[group.groupKey] ?? "outros";
  }
  return null;
}

function resolveAdminTabFromProfessionText(specialty) {
  const raw = (specialty || "").trim();
  const s = normalize(specialty);
  if (!s) return "outros";

  const fromGroups = tabFromCanonicalProfession(raw);
  if (fromGroups) return fromGroups;

  if (s.includes("nutricion")) return "nutricionistas";
  if (s.includes("fisioterap")) return "fisioterapeutas";
  if (s.includes("psicanal")) return "psicanalistas";
  if (/psicolog|psycholog|psychology|psychoter/.test(s)) return "psicologos";
  if (s.includes("enferm") || s.includes("nurse")) return "outros";
  if (/medic|clinic|general practice|dentist|odontolog|cardiolog|dermatolog|hematolog/.test(s)) return "medicos";
  if (s.includes("acupunt") && !PROFESSION_GROUPS[0].options.includes(raw)) return "terapeutas";
  return "outros";
}

function resolveAdminTab(specialty, licenseNumber) {
  const s = normalize(specialty);
  if (!s) return inferTabFromLicense(licenseNumber) ?? "medicos";
  const fromSpecialty = resolveAdminTabFromProfessionText(specialty);
  if (fromSpecialty !== "outros") return fromSpecialty;
  return inferTabFromLicense(licenseNumber) ?? fromSpecialty;
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
    const tab = resolveAdminTab(pro.specialty, pro.licenseNumber);
    console.log(`\n  ProfessionalProfile:`);
    console.log(`    id: ${pro.id}`);
    console.log(`    name: ${pro.firstName} ${pro.lastName}`);
    console.log(`    specialty: "${pro.specialty}"`);
    console.log(`    licenseNumber: "${pro.licenseNumber}"`);
    console.log(`    verified: ${pro.verified}`);
    console.log(`    verifiedAt: ${pro.verifiedAt ? pro.verifiedAt.toISOString() : "null"}`);
    console.log(`    admin tab: ${tab}`);
    console.log(`    visible in admin: ${user.deletedAt ? "NO (user deleted)" : "YES"}`);

    if (tab !== "medicos" && inferTabFromLicense(pro.licenseNumber) === "medicos") {
      console.log(`    NOTE: CRM license but tab is "${tab}" ? specialty overrides license (expected after fix).`);
    }
    if (tab === "psicologos" && inferTabFromLicense(pro.licenseNumber) === "psicologos" && tabFromCanonicalProfession(pro.specialty) === "medicos") {
      console.log(`    NOTE: medical specialty with stale CRP license ? will show under M?dicos after deploy.`);
    }

    if (setPsychologist) {
      const updated = await prisma.professionalProfile.update({
        where: { id: pro.id },
        data: { specialty: "Psychologist" },
      });
      console.log(`\n  >> Updated specialty to "${updated.specialty}"`);
      console.log(`    admin tab: ${resolveAdminTab(updated.specialty, updated.licenseNumber)}`);
    }
  } else {
    console.log(`\n  ProfessionalProfile: NONE`);
    console.log("  >> This email will NOT appear under Profissionais until a profile exists.");
  }

  if (user.psychoanalystProfile) {
    const p = user.psychoanalystProfile;
    console.log(`\n  PsychoanalystProfile: ${p.firstName} ${p.lastName}, verified=${p.verified}`);
    console.log(`    admin tab: psicanalistas`);
  }
  if (user.integrativeTherapistProfile) {
    const p = user.integrativeTherapistProfile;
    console.log(`\n  IntegrativeTherapistProfile: ${p.firstName} ${p.lastName}, verified=${p.verified}`);
    console.log(`    admin tab: terapeutas`);
  }
  if (user.angelProfile) {
    const a = user.angelProfile;
    console.log(`\n  AngelProfile: ${a.firstName} ${a.lastName}, status=${a.approvalStatus}`);
    console.log(`    admin tab: anjos`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
