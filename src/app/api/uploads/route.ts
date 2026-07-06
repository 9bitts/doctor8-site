// src/app/api/uploads/route.ts
// POST — upload a file to S3, returns the stored key.
//
// Only authenticated users can upload. The key is returned to the caller,
// which stores it on the related record (e.g. MedicalDocument.fileUrl).
//
// NOTE: there is intentionally NO generic GET-by-key endpoint here. Reading a
// file must go through an authorized, record-scoped endpoint that checks the
// caller is actually allowed to see that document, e.g.:
//   - GET /api/patient/documents?documentId=...
//   - GET /api/professional/shared?documentId=...
// A generic "give me a signed URL for any key" endpoint would be an IDOR
// (any authenticated user could read any other user's PHI file).
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  uploadToS3,
  buildKey,
  ALLOWED_MIME,
  MAX_UPLOAD_BYTES,
} from "@/lib/s3";
import { isAllowedUploadFolder, normalizeUploadFolder, patientDocsFolder, nutritionDiaryFolder } from "@/lib/upload-folders";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const folderRaw = (form.get("folder") as string) || "uploads";
  let folder = normalizeUploadFolder(folderRaw) || "uploads";

  // Patient document uploads are scoped to the caller's userId so the resulting
  // key is ownership-verifiable (prevents cross-patient fileKey injection).
  if (folder === "patient-docs") {
    folder = patientDocsFolder(session.user.id);
  }
  if (folder === "nutrition-diary") {
    folder = nutritionDiaryFolder(session.user.id);
  }

  if (!isAllowedUploadFolder(folder)) {
    return NextResponse.json({ error: "Invalid upload folder" }, { status: 400 });
  }

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json(
      { error: "File type not allowed. Use PDF, image, or video." },
      { status: 400 }
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "File too large. Maximum is 50 MB." },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const key = buildKey(folder, file.name);
  await uploadToS3({ key, body: buffer, contentType: file.type });

  return NextResponse.json({
    key,
    name: file.name,
    type: file.type,
    size: file.size,
  });
}
