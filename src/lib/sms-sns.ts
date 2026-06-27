// AWS SNS ? transactional SMS OTP (account verification, password reset).

import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { normalizeSmsPhone } from "@/lib/phone";

export type SmsErrorCode =
  | "SMS_UNAVAILABLE"
  | "INVALID_PHONE"
  | "SEND_FAILED"
  | "TRIAL_UNVERIFIED"
  | "GEO_BLOCKED"
  | "FRAUD_BLOCKED"
  | "RATE_LIMITED"
  | "SNS_SANDBOX";

let snsClient: SNSClient | null = null;

export function isAwsSnsConfigured(): boolean {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID?.trim() &&
      process.env.AWS_SECRET_ACCESS_KEY?.trim(),
  );
}

function getSnsRegion(): string {
  return (
    process.env.AWS_SNS_REGION?.trim() ||
    process.env.AWS_REGION_US?.trim() ||
    process.env.AWS_REGION?.trim() ||
    "us-east-1"
  );
}

function getSnsClient(): SNSClient {
  if (!snsClient) {
    snsClient = new SNSClient({
      region: getSnsRegion(),
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!.trim(),
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!.trim(),
      },
    });
  }
  return snsClient;
}

export function otpMessage(
  code: string,
  language?: string | null,
): string {
  const lang = language === "pt" || language === "es" ? language : "en";
  const messages: Record<string, string> = {
    pt: `Doctor8: seu codigo e ${code}. Valido por 10 minutos.`,
    en: `Doctor8: your code is ${code}. Valid for 10 minutes.`,
    es: `Doctor8: su codigo es ${code}. Valido por 10 minutos.`,
  };
  return messages[lang];
}

function mapSnsError(err: unknown): { error: SmsErrorCode; detail?: string } {
  const name = err && typeof err === "object" && "name" in err
    ? String((err as { name: string }).name)
    : "";
  const message = err && typeof err === "object" && "message" in err
    ? String((err as { message: string }).message)
    : "";
  const lower = message.toLowerCase();

  if (
    lower.includes("not authorized to publish") ||
    lower.includes("sandbox") ||
    lower.includes("not verified") ||
    name === "OptedOutException"
  ) {
    return { error: "SNS_SANDBOX", detail: message };
  }
  if (name === "ThrottlingException" || lower.includes("rate exceeded")) {
    return { error: "RATE_LIMITED", detail: message };
  }
  if (
    name === "InvalidParameterException" ||
    lower.includes("invalid") ||
    lower.includes("unable to parse")
  ) {
    return { error: "INVALID_PHONE", detail: message };
  }
  return { error: "SEND_FAILED", detail: message };
}

export async function sendSnsOtp(opts: {
  toPhone: string;
  code: string;
  language?: string | null;
}): Promise<{ ok: boolean; error?: SmsErrorCode; skipped?: boolean; detail?: string }> {
  if (!isAwsSnsConfigured()) {
    return { ok: false, skipped: true, error: "SMS_UNAVAILABLE" };
  }

  const to = normalizeSmsPhone(opts.toPhone);
  if (!to) return { ok: false, error: "INVALID_PHONE" };

  const message = otpMessage(opts.code, opts.language);
  const senderId = process.env.AWS_SNS_SENDER_ID?.trim();

  try {
    const command = new PublishCommand({
      PhoneNumber: `+${to}`,
      Message: message,
      MessageAttributes: senderId
        ? {
            "AWS.SNS.SMS.SenderID": {
              DataType: "String",
              StringValue: senderId.slice(0, 11),
            },
            "AWS.SNS.SMS.SMSType": {
              DataType: "String",
              StringValue: "Transactional",
            },
          }
        : {
            "AWS.SNS.SMS.SMSType": {
              DataType: "String",
              StringValue: "Transactional",
            },
          },
    });

    await getSnsClient().send(command);
    return { ok: true };
  } catch (err) {
    const mapped = mapSnsError(err);
    console.error("[AWS SNS] Send failed:", err);
    return { ok: false, ...mapped };
  }
}
