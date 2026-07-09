// Laboratory (B2B lab) registration — User + Laboratory + Owner member

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { UserRole, ConsentType, LaboratoryType } from "@prisma/client";
import { sendEmailVerification } from "@/lib/email";
import { LABORATORY_LOGIN } from "@/lib/laboratory-portal";
import { geocodeAddress } from "@/lib/pharmacy-network/geocode";
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

const registerLaboratorySchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  cnpj: z.string().min(14).max(18),
  razaoSocial: z.string().min(2).max(200),
  nomeFantasia: z.string().min(2).max(120),
  labType: z.enum(["BLOOD", "IMAGING", "BOTH"]),
  responsibleFirstName: z.string().min(1).max(100),
  responsibleLastName: z.string().min(1).max(100),
  phoneDdi: z.string().min(1).max(4),
  phoneNational: z.string().min(6).max(20),
  addressZip: z.string().optional(),
  addressStreet: z.string().optional(),
  addressNumber: z.string().optional(),
  addressComplement: z.string().optional(),
  addressNeighborhood: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().max(2).optional(),
  language: z.string().optional(),
  acceptedTerms: z.literal(true),
  acceptedPrivacy: z.literal(true),
  acceptedGdpr: z.literal(true),
});

async function uniqueLaboratorySlug(base: string): Promise<string> {
  let slug = slugifyOrganizationName(base);
  let attempt = 0;
  while (true) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt}`;
    const existing = await db.laboratory.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    attempt++;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerLaboratorySchema.safeParse(body);
    if (!data.success) {
      return NextResponse.json({ error: data.error.flatten().fieldErrors }, { status: 400 });
    }

    const parsed = data.data;
    const ip = clientIp(req);
    const rate = await checkRateLimits([
      { namespace: "register-laboratory:email", key: parsed.email.toLowerCase(), ...RATE_LIMITS.authEmail },
      { namespace: "register-laboratory:ip", key: ip, ...RATE_LIMITS.authIp },
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
      db.laboratory.findUnique({ where: { cnpj: cnpjDigits } }),
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

    const slug = await uniqueLaboratorySlug(parsed.nomeFantasia);
    const addressZip = parsed.addressZip?.replace(/\D/g, "") || undefined;

    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: UserRole.LABORATORY,
          region: "BR",
          language: normalizedLanguage,
          phone: encryptUserPhone(phoneParsed.e164),
        },
      });

      const lab = await tx.laboratory.create({
        data: {
          cnpj: cnpjDigits,
          razaoSocial: parsed.razaoSocial,
          nomeFantasia: parsed.nomeFantasia,
          slug,
          labType: parsed.labType as LaboratoryType,
          contactEmail: email,
          contactPhone,
          responsibleFirstName: parsed.responsibleFirstName,
          responsibleLastName: parsed.responsibleLastName,
          addressZip,
          addressStreet: parsed.addressStreet,
          addressNumber: parsed.addressNumber,
          addressComplement: parsed.addressComplement,
          addressNeighborhood: parsed.addressNeighborhood,
          addressCity: parsed.addressCity,
          addressState: parsed.addressState,
          status: "PENDING_REVIEW",
        },
      });

      await tx.laboratoryMember.create({
        data: {
          laboratoryId: lab.id,
          userId: newUser.id,
          role: "OWNER",
          status: "ACTIVE",
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

    const createdLab = await db.laboratory.findFirst({
      where: { members: { some: { userId: user.id, role: "OWNER" } } },
    });
    if (createdLab) {
      const geo = await geocodeAddress({
        street: createdLab.addressStreet,
        number: createdLab.addressNumber,
        neighborhood: createdLab.addressNeighborhood,
        city: createdLab.addressCity,
        state: createdLab.addressState,
        zip: createdLab.addressZip,
      });
      if (geo) {
        await db.laboratory.update({
          where: { id: createdLab.id },
          data: { latitude: geo.latitude, longitude: geo.longitude },
        });
      }
    }

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
        from: LABORATORY_LOGIN,
        callbackUrl: "/laboratorios/painel",
      });
    } catch (emailError) {
      console.error("[LABORATORY REGISTER EMAIL ERROR]", emailError);
      emailSent = false;
    }

    return NextResponse.json({ success: true, userId: user.id, emailSent }, { status: 201 });
  } catch (error) {
    console.error("[LABORATORY REGISTER ERROR]", error);
    return NextResponse.json(
      { error: { general: ["Something went wrong. Please try again."] } },
      { status: 500 },
    );
  }
}
