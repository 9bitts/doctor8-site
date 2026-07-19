/** Client-side image resize helpers (JPEG). */

function loadResizedCanvas(
  file: File,
  maxSize: number
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Not an image"));
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas unavailable"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = ev.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export async function resizeImageToDataUrl(
  file: File,
  maxSize: number,
  quality = 0.85
): Promise<string> {
  const canvas = await loadResizedCanvas(file, maxSize);
  return canvas.toDataURL("image/jpeg", quality);
}

/** Resize to a JPEG File suitable for /api/uploads. */
export async function resizeImageToJpegFile(
  file: File,
  maxSize: number,
  quality = 0.85
): Promise<File> {
  const canvas = await loadResizedCanvas(file, maxSize);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to encode image"))),
      "image/jpeg",
      quality
    );
  });
  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}
