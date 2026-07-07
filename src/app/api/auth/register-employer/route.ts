// Employer (B2B NR-1) registration — creates User + EmployerCompany + Owner member

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { UserRole, ConsentType } from "@prisma/client";
import { sendEmailVerification } from "@/lib/email";
import { EMPLOYER_LOGIN } from "@/lib/auth-portals";
import { isValidCnpj, stripCnpj, slugifyOrganizationName } from "@/lib/cnpj";
import { parseRegistrationPhone, registrationPhoneErrorMessage } from "@/lib/international-phone";
import { encryptUserPhone } from "@/lib/user-phone";
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

const registerEmployerSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  cnpj: z.string().min(14).max(18),
  razaoSocial: z.string().min(2).max(200),
  nomeFantasia: z.string().min(2).max(120),
  responsibleFirstName: z.string().min(1).max(100),
  responsibleLastName: z.string().min(1).max(100),
  phoneDdi: z.string().min(1).max(4),
  phoneNational: z.string().min(6).max(20),
  employeeCount: z.number().int().min(1).max(500000).optional(),
  grauRisco: z.number().int().min(1).max(4).optional(),
  addressCity: z.string().optional(),
  addressState: z.string().max(2).optional(),
  language: z.string().optional(),
  acceptedTerms: z.literal(true),
  acceptedPrivacy: z.literal(true),
  acceptedGdpr: z.literal(true),
});

async function uniqueEmployerSlug(base: string): Promise<string> {
  let slug = slugifyOrganizationName(base);
  let attempt = 0;
  while (true) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt}`;
    const existing = await db.employerCompany.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    attempt++;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerEmployerSchema.safeParse(body);
    if (!data.success) {
      return NextResponse.json({ error: data.error.flatten().fieldErrors }, { status: 400 });
    }

    const parsed = data.data;
    const ip = clientIp(req);
    const rate = await checkRateLimits([
      { namespace: "register-employer:email", key: parsed.email.toLowerCase(), ...RATE_LIMITS.authEmail },
      { namespace: "register-employer:ip", key: ip, ...RATE_LIMITS.authIp },
    ]);
    if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec);

    const cnpjDigits = stripCnpj(parsed.cnpj);
    if (!isValidCnpj(cnpjDigits)) {
      return NextResponse.json({ error: { cnpj: ["CNPJ inválido"] } }, { status: 400 });
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

    const [existingEmail, existingCnpj] = await Promise.all([
      db.user.findUnique({ where: { email } }),
      db.employerCompany.findUnique({ where: { cnpj: cnpjDigits } }),
    ]);

    if (existingEmail) {
      return NextResponse.json({ success: true, existingAccount: true }, { status: 200 });
    }
    if (existingCnpj) {
      return NextResponse.json({ error: { cnpj: ["CNPJ já cadastrado"] } }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(parsed.password, 12);
    const userAgent = req.headers.get("user-agent") || "unknown";
    const normalizedLanguage =
      parsed.language === "pt" || parsed.language === "es" || parsed.language === "en"
        ? parsed.language
        : "pt";

    const slug = await uniqueEmployerSlug(parsed.nomeFantasia);

    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: UserRole.EMPLOYER,
          region: "BR",
          language: normalizedLanguage,
          phone: encryptUserPhone(phoneParsed.e164),
        },
      });

      const company = await tx.employerCompany.create({
        data: {
          cnpj: cnpjDigits,
          razaoSocial: parsed.razaoSocial,
          nomeFantasia: parsed.nomeFantasia,
          slug,
          contactEmail: email,
          contactPhone,
          responsibleFirstName: parsed.responsibleFirstName,
          responsibleLastName: parsed.responsibleLastName,
          addressCity: parsed.addressCity,
          addressState: parsed.addressState,
          employeeCount: parsed.employeeCount,
          grauRisco: parsed.grauRisco,
        },
      });

      await tx.employerMember.create({
        data: {
          employerCompanyId: company.id,
          userId: newUser.id,
          role: "OWNER",
          status: "ACTIVE",
        },
      });

      await tx.employerEapBenefit.create({
        data: {
          employerCompanyId: company.id,
          enabled: true,
          sessionsPerEmployee: 6,
        },
      });

      await tx.consent.createMany({
        data: [
          { userId: newUser.id, type: ConsentType.TERMS_OF_SERVICE, version: "1.0", granted: true, ipAddress: ip, userAgent },
          { userId: newUser.id, type: ConsentType.PRIVACY_POLICY, version: "1.0", granted: true, ipAddress: ip, userAgent },
          { userId: newUser.id, type: ConsentType.GDPR_CONSENT, version: "1.0", granted: true, ipAddress: ip, userAgent },
        ],
      });

      return newUser;
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
        from: EMPLOYER_LOGIN,
        callbackUrl: "/empresas/painel",
      });
    } catch (emailError) {
      console.error("[EMPLOYER REGISTER EMAIL ERROR]", emailError);
      emailSent = false;
    }

    return NextResponse.json({ success: true, userId: user.id, emailSent }, { status: 201 });
  } catch (error) {
    console.error("[EMPLOYER REGISTER ERROR]", error);
    return NextResponse.json(
      { error: { general: ["Something went wrong. Please try again."] } },
      { status: 500 },
    );
  }
}
