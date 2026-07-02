// src/app/api/auth/register/route.ts
// User registration endpoint
// GDPR: captures explicit consent before creating account
// HIPAA: enforces password strength
// Sends email verification after successful registration
//
// ETAPA 3a: when a PATIENT registers, automatically link any provider charts
// (PatientRecord, AnalysandRecord, IntegrativeClientRecord) created with the same email.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { UserRole, ConsentType } from "@prisma/client";
import { REGISTRATION_REGION_CODES, requiresGdpr, requiresHipaa } from "@/lib/registration-regions";
import { sendEmailVerification } from "@/lib/email";
import { resolveLoginPathForRegistration } from "@/lib/auth-portals";
import { encrypt } from "@/lib/encryption";
import {
  attachLinkedDocumentsToPatientProfile,
  linkChartsToPatientOnSignup,
} from "@/lib/patient-chart-link";
import { parseRegistrationPhone, registrationPhoneErrorMessage } from "@/lib/international-phone";
import { saveRegistrationPhone } from "@/lib/save-registration-phone";
import { isAccountVerified } from "@/lib/account-verified";
import { userHasAnyProfile } from "@/lib/user-profile-complete";
import { PROFESSION_SIGNUP, isProfessionSignupSlug } from "@/lib/profession-signup";
import {
  canSkipHumanitarianEmailVerification,
  isHumanitarianContext,
} from "@/lib/humanitarian/feature-flags";
import {
  readHumOriginFlagFromCookieHeader,
  readHumReturnPathFromCookieHeader,
  resolveHumanitarianAuthCallback,
} from "@/lib/humanitarian/origin-cookie";

