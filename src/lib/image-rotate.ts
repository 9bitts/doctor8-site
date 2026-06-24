// Client-side image rotation via canvas (for attachment uploads).

export async function rotateImageFile(file: File, degrees: 90 | 180 | 270): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const rad = (degrees * Math.PI) / 180;
  const swap = degrees === 90 || degrees === 270;
  canvas.width = swap ? bitmap.height : bitmap.width;
  canvas.height = swap ? bitmap.width : bitmap.height;

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to rotate image"))),
      file.type || "image/jpeg",
      0.92,
    );
  });

  return new File([blob], file.name, { type: file.type || "image/jpeg", lastModified: Date.now() });
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}
