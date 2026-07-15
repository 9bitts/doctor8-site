"use client";

/**
 * Opens an authenticated same-origin PDF URL in a new tab (avoids middleware
 * redirect issues and empty popup pages).
 */
export async function openAuthenticatedPdf(url: string): Promise<void> {
  return openAuthenticatedBlob(url);
}

/** Fetches an authenticated PDF and triggers a browser download (no popup). */
export async function downloadAuthenticatedPdf(
  url: string,
  filename = "receita.pdf",
): Promise<void> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error("PDF_FETCH_FAILED");
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(blobUrl);
}

/** Opens a same-origin authenticated URL (PDF, image, etc.) in a new tab. */
export async function openAuthenticatedBlob(url: string): Promise<void> {
  const win = window.open("", "_blank");
  if (win) {
    try {
      win.opener = null;
    } catch {
      /* ignore */
    }
  }
  try {
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) {
      win?.close();
      throw new Error("PDF_FETCH_FAILED");
    }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    if (win) {
      win.location.href = blobUrl;
    } else {
      window.location.href = blobUrl;
    }
  } catch (e) {
    win?.close();
    throw e;
  }
}

/**
 * Opens a URL that is only known after an async operation, without being
 * blocked by Safari's popup blocker. Call this SYNCHRONOUSLY inside a click
 * handler, passing a function that resolves to the final URL.
 *
 * - Opens a blank window immediately (while the user gesture is still live).
 * - Assigns the URL when the promise resolves.
 * - Closes the blank window and rethrows if the promise rejects or returns
 *   no URL, so the caller can show its existing error UI (toast etc.).
 */
export async function openUrlAfterAsync(
  getUrl: () => Promise<string | null | undefined>,
): Promise<void> {
  const win = window.open("", "_blank");
  if (win) {
    try {
      win.opener = null;
    } catch {
      /* ignore */
    }
  }
  try {
    const url = await getUrl();
    if (!url) {
      win?.close();
      throw new Error("NO_URL");
    }
    if (win) {
      win.location.href = url;
    } else {
      // Popup was blocked anyway (rare) - fall back to same-tab navigation
      // so the user still gets the file.
      window.location.href = url;
    }
  } catch (e) {
    win?.close();
    throw e;
  }
}
