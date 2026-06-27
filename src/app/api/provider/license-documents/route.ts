import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildKey, getSignedReadUrl, uploadToS3 } from "@/lib/s3";
import {
  isProviderRole,
  LICENSE_DOC_MIME,
  licenseDocsFolder,
  MAX_LICENSE_DOC_BYTES,
  MAX_LICENSE_DOCUMENTS,
} from "@/lib/provider-license-docs";

function mapDoc(doc: {
  id: string;
  label: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: Date;
}) {
  return {
    id: doc.id,
    label: doc.label,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    fileSize: doc.fileSize,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isProviderRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const docs = await db.providerLicenseDocument.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const documents = await Promise.all(
    docs.map(async (doc) => ({
      ...mapDoc(doc),
      viewUrl: await getSignedReadUrl(doc.fileKey),
    })),
  );

  return NextResponse.json({
    documents,
    maxDocuments: MAX_LICENSE_DOCUMENTS,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isProviderRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const count = await db.providerLicenseDocument.count({
    where: { userId: session.user.id },
  });
  if (count >= MAX_LICENSE_DOCUMENTS) {
    return NextResponse.json(
      { error: `Maximum of ${MAX_LICENSE_DOCUMENTS} documents reached.` },
      { status: 400 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  const labelRaw = (form.get("label") as string | null)?.trim() || null;
  const label = labelRaw && labelRaw.length <= 80 ? labelRaw : null;

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!(LICENSE_DOC_MIME as readonly string[]).includes(file.type)) {
    return NextResponse.json(
      { error: "File type not allowed. Use PDF or image (JPEG, PNG, WebP, HEIC)." },
      { status: 400 },
    );
  }

  if (file.size > MAX_LICENSE_DOC_BYTES) {
    return NextResponse.json({ error: "File too large. Maximum is 50 MB." }, { status: 400 });
  }

  const folder = licenseDocsFolder(session.user.id);
  const key = buildKey(folder, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  await uploadToS3({ key, body: buffer, contentType: file.type });

  const doc = await db.providerLicenseDocument.create({
    data: {
      userId: session.user.id,
      label,
      fileKey: key,
      fileName: file.name.slice(0, 255),
      mimeType: file.type,
      fileSize: file.size,
    },
  });

  const viewUrl = await getSignedReadUrl(doc.fileKey);

  return NextResponse.json(
    { document: { ...mapDoc(doc), viewUrl } },
    { status: 201 },
  );
}
