// src/app/api/auth/register/route.ts
// User registration endpoint
// GDPR: captures explicit consent before creating account
// HIPAA: enforces password strength

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { UserRole, UserRegion } from "@prisma/client";

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
  role: z.enum(["PATIENT", "PROFESSIONAL"]),
  region: z.enum(["US", "EU", "BR"]).default("US"),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),

  // GDPR/HIPAA: required consents
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Terms of Service" }),
  }),
  acceptedPrivacy: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Privacy Policy" }),
  }),
  acceptedHipaa: z.boolean().optional(),  // required for US users
  acceptedGdpr: z.boolean().optional(),   // required for EU users
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
      acceptedTerms,
      acceptedPrivacy,
      acceptedHipaa,
      acceptedGdpr,
    } = data.data;

    // HIPAA: US users must accept HIPAA authorization
    if (region === "US" && !acceptedHipaa) {
      return NextResponse.json(
        { error: { acceptedHipaa: ["HIPAA Authorization required for US users"] } },
        { status: 400 }
      );
    }

    // GDPR: EU users must accept GDPR consent
    if (region === "EU" && !acceptedGdpr) {
      return NextResponse.json(
        { error: { acceptedGdpr: ["GDPR consent required for EU users"] } },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: { email: ["Email already in use"] } },
        { status: 409 }
      );
    }

    // Hash password — bcrypt with cost factor 12 (HIPAA recommended)
    const passwordHash = await bcrypt.hash(password, 12);

    // Get IP for consent audit
    const ip = req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Create user + profile + consents in a transaction
    const user = await db.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          role: role as UserRole,
          region: region as UserRegion,
        },
      });

      // Create role-specific profile
      if (role === "PATIENT") {
        await tx.patientProfile.create({
          data: {
            userId: newUser.id,
            firstName,  // will be encrypted by service layer
            lastName,
          },
        });
      } else {
        await tx.professionalProfile.create({
          data: {
            userId: newUser.id,
            firstName,
            lastName,
            licenseNumber: "",  // filled in onboarding
            specialty: "",      // filled in onboarding
            consultPrice: 0,
          },
        });
      }

      // Record consents — GDPR/HIPAA compliance
   const consents: { type: string; granted: boolean; version: string }[] = [
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
