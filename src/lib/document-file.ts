import { decrypt } from "@/lib/encryption";

export function safeDecryptFileKey(v: string | null | undefined): string {
  if (v == null) return "";
  try {
    return decrypt(v);
  } catch {
    return v;
  }
}

export function resolveDocumentFileKey(doc: {
  fileUrl?: string | null;
  signedFileUrl?: string | null;
  signatureStatus?: string | null;
}): string | null {
  if (doc.signatureStatus === "SIGNED" && doc.signedFileUrl) {
    const key = safeDecryptFileKey(doc.signedFileUrl);
    if (key) return key;
  }
  if (doc.fileUrl) {
    const key = safeDecryptFileKey(doc.fileUrl);
    if (key) return key;
  }
  if (doc.signedFileUrl) {
    const key = safeDecryptFileKey(doc.signedFileUrl);
    if (key) return key;
  }
  return null;
}

export function documentHasStoredFile(doc: {
  fileUrl?: string | null;
  signedFileUrl?: string | null;
}): boolean {
  return !!(doc.fileUrl || doc.signedFileUrl);
}