// HIPAA: strong password requirements
const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[A-Z]/, "At least one uppercase letter")
  .regex(/[0-9]/, "At least one number")
  .regex(/[^A-Za-z0-9]/, "At least one special character");

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  role: z.enum(["PATIENT", "PROFESSIONAL", "PSYCHOANALYST", "INTEGRATIVE_THERAPIST"]),
  region: z.enum(REGISTRATION_REGION_CODES as [typeof REGISTRATION_REGION_CODES[number], ...typeof REGISTRATION_REGION_CODES[number][]]).default("US"),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phoneDdi: z.string().min(1).max(4),
  phoneNational: z.string().min(6).max(20),
  // Optional language preference coming from the registration screen
  language: z.string().optional(),

  // GDPR/HIPAA: required consents
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Terms of Service" }),
  }),
  acceptedPrivacy: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Privacy Policy" }),
  }),
  acceptedHipaa: z.boolean().optional(),
  acceptedGdpr: z.boolean().optional(),
  professionalKind: z.enum(["psychologist"]).optional(),
  profession: z.enum([
    "medico",
    "psicologo",
    "fisioterapeuta",
    "nutricionista",
    "cuidados_paliativos",
  ] as const).optional(),
  callbackUrl: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerSchema.safeParse(body);

    if (!data.success) {
      return NextResponse.json(
        { error: data.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      email,
      password,
      role,
      region,
      firstName,
      lastName,
      phoneDdi,
      phoneNational,
      language,
      acceptedTerms,
      acceptedPrivacy,
      acceptedHipaa,
      acceptedGdpr,
      professionalKind,
      profession,
      callbackUrl,
    } = data.data;

    const originCookie = readHumOriginFlagFromCookieHeader(req.headers.get("cookie") ?? undefined);
    const returnPath = readHumReturnPathFromCookieHeader(req.headers.get("cookie") ?? undefined);
    const effectiveCallback = resolveHumanitarianAuthCallback(callbackUrl, {
      originCookie,
      returnPath,
    });

    const skipEmailVerification =
      role === "PATIENT"
      && canSkipHumanitarianEmailVerification(effectiveCallback, originCookie);

    if (requiresHipaa(region) && !acceptedHipaa) {
      return NextResponse.json(
        { error: { acceptedHipaa: ["HIPAA Authorization required for US users"] } },
        { status: 400 }
      );
    }

    if (requiresGdpr(region) && !acceptedGdpr) {
      return NextResponse.json(
        { error: { acceptedGdpr: ["GDPR consent required for EU users"] } },
        { status: 400 }
      );
    }

    const normalizedLanguage = language === "pt" || language === "es" || language === "en"
      ? language
      : undefined;

    const phoneParsed = parseRegistrationPhone({ phoneDdi, phoneNational });
    if ("error" in phoneParsed) {
      return NextResponse.json(
        {
          error: {
            phoneNational: [registrationPhoneErrorMessage(normalizedLanguage || language, phoneParsed.error)],
          },
        },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase();

    const existing = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        role: true,
        emailVerified: true,
        phoneVerified: true,
        language: true,
        patientProfile: { select: { firstName: true } },
        professionalProfile: { select: { firstName: true } },
        psychoanalystProfile: { select: { firstName: true } },
        integrativeTherapistProfile: { select: { firstName: true } },
      },
    });

    if (existing) {
      if (existing.role === role && !isAccountVerified(existing)) {
        if (skipEmailVerification) {
          await db.user.update({
            where: { id: existing.id },
            data: { emailVerified: new Date() },
          });
          return NextResponse.json(
            { success: true, userId: existing.id, emailVerificationSkipped: true },
            { status: 200 },
          );
        }

        const token = randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await db.verificationToken.deleteMany({ where: { identifier: normalizedEmail } });
        await db.verificationToken.create({
          data: { identifier: normalizedEmail, token, expires },
        });
        try {
          const resendName =
            existing.psychoanalystProfile?.firstName ||
            existing.integrativeTherapistProfile?.firstName ||
            existing.professionalProfile?.firstName ||
            existing.patientProfile?.firstName ||
            firstName;
          await sendEmailVerification({
            email: normalizedEmail,
            name: resendName,
            token,
            language: normalizedLanguage || existing.language || language,
            from: resolveLoginPathForRegistration(role, professionalKind),
          });
        } catch (emailError) {
          console.error("[REGISTER EMAIL RESEND]", emailError);
        }
        return NextResponse.json(
          { success: true, userId: existing.id, pendingVerification: true },
          { status: 200 },
        );
      }

      if (userHasAnyProfile(existing)) {
        return NextResponse.json(
          { error: { email: ["Email already in use"] } },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          code: "ACCOUNT_INCOMPLETE",
          error: { email: ["Email already in use"] },
        },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const ip = req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Create user + profile + consents in a transaction
    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          role: role as UserRole,
          region,
          ...(normalizedLanguage ? { language: normalizedLanguage } : {}),
          ...(skipEmailVerification ? { emailVerified: new Date() } : {}),
          // emailVerified is null — set after email confirmation (unless humanitarian skip)
        },
      });

      if (role === "PATIENT") {
        await tx.patientProfile.create({
          data: {
            userId: newUser.id,
            firstName: encrypt(firstName),
            lastName: encrypt(lastName),
          },
        });

        // ETAPA 3a: auto-link provider charts by email.
        await linkChartsToPatientOnSignup(tx, newUser.id, email);
      } else if (role === "PSYCHOANALYST") {
        await tx.psychoanalystProfile.create({
          data: {
            userId: newUser.id,
            firstName,
            lastName,
            trainingInstitution: "",
            consultPrice: 0,
          },
        });
      } else if (role === "INTEGRATIVE_THERAPIST") {
        await tx.integrativeTherapistProfile.create({
          data: {
            userId: newUser.id,
            firstName,
            lastName,
            trainingInstitution: "",
            consultPrice: 0,
          },
        });
      } else {
        let specialty = "";
        if (professionalKind === "psychologist") {
          specialty = "Psychologist";
        } else if (profession && isProfessionSignupSlug(profession)) {
          specialty = PROFESSION_SIGNUP[profession].specialty ?? "";
        }
        await tx.professionalProfile.create({
          data: {
            userId: newUser.id,
            firstName,
            lastName,
            licenseNumber: "",
            specialty,
            consultPrice: 0,
          },
        });
      }

      const consents: { type: ConsentType; granted: boolean; version: string }[] = [
        { type: "TERMS_OF_SERVICE", granted: acceptedTerms, version: "1.0" },
        { type: "PRIVACY_POLICY", granted: acceptedPrivacy, version: "1.0" },
      ];

      if (acceptedHipaa !== undefined) {
        consents.push({ type: "HIPAA_AUTHORIZATION", granted: acceptedHipaa, version: "1.0" });
      }
      if (acceptedGdpr !== undefined) {
        consents.push({ type: "GDPR_CONSENT", granted: acceptedGdpr, version: "1.0" });
      }

      await tx.consent.createMany({
        data: consents.map((c) => ({
          userId: newUser.id,
          type: c.type,
          version: c.version,
          granted: c.granted,
          ipAddress: ip,
          userAgent,
        })),
      });

      await saveRegistrationPhone(tx, newUser.id, role as UserRole, phoneParsed.e164);

      return newUser;
    });

    // ETAPA 3a: attach linked charts' documents to the patient profile.
    try {
      await attachLinkedDocumentsToPatientProfile(user.id);
    } catch (linkError) {
      console.error("[REGISTER LINK ERROR]", linkError);
    }

    // Generate verification token (24h expiry) — skipped for humanitarian patient signup
    if (!skipEmailVerification) {
      const token = randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await db.verificationToken.deleteMany({
        where: { identifier: email.toLowerCase() },
      });
      await db.verificationToken.create({
        data: {
          identifier: email.toLowerCase(),
          token,
          expires,
        },
      });

      try {
        await sendEmailVerification({
          email: email.toLowerCase(),
          name: firstName,
          token,
          language: normalizedLanguage || language,
          from: resolveLoginPathForRegistration(role, professionalKind),
        });
      } catch (emailError) {
        console.error("[EMAIL VERIFICATION SEND ERROR]", emailError);
        // User can request resend from verify-email page
      }
    } else if (isHumanitarianContext(effectiveCallback, originCookie)) {
      console.info("[REGISTER] Humanitarian patient signup — email verification skipped", {
        callbackUrl: effectiveCallback,
        originCookie,
      });
    }

    return NextResponse.json(
      {
        success: true,
        userId: user.id,
        ...(skipEmailVerification ? { emailVerificationSkipped: true } : {}),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[REGISTER ERROR]", error);
    return NextResponse.json(
      { error: { general: ["Something went wrong. Please try again."] } },
      { status: 500 }
    );
  }
}
