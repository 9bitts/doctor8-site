// src/lib/s3.ts
// AWS S3 helper — upload, signed-URL (read), and delete.
// Files are PRIVATE by default (bucket blocks public access).
// To let a user view a file, we generate a short-lived signed URL.

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomBytes } from "crypto";

const REGION = process.env.AWS_REGION || "eu-north-1";
const BUCKET = process.env.AWS_S3_BUCKET || "";

let _client: S3Client | null = null;
function client(): S3Client {
  if (!_client) {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    if (!accessKeyId || !secretAccessKey) {
      throw new Error("AWS credentials are not set");
    }
    _client = new S3Client({
      region: REGION,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return _client;
}

// Allowed file types for clinical attachments.
export const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "video/mp4",
  "video/quicktime",
  "video/webm",
];

// Max upload size: 50 MB (videos can be large; we cap to control storage cost).
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

// Generates a unique, safe key for storing the object.
export function buildKey(folder: string, originalName: string): string {
  const ext = (originalName.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const id = randomBytes(16).toString("hex");
  const safeFolder = folder
    .split("/")
    .map((segment) => segment.replace(/[^a-zA-Z0-9_-]/g, ""))
    .filter(Boolean)
    .join("/");
  return `${safeFolder}/${id}.${ext}`;
}

// Uploads a buffer to S3 and returns the stored key.
export async function uploadToS3(params: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<string> {
  await client().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    })
  );
  return params.key;
}

// Generates a temporary URL to view/download a private file (default 15 min).
export async function getSignedReadUrl(key: string, expiresInSeconds = 900): Promise<string> {
  return getSignedUrl(
    client(),
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: expiresInSeconds }
  );
}

// Deletes a file from S3.
export async function deleteFromS3(key: string): Promise<void> {
  await client().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

// Downloads a private object from S3 (for server-side processing).
export async function downloadFromS3(key: string): Promise<{ body: Buffer; contentType: string | undefined }> {
  const res = await client().send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const bytes = await res.Body?.transformToByteArray();
  if (!bytes) throw new Error("Empty file");
  return { body: Buffer.from(bytes), contentType: res.ContentType };
}
