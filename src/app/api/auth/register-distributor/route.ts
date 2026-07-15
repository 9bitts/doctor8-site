// US distributor (B2B supplier) registration — User + Distributor + Owner member

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { UserRole } from "@prisma/client";
import { sendEmailVerification } from "@/lib/email";
import { DISTRIBUTOR_LOGIN } from "@/lib/distributor-portal";
import { createRegisterConsents } from "@/lib/consent/register-consents";
import { slugifyOrganizationName } from "@/lib/cnpj";
import { isValidEin, stripEin } from "@/lib/us-ein";
import { parseRegistrationPhone, registrationPhoneErrorMessage } from "@/lib/international-phone";
import { encryptUserPhone } from "@/lib/user-phone";
import { handleExistingB2BRegistration } from "@/lib/b2b-admin";
import {
  checkRateLimits,
  clientIp,
  RATE_LIMITS,
  rateLimitResponse,
} from "@/lib/rate-limit";

const passwordSchema = z
  .string()
  .min(8)
  .regex(/[A-Z]/)
  .regex(/[0-9]/)
  .regex(/[^A-Za-z0-9]/);

const registerDistributorSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  ein: z.string().min(9).max(12),
  legalName: z.string().min(2).max(200),
  tradeName: z.string().min(2).max(120),
  brandAlias: z.string().max(80).optional(),
  responsibleFirstName: z.string().min(1).max(100),
  responsibleLastName: z.string().min(1).max(100),
  phoneDdi: z.string().min(1).max(4),
  phoneNational: z.string().min(6).max(20),
  addressStreet: z.string().max(200).optional(),
  addressNumber: z.string().max(40).optional(),
  addressComplement: z.string().max(120).optional(),
  addressCity: z.string().max(100).optional(),
  addressState: z.string().max(2).optional(),
  addressZip: z.string().max(20).optional(),
  language: z.string().optional(),
  acceptedTerms: z.literal(true),
  acceptedPrivacy: z.literal(true),
  acceptedLgpd: z.literal(true),
});

async function uniqueDistributorSlug(base: string): Promise<string> {
  let slug = slugifyOrganizationName(base);
  let attempt = 0;
  while (true) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt}`;
    const existing = await db.distributor.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    attempt++;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerDistributorSchema.safeParse(body);
    if (!data.success) {
      return NextResponse.json({ error: data.error.flatten().fieldErrors }, { status: 400 });
    }

    const parsed = data.data;
    const ip = clientIp(req);
    const rate = await checkRateLimits([
      { namespace: "register-distributor:email", key: parsed.email.toLowerCase(), ...RATE_LIMITS.authEmail },
      { namespace: "register-distributor:ip", key: ip, ...RATE_LIMITS.authIp },
    ]);
    if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec);

    const einDigits = stripEin(parsed.ein);
    if (!isValidEin(einDigits)) {
      return NextResponse.json({ error: { ein: ["Invalid EIN"] } }, { status: 400 });
    }

    const phoneParsed = parseRegistrationPhone({
      phoneDdi: parsed.phoneDdi,
      phoneNational: parsed.phoneNational,
    });
    if ("error" in phoneParsed) {
      return NextResponse.json(
        { error: { phoneNational: [registrationPhoneErrorMessage(parsed.language, phoneParsed.error)] } },
        { status: 400 },
      );
    }
    const contactPhone = `+${phoneParsed.e164}`;
    const email = parsed.email.toLowerCase();
    const normalizedLanguage =
      parsed.language === "pt" || parsed.language === "es" || parsed.language === "en"
        ? parsed.language
        : "en";

    const [existingEmail, existingEin] = await Promise.all([
      db.user.findUnique({
        where: { email },
        select: {
          id: true,
          role: true,
          emailVerified: true,
          phoneVerified: true,
          language: true,
        },
      }),
      db.distributor.findUnique({ where: { ein: einDigits } }),
    ]);

    const existingResult = await handleExistingB2BRegistration({
      existingUser: existingEmail,
      expectedRole: UserRole.DISTRIBUTOR,
      email,
      name: parsed.responsibleFirstName,
      language: normalizedLanguage,
      from: DISTRIBUTOR_LOGIN,
      callbackUrl: "/distribuidores/painel",
    });
    if (existingResult) {
      return NextResponse.json(existingResult, { status: 200 });
    }
    if (existingEin) {
      return NextResponse.json({ error: { ein: ["EIN already registered"] } }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(parsed.password, 12);
    const userAgent = req.headers.get("user-agent") || "unknown";
    const slug = await uniqueDistributorSlug(parsed.tradeName);
    const addressZip = parsed.addressZip?.replace(/\s+/g, "").toUpperCase() || undefined;
    const addressState =
      parsed.addressState && parsed.addressState.length === 2
        ? parsed.addressState
        : undefined;

    const created = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: UserRole.DISTRIBUTOR,
          region: "US",
          language: normalizedLanguage,
          timezone: "America/New_York",
          phone: encryptUserPhone(phoneParsed.e164),
        },
      });

      const distributor = await tx.distributor.create({
        data: {
          ein: einDigits,
          legalName: parsed.legalName.trim(),
          tradeName: parsed.tradeName.trim(),
          slug,
          brandAlias: parsed.brandAlias?.trim() || null,
          contactEmail: email,
          contactPhone,
          responsibleFirstName: parsed.responsibleFirstName.trim(),
          responsibleLastName: parsed.responsibleLastName.trim(),
          addressStreet: parsed.addressStreet?.trim() || null,
          addressNumber: parsed.addressNumber?.trim() || null,
          addressComplement: parsed.addressComplement?.trim() || null,
          addressCity: parsed.addressCity?.trim() || null,
          addressState,
          addressZip,
          addressCountry: "US",
          status: "PENDING_REVIEW",
          platformFeePercent: 15,
        },
      });

      await tx.distributorMember.create({
        data: {
          distributorId: distributor.id,
          userId: newUser.id,
          role: "OWNER",
          status: "ACTIVE",
        },
      });

      await createRegisterConsents(tx, newUser.id, ip, userAgent, {
        acceptedTerms: parsed.acceptedTerms,
        acceptedPrivacy: parsed.acceptedPrivacy,
        acceptedLgpd: parsed.acceptedLgpd,
      });

      return { newUser, distributor };
    });

    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.verificationToken.deleteMany({ where: { identifier: email } });
    await db.verificationToken.create({ data: { identifier: email, token, expires } });

    let emailSent = true;
    try {
      await sendEmailVerification({
        email,
        name: parsed.responsibleFirstName,
        token,
        language: normalizedLanguage,
        from: DISTRIBUTOR_LOGIN,
        callbackUrl: "/distribuidores/painel",
      });
    } catch (emailError) {
      console.error("[DISTRIBUTOR REGISTER EMAIL ERROR]", emailError);
      emailSent = false;
    }

    return NextResponse.json(
      { success: true, userId: created.newUser.id, emailSent },
      { status: 201 },
    );
  } catch (error) {
    console.error("[DISTRIBUTOR REGISTER ERROR]", error);
    return NextResponse.json(
      { error: { general: ["Something went wrong. Please try again."] } },
      { status: 500 },
    );
  }
}
