// src/app/api/auth/register/route.ts
// User registration endpoint
// GDPR: captures explicit consent before creating account
// HIPAA: enforces password strength
// Sends email verification after successful registration
//
// ETAPA 3a: when a PATIENT registers, automatically link any patient charts
// (PatientRecord) that a doctor previously created with the same email — so the
// prescriptions/documents are already attached to the new account.
// (Access is still protected by email verification: the user can't log in until
//  they verify their email, even though the link is established at signup.)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { UserRole, UserRegion, ConsentType } from "@prisma/client";
import { sendEmailVerification } from "@/lib/email";
import { encrypt } from "@/lib/encryption";

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
  region: z.enum(["US", "EU", "BR", "VE"]).default("US"),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
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
      language,
      acceptedTerms,
      acceptedPrivacy,
      acceptedHipaa,
      acceptedGdpr,
    } = data.data;

    if (region === "US" && !acceptedHipaa) {
      return NextResponse.json(
        { error: { acceptedHipaa: ["HIPAA Authorization required for US users"] } },
        { status: 400 }
      );
    }

    if (region === "EU" && !acceptedGdpr) {
      return NextResponse.json(
        { error: { acceptedGdpr: ["GDPR consent required for EU users"] } },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: { email: ["Email already in use"] } },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const ip = req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    const normalizedLanguage = language === "pt" || language === "es" || language === "en"
      ? language
      : undefined;

    // Create user + profile + consents in a transaction
    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          role: role as UserRole,
          region: region as UserRegion,
          ...(normalizedLanguage ? { language: normalizedLanguage } : {}),
          // emailVerified is null — set after email confirmation
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

        // ETAPA 3a: auto-link any patient charts created by a doctor with this email.
        // This makes prescriptions/documents already attached to the new account.
        await tx.patientRecord.updateMany({
          where: {
            email: email.toLowerCase(),
            linkedUserId: null,
          },
          data: { linkedUserId: newUser.id },
        });
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
        await tx.professionalProfile.create({
          data: {
            userId: newUser.id,
            firstName,
            lastName,
            licenseNumber: "",
            specialty: "",
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

      return newUser;
    });

    // ETAPA 3a: after the account exists, attach the linked charts' documents
    // (e.g. prescriptions) to the patient's profile so they show up in the app.
    // Done outside the transaction; failures here must not break registration.
    try {
      const patientProfile = await db.patientProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (patientProfile) {
        const linkedRecords = await db.patientRecord.findMany({
          where: { linkedUserId: user.id },
          select: { id: true },
        });
        const recordIds = linkedRecords.map((r) => r.id);
        if (recordIds.length > 0) {
          // Attach any documents of those charts that don't yet have a patientId.
          await db.medicalDocument.updateMany({
            where: {
              patientRecordId: { in: recordIds },
              patientId: null,
            },
            data: { patientId: patientProfile.id },
          });
        }
      }
    } catch (linkError) {
      console.error("[REGISTER LINK ERROR]", linkError);
    }

    // Generate verification token (24h expiry)
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Remove any previous tokens for this email, then create new one
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

    // Send verification email — non-blocking, don't fail registration if email fails
    try {
      await sendEmailVerification({
        email: email.toLowerCase(),
        name: firstName,
        token,
        language: normalizedLanguage || language,
      });
    } catch (emailError) {
      console.error("[EMAIL VERIFICATION SEND ERROR]", emailError);
      // User can request resend from verify-email page
    }

    return NextResponse.json(
      { success: true, userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("[REGISTER ERROR]", error);
    return NextResponse.json(
      { error: { general: ["Something went wrong. Please try again."] } },
      { status: 500 }
    );
  }
}
