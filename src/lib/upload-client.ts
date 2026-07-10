// Client-side upload helper with consistent auth and error messages (#31).

export type UploadFileResult =
  | { ok: true; key: string; name: string; type: string; size: number }
  | { ok: false; error: string; unauthorized?: boolean };

export async function uploadFileToApi(
  file: File,
  folder: string,
): Promise<UploadFileResult> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);

  let res: Response;
  try {
    res = await fetch("/api/uploads", {
      method: "POST",
      body: fd,
      credentials: "same-origin",
    });
  } catch {
    return { ok: false, error: "NETWORK" };
  }

  let data: { key?: string; name?: string; type?: string; size?: number; error?: string } = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (res.status === 401) {
    return { ok: false, error: "SESSION_EXPIRED", unauthorized: true };
  }

  if (!res.ok) {
    return { ok: false, error: typeof data.error === "string" ? data.error : "UPLOAD_FAILED" };
  }

  if (!data.key) {
    return { ok: false, error: "NO_FILE_KEY" };
  }

  return {
    ok: true,
    key: data.key,
    name: data.name || file.name,
    type: data.type || file.type,
    size: data.size ?? file.size,
  };
}
