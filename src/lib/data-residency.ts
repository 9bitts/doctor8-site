import { parseBillingRegion, type BillingRegion } from "@/lib/billing-regions";

export type DataResidencyInfo = {
  accountRegion: BillingRegion;
  deployRegion: string;
  storageRegion: string;
  storageProvider: string;
};

function deployRegion(): string {
  return process.env.APP_REGION === "EU" ? "EU" : "US";
}

function storageForAccountRegion(region: BillingRegion): string {
  const billing = parseBillingRegion(region, "US");
  if (billing === "BR" || billing === "VE") {
    return process.env.AWS_REGION_US || "us-east-1";
  }
  if (billing === "EU") {
    return process.env.AWS_REGION_EU || "eu-central-1";
  }
  return process.env.AWS_REGION_US || "us-east-1";
}

export function getDataResidencyInfo(accountRegion: string): DataResidencyInfo {
  const billing = parseBillingRegion(accountRegion, "US");
  return {
    accountRegion: billing,
    deployRegion: deployRegion(),
    storageRegion: storageForAccountRegion(billing),
    storageProvider: "AWS S3",
  };
}

export function isDailyCloudRecordingEnabled(): boolean {
  return process.env.DAILY_CLOUD_RECORDING === "1";
}

export function dailyRoomBaseProperties(extra: Record<string, unknown> = {}): Record<string, unknown> {
  const base: Record<string, unknown> = {
    enable_chat: true,
    enable_screenshare: true,
    enable_prejoin_ui: false,
    enable_knocking: false,
    eject_at_room_exp: true,
    ...extra,
  };
  if (isDailyCloudRecordingEnabled()) {
    base.enable_recording = "cloud";
  }
  return base;
}
