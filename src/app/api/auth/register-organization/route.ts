// Organization (CNPJ) registration ? creates User + Organization + Owner member

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { UserRole } from "@prisma/client";
import { sendEmailVerification } from "@/lib/email";
import { ORGANIZATION_LOGIN } from "@/lib/auth-portals";
import { isValidCnpj, stripCnpj, slugifyOrganizationName } from "@/lib/cnpj";
import { createRegisterConsents } from "@/lib/consent/register-consents";
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

const registerOrgSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  cnpj: z.string().min(14).max(18),
  razaoSocial: z.string().min(2).max(200),
  nomeFantasia: z.string().min(2).max(120),
  responsibleFirstName: z.string().min(1).max(100),
  responsibleLastName: z.string().min(1).max(100),
  phoneDdi: z.string().min(1).max(4),
  phoneNational: z.string().min(6).max(20),
  addressStreet: z.string().optional(),
  addressNumber: z.string().optional(),
  addressComplement: z.string().optional(),
  addressNeighborhood: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().max(2).optional(),
  addressZip: z.string().optional(),
  language: z.string().optional(),
  acceptedTerms: z.literal(true),
  acceptedPrivacy: z.literal(true),
  acceptedGdpr: z.literal(true),
});

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugifyOrganizationName(base);
  let attempt = 0;
  while (true) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt}`;
    const existing = await db.organization.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    attempt++;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerOrgSchema.safeParse(body);
    if (!data.success) {
      return NextResponse.json({ error: data.error.flatten().fieldErrors }, { status: 400 });
    }

    const parsed = data.data;

    const ip = clientIp(req);
    const rate = await checkRateLimits([
      { namespace: "register-org:email", key: parsed.email.toLowerCase(), ...RATE_LIMITS.authEmail },
      { namespace: "register-org:ip", key: ip, ...RATE_LIMITS.authIp },
    ]);
    if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec);

    const cnpjDigits = stripCnpj(parsed.cnpj);
    if (!isValidCnpj(cnpjDigits)) {
      return NextResponse.json(
        { error: { cnpj: ["CNPJ inválido"] } },
        { status: 400 },
      );
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
        : "pt";

    const [existingEmail, existingCnpj] = await Promise.all([
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
      db.organization.findUnique({ where: { cnpj: cnpjDigits } }),
    ]);

    const existingResult = await handleExistingB2BRegistration({
      existingUser: existingEmail,
      expectedRole: UserRole.ORGANIZATION,
      email,
      name: parsed.responsibleFirstName,
      language: normalizedLanguage,
      from: ORGANIZATION_LOGIN,
      callbackUrl: "/organization",
    });
    if (existingResult) {
      if ("existingAccount" in existingResult && existingResult.existingAccount) {
        console.info("[ORG REGISTER] Duplicate email signup attempt", { email });
      }
      return NextResponse.json(existingResult, { status: 200 });
    }
    if (existingCnpj) {
      // 409 intencional: CNPJ é dado público; enumeração aceitável para evitar cadastros duplicados.
      return NextResponse.json(
        { error: { cnpj: ["CNPJ já cadastrado"] } },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(parsed.password, 12);
    const userAgent = req.headers.get("user-agent") || "unknown";

    const slug = await uniqueSlug(parsed.nomeFantasia);

    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: UserRole.ORGANIZATION,
          region: "BR",
          language: normalizedLanguage,
          phone: encryptUserPhone(phoneParsed.e164),
        },
      });

      const org = await tx.organization.create({
        data: {
          cnpj: cnpjDigits,
          razaoSocial: parsed.razaoSocial,
          nomeFantasia: parsed.nomeFantasia,
          slug,
          contactEmail: email,
          contactPhone,
          responsibleFirstName: parsed.responsibleFirstName,
          responsibleLastName: parsed.responsibleLastName,
          addressStreet: parsed.addressStreet,
          addressNumber: parsed.addressNumber,
          addressComplement: parsed.addressComplement,
          addressNeighborhood: parsed.addressNeighborhood,
          addressCity: parsed.addressCity,
          addressState: parsed.addressState,
          addressZip: parsed.addressZip?.replace(/\D/g, ""),
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: newUser.id,
          role: "OWNER",
          status: "ACTIVE",
        },
      });

      await createRegisterConsents(tx, newUser.id, ip, userAgent, {
        acceptedTerms: parsed.acceptedTerms,
        acceptedPrivacy: parsed.acceptedPrivacy,
        acceptedLgpd: true,
        acceptedGdpr: parsed.acceptedGdpr,
      });

      return newUser;
    });

    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.verificationToken.deleteMany({ where: { identifier: email } });
    await db.verificationToken.create({
      data: { identifier: email, token, expires },
    });

    let emailSent = true;
    try {
      await sendEmailVerification({
        email,
        name: parsed.responsibleFirstName,
        token,
        language: normalizedLanguage,
        from: ORGANIZATION_LOGIN,
        callbackUrl: "/organization",
      });
    } catch (emailError) {
      console.error("[ORG REGISTER EMAIL ERROR]", emailError);
      emailSent = false;
    }

    return NextResponse.json({ success: true, userId: user.id, emailSent }, { status: 201 });
  } catch (error) {
    console.error("[ORG REGISTER ERROR]", error);
    return NextResponse.json(
      { error: { general: ["Something went wrong. Please try again."] } },
      { status: 500 },
    );
  }
}
