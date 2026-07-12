// Laboratory (B2B lab) registration — User + Laboratory + Owner member

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { UserRole, LaboratoryType } from "@prisma/client";
import { sendEmailVerification } from "@/lib/email";
import { LABORATORY_LOGIN } from "@/lib/laboratory-portal";
import { geocodeAddress } from "@/lib/pharmacy-network/geocode";
import { createRegisterConsents } from "@/lib/consent/register-consents";
import { isValidCnpj, stripCnpj, slugifyOrganizationName } from "@/lib/cnpj";
import { parseRegistrationPhone, registrationPhoneErrorMessage } from "@/lib/international-phone";
import { encryptUserPhone } from "@/lib/user-phone";
import { isAccountVerified } from "@/lib/account-verified";
import { registerAckResponse } from "@/lib/register-anti-enum";
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
  acceptedLgpd: z.literal(true),
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
          laboratoryMemberships: {
            where: { role: "OWNER" },
            take: 1,
            select: { laboratory: { select: { responsibleFirstName: true } } },
          },
        },
      }),
      db.laboratory.findUnique({ where: { cnpj: cnpjDigits } }),
    ]);

    if (existingEmail) {
      if (existingEmail.role === UserRole.LABORATORY && !isAccountVerified(existingEmail)) {
        const token = randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await db.verificationToken.deleteMany({ where: { identifier: email } });
        await db.verificationToken.create({ data: { identifier: email, token, expires } });

        const name =
          existingEmail.laboratoryMemberships[0]?.laboratory.responsibleFirstName
          || parsed.responsibleFirstName;

        let emailSent = true;
        try {
          await sendEmailVerification({
            email,
            name,
            token,
            language: normalizedLanguage || existingEmail.language || "pt",
            from: LABORATORY_LOGIN,
            callbackUrl: "/laboratorios/painel",
          });
        } catch (emailError) {
          console.error("[LABORATORY REGISTER EMAIL RESEND]", emailError);
          emailSent = false;
        }

        return registerAckResponse();
      }

      return registerAckResponse();
    }
    if (existingCnpj) {
      return NextResponse.json({ error: { cnpj: ["CNPJ já cadastrado"] } }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(parsed.password, 12);
    const userAgent = req.headers.get("user-agent") || "unknown";

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

      await createRegisterConsents(tx, newUser.id, ip, userAgent, {
        acceptedTerms: parsed.acceptedTerms,
        acceptedPrivacy: parsed.acceptedPrivacy,
        acceptedLgpd: parsed.acceptedLgpd,
      });

      return { newUser, lab };
    });

    void (async () => {
      try {
        const geo = await Promise.race([
          geocodeAddress({
            street: user.lab.addressStreet,
            number: user.lab.addressNumber,
            neighborhood: user.lab.addressNeighborhood,
            city: user.lab.addressCity,
            state: user.lab.addressState,
            zip: user.lab.addressZip,
          }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
        ]);
        if (geo) {
          await db.laboratory.update({
            where: { id: user.lab.id },
            data: { latitude: geo.latitude, longitude: geo.longitude },
          });
        }
      } catch (geoError) {
        console.error("[LABORATORY GEO ERROR]", geoError);
      }
    })();

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

    return NextResponse.json({ success: true, userId: user.newUser.id, emailSent }, { status: 201 });
  } catch (error) {
    console.error("[LABORATORY REGISTER ERROR]", error);
    return NextResponse.json(
      { error: { general: ["Something went wrong. Please try again."] } },
      { status: 500 },
    );
  }
}
