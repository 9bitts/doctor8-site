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
import { createRegisterConsents, createOAuthSignupConsents } from "@/lib/consent/register-consents";
import { UserRole } from "@prisma/client";
import { REGISTRATION_REGION_CODES, requiresGdpr, requiresHipaa, requiresLgpd } from "@/lib/registration-regions";
import { sendEmailVerification } from "@/lib/email";
import { resolveLoginPathForRegistration } from "@/lib/auth-portals";
import { registerAckResponse } from "@/lib/register-anti-enum";
import { encrypt } from "@/lib/encryption";
import {
  attachLinkedDocumentsToPatientProfile,
  linkChartsToPatientOnSignup,
} from "@/lib/patient-chart-link";
import { parseRegistrationPhone, registrationPhoneErrorMessage } from "@/lib/international-phone";
import { saveRegistrationPhone } from "@/lib/save-registration-phone";
import { isAccountVerified } from "@/lib/account-verified";
import { userHasAnyProfile } from "@/lib/user-profile-complete";
import { createSignupProfile } from "@/lib/signup-profile-create";
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
import {
  checkRateLimits,
  clientIp,
  RATE_LIMITS,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { resolveRegistrationRegionForSignup } from "@/lib/detect-registration-region";

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
  acceptedLgpd: z.boolean().optional(),
  professionalKind: z.enum(["psychologist"]).optional(),
  profession: z.enum([
    "medico",
    "psicologo",
    "fisioterapeuta",
    "nutricionista",
    "enfermeiro",
    "farmaceutico",
    "dentista",
    "cuidados_paliativos",
  ] as const).optional(),
  callbackUrl: z.string().optional(),
});

type RegisterProfileInput = {
  userId: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  email: string;
  professionalKind?: "psychologist";
  profession?: "medico" | "psicologo" | "fisioterapeuta" | "nutricionista" | "enfermeiro" | "farmaceutico" | "dentista" | "cuidados_paliativos";
};

