// Presigned upload/view for rateio cost receipts (private S3).

import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getAdminSession } from "@/lib/admin";
import { buildKey, getSignedReadUrl } from "@/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const RECEIPT_PREFIX = "rateio-receipts/";

let _client: S3Client | null = null;

function s3Client(): S3Client {
  if (!_client) {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    if (!accessKeyId || !secretAccessKey) {
      throw new Error("AWS credentials are not set");
    }
    _client = new S3Client({
      region: process.env.AWS_REGION || "eu-north-1",
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return _client;
}

function defaultMonth(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

async function presignedPutUrl(key: string, contentType: string): Promise<string> {
  const bucket = process.env.AWS_S3_BUCKET || "";
  return getSignedUrl(
    s3Client(),
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 900 },
  );
}

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = new URL(req.url).searchParams.get("key");
  if (!key || !key.startsWith(RECEIPT_PREFIX)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  try {
    const viewUrl = await getSignedReadUrl(key, 300);
    return NextResponse.json({ viewUrl });
  } catch (e) {
    console.error("[RATEIO-ATTACHMENT-VIEW]", e);
    return NextResponse.json({ error: "Failed to generate view URL" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const filename = typeof body.filename === "string" ? body.filename.trim() : "";
  const contentType = typeof body.contentType === "string" ? body.contentType.trim().toLowerCase() : "";
  const month =
    typeof body.month === "string" && /^\d{4}-\d{2}$/.test(body.month)
      ? body.month
      : defaultMonth();

  if (!filename) {
    return NextResponse.json({ error: "filename required" }, { status: 400 });
  }
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return NextResponse.json(
      { error: "contentType must be image/jpeg, image/png, or application/pdf" },
      { status: 400 },
    );
  }

  const declaredSize = Number(body.sizeBytes);
  if (Number.isFinite(declaredSize) && declaredSize > MAX_ATTACHMENT_BYTES) {
    return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 400 });
  }

  try {
    const key = buildKey(`${RECEIPT_PREFIX}${month}`, filename);
    const uploadUrl = await presignedPutUrl(key, contentType);
    return NextResponse.json({ uploadUrl, key, maxBytes: MAX_ATTACHMENT_BYTES });
  } catch (e) {
    console.error("[RATEIO-ATTACHMENT-UPLOAD]", e);
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
  }
}
