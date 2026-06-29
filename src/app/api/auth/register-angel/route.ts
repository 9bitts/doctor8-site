import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { UserRole, ConsentType } from "@prisma/client";
import { REGISTRATION_REGION_CODES, requiresGdpr } from "@/lib/registration-regions";
import { sendEmailVerification } from "@/lib/email";
import { encrypt } from "@/lib/encryption";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";

const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[A-Z]/, "At least one uppercase letter")
  .regex(/[0-9]/, "At least one number")
  .regex(/[^A-Za-z0-9]/, "At least one special character");

const registerAngelSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  region: z.enum(REGISTRATION_REGION_CODES as [typeof REGISTRATION_REGION_CODES[number], ...typeof REGISTRATION_REGION_CODES[number][]]).default("BR"),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().min(8).max(30),
  languages: z.array(z.enum(["pt", "en", "es"])).min(1),
  motivation: z.string().max(2000).optional(),
  campaignSlug: z.string().optional(),
  language: z.string().optional(),
  acceptedTerms: z.literal(true),
  acceptedPrivacy: z.literal(true),
  acceptedGdpr: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerAngelSchema.safeParse(body);

    if (!data.success) {
      return NextResponse.json(
        { error: data.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const {
      email,
      password,
      region,
      firstName,
      lastName,
      phone,
      languages,
      motivation,
      campaignSlug,
      language,
      acceptedTerms,
      acceptedPrivacy,
      acceptedGdpr,
    } = data.data;

    if (requiresGdpr(region) && !acceptedGdpr) {
      return NextResponse.json(
        { error: { acceptedGdpr: ["GDPR consent required for EU users"] } },
        { status: 400 },
      );
    }

    const existing = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: { email: ["Email already in use"] } },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";
    const normalizedLanguage = language && ["pt", "en", "es"].includes(language) ? language : "pt";
    const preferredCampaignSlug = campaignSlug || VENEZUELA_CAMPAIGN_SLUG;

    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          role: UserRole.ANGEL,
          region,
          language: normalizedLanguage,
        },
      });

      await tx.angelProfile.create({
        data: {
          userId: newUser.id,
          firstName,
          lastName,
          phone: encrypt(phone),
          languages,
          motivation: motivation || null,
          preferredCampaignSlug,
          approvalStatus: "PENDING",
        },
      });

      const consents: { type: ConsentType; granted: boolean; version: string }[] = [
        { type: "TERMS_OF_SERVICE", granted: acceptedTerms, version: "1.0" },
        { type: "PRIVACY_POLICY", granted: acceptedPrivacy, version: "1.0" },
      ];
      if (acceptedGdpr) {
        consents.push({ type: "GDPR_CONSENT", granted: true, version: "1.0" });
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

    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.verificationToken.deleteMany({ where: { identifier: email.toLowerCase() } });
    await db.verificationToken.create({
      data: { identifier: email.toLowerCase(), token, expires },
    });

    try {
      await sendEmailVerification({
        email: email.toLowerCase(),
        name: firstName,
        token,
        language: normalizedLanguage,
      });
    } catch (emailError) {
      console.error("[ANGEL REGISTER EMAIL]", emailError);
    }

    return NextResponse.json({ success: true, userId: user.id }, { status: 201 });
  } catch (error) {
    console.error("[ANGEL REGISTER]", error);
    return NextResponse.json(
      { error: { general: ["Something went wrong. Please try again."] } },
      { status: 500 },
    );
  }
}