async function createRegisterProfile(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  input: RegisterProfileInput,
): Promise<void> {
  const { userId, role, firstName, lastName, email, professionalKind, profession } = input;

  if (role === "PATIENT") {
    await tx.patientProfile.create({
      data: {
        userId,
        firstName: encrypt(firstName),
        lastName: encrypt(lastName),
      },
    });
    await linkChartsToPatientOnSignup(tx, userId, email);
    return;
  }

  if (role === "PROFESSIONAL" && profession && isProfessionSignupSlug(profession)) {
    const specialty = PROFESSION_SIGNUP[profession].specialty ?? "";
    await tx.professionalProfile.create({
      data: {
        userId,
        firstName,
        lastName,
        licenseNumber: "",
        specialty,
        consultPrice: 0,
      },
    });
    return;
  }

  await createSignupProfile(tx, {
    userId,
    role: role as import("@/lib/oauth-signup-intent").SignupRole,
    professionalKind: professionalKind ?? null,
    firstName,
    lastName,
  });
}

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

    const ip = clientIp(req);
    const rate = await checkRateLimits([
      { namespace: "register:email", key: data.data.email.toLowerCase(), ...RATE_LIMITS.authEmail },
      { namespace: "register:ip", key: ip, ...RATE_LIMITS.authIp },
    ]);
    if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec);

    const {
      email,
      password,
      role,
      region: submittedRegion,
      firstName,
      lastName,
      phoneDdi,
      phoneNational,
      language,
      acceptedTerms,
      acceptedPrivacy,
      acceptedHipaa,
      acceptedGdpr,
      acceptedLgpd,
      professionalKind,
      profession,
      callbackUrl,
    } = data.data;

    const normalizedLanguage = language === "pt" || language === "es" || language === "en"
      ? language
      : undefined;

    const region = resolveRegistrationRegionForSignup({
      explicit: submittedRegion,
      phoneDdi,
      language: normalizedLanguage || language,
      headers: req.headers,
    });

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

    if (requiresLgpd(region) && !acceptedLgpd) {
      return NextResponse.json(
        { error: { acceptedLgpd: ["LGPD consent required for Brazil users"] } },
        { status: 400 }
      );
    }

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
          return registerAckResponse();
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
            callbackUrl: effectiveCallback ?? undefined,
          });
        } catch (emailError) {
          console.error("[REGISTER EMAIL RESEND]", emailError);
        }
        return registerAckResponse();
      }

      if (userHasAnyProfile(existing)) {
        console.info("[REGISTER] Duplicate email signup attempt", { email: normalizedEmail });
        return registerAckResponse();
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const userAgent = req.headers.get("user-agent") || "unknown";
      const alreadyVerified = isAccountVerified(existing);

      await db.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: existing.id },
          data: {
            passwordHash,
            role: role as UserRole,
            region,
            ...(normalizedLanguage ? { language: normalizedLanguage } : {}),
            ...(skipEmailVerification && !alreadyVerified ? { emailVerified: new Date() } : {}),
          },
        });

        await createRegisterProfile(tx, {
          userId: existing.id,
          role: role as UserRole,
          firstName,
          lastName,
          email: normalizedEmail,
          professionalKind,
          profession,
        });

        await createRegisterConsents(tx, existing.id, ip, userAgent, {
          acceptedTerms,
          acceptedPrivacy,
          acceptedHipaa,
          acceptedGdpr,
          acceptedLgpd,
          acceptedProfessionalTerms: role === "PROFESSIONAL",
        });

        await saveRegistrationPhone(tx, existing.id, role as UserRole, phoneParsed.e164);
      });

      if (role === "PATIENT") {
        try {
          await attachLinkedDocumentsToPatientProfile(existing.id);
        } catch (linkError) {
          console.error("[REGISTER RESUME LINK ERROR]", linkError);
        }
      }

      const skipVerificationAfterResume =
        skipEmailVerification || alreadyVerified;

      let emailSent = true;
      if (!skipVerificationAfterResume) {
        const token = randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await db.verificationToken.deleteMany({ where: { identifier: normalizedEmail } });
        await db.verificationToken.create({
          data: { identifier: normalizedEmail, token, expires },
        });
        try {
          await sendEmailVerification({
            email: normalizedEmail,
            name: firstName,
            token,
            language: normalizedLanguage || existing.language || language,
            from: resolveLoginPathForRegistration(role, professionalKind),
            callbackUrl: effectiveCallback ?? undefined,
          });
        } catch (emailError) {
          console.error("[REGISTER RESUME EMAIL]", emailError);
          emailSent = false;
        }
      }

      console.info("[REGISTER] Resumed incomplete signup", {
        userId: existing.id,
        email: normalizedEmail,
        role,
        alreadyVerified,
      });

      return NextResponse.json(
        {
          success: true,
          userId: existing.id,
          resumed: true,
          ...(skipVerificationAfterResume ? { emailVerificationSkipped: true } : { emailSent }),
        },
        { status: 200 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

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

      await createRegisterProfile(tx, {
        userId: newUser.id,
        role: role as UserRole,
        firstName,
        lastName,
        email: email.toLowerCase(),
        professionalKind,
        profession,
      });

      await createRegisterConsents(tx, newUser.id, ip, userAgent, {
        acceptedTerms,
        acceptedPrivacy,
        acceptedHipaa,
        acceptedGdpr,
        acceptedLgpd,
        acceptedProfessionalTerms: role === "PROFESSIONAL",
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

      let emailSent = true;
      try {
        await sendEmailVerification({
          email: email.toLowerCase(),
          name: firstName,
          token,
          language: normalizedLanguage || language,
          from: resolveLoginPathForRegistration(role, professionalKind),
          callbackUrl: effectiveCallback ?? undefined,
        });
      } catch (emailError) {
        console.error("[EMAIL VERIFICATION SEND ERROR]", emailError);
        emailSent = false;
      }

      return NextResponse.json(
        {
          success: true,
          userId: user.id,
          emailSent,
        },
        { status: 201 },
      );
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
