"use client";

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
      // Popup was blocked anyway (rare) ù fall back to same-tab navigation
      // so the user still gets the file.
      window.location.href = url;
    }
  } catch (e) {
    win?.close();
    throw e;
  }
}
