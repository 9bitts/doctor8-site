// Presigned S3 uploads for course videos and thumbnails (direct browser → S3).

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { buildKey } from "@/lib/s3";

const VIDEO_PREFIX = "course-videos/";
const THUMB_PREFIX = "course-thumbnails/";

export const COURSE_VIDEO_MAX_BYTES = 500 * 1024 * 1024; // 500 MB
export const COURSE_THUMB_MAX_BYTES = 5 * 1024 * 1024;

const VIDEO_MIME = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const THUMB_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

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

function safeUserId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "");
}

export function courseVideoPrefix(userId: string): string {
  return `${VIDEO_PREFIX}${safeUserId(userId)}`;
}

export function courseThumbPrefix(userId: string): string {
  return `${THUMB_PREFIX}${safeUserId(userId)}`;
}

export function isCourseVideoKey(key: string, userId: string): boolean {
  return key.startsWith(courseVideoPrefix(userId) + "/");
}

export function isCourseThumbKey(key: string, userId: string): boolean {
  return key.startsWith(courseThumbPrefix(userId) + "/");
}

async function presignedPut(key: string, contentType: string): Promise<string> {
  const bucket = process.env.AWS_S3_BUCKET || "";
  return getSignedUrl(
    s3Client(),
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
    { expiresIn: 3600 },
  );
}

export async function createCourseVideoUploadUrl(params: {
  userId: string;
  filename: string;
  contentType: string;
  sizeBytes?: number;
}): Promise<{ uploadUrl: string; key: string; maxBytes: number }> {
  const ct = params.contentType.toLowerCase();
  if (!VIDEO_MIME.has(ct)) {
    throw new Error("Tipo de vídeo não suportado. Use MP4, WebM ou MOV.");
  }
  if (params.sizeBytes != null && params.sizeBytes > COURSE_VIDEO_MAX_BYTES) {
    throw new Error("Vídeo excede o limite de 500 MB.");
  }
  const key = buildKey(courseVideoPrefix(params.userId), params.filename);
  const uploadUrl = await presignedPut(key, ct);
  return { uploadUrl, key, maxBytes: COURSE_VIDEO_MAX_BYTES };
}

export async function createCourseThumbUploadUrl(params: {
  userId: string;
  filename: string;
  contentType: string;
  sizeBytes?: number;
}): Promise<{ uploadUrl: string; key: string; maxBytes: number }> {
  const ct = params.contentType.toLowerCase();
  if (!THUMB_MIME.has(ct)) {
    throw new Error("Use JPEG, PNG ou WebP para a capa.");
  }
  if (params.sizeBytes != null && params.sizeBytes > COURSE_THUMB_MAX_BYTES) {
    throw new Error("Capa excede 5 MB.");
  }
  const key = buildKey(courseThumbPrefix(params.userId), params.filename);
  const uploadUrl = await presignedPut(key, ct);
  return { uploadUrl, key, maxBytes: COURSE_THUMB_MAX_BYTES };
}
