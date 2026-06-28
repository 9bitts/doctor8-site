import { FileType } from "lucide-react";

/** Thumbnail for clinical record attachments (PDF / video / other). */
export function RecordFileThumbnail({
  kind,
  name,
  className = "",
}: {
  kind: "image" | "pdf" | "video" | "other";
  name?: string;
  className?: string;
}) {
  if (kind === "pdf") {
    return (
      <div
        className={`w-full h-full flex flex-col items-center justify-center gap-0.5 bg-gradient-to-br from-accent-50 to-orange-50 text-accent-600 ${className}`}
      >
        <div className="w-9 h-11 rounded-md bg-white border-2 border-accent-400/60 shadow-sm flex items-end justify-center pb-1">
          <FileType size={18} className="text-accent-500" strokeWidth={2.2} />
        </div>
        <span className="text-[9px] font-bold uppercase tracking-wide text-accent-600">PDF</span>
        {name && (
          <span className="text-[8px] text-center leading-tight line-clamp-2 px-1 text-accent-700/80 max-w-full">
            {name}
          </span>
        )}
      </div>
    );
  }

  if (kind === "video") {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center gap-1 p-1 text-slate-500 bg-slate-100 ${className}`}>
        <span className="text-[9px] font-semibold uppercase">V?deo</span>
        {name && <span className="text-[8px] text-center line-clamp-2 px-0.5">{name}</span>}
      </div>
    );
  }

  return (
    <div className={`w-full h-full flex flex-col items-center justify-center gap-1 p-1 text-slate-500 bg-slate-50 ${className}`}>
      <span className="text-[9px] font-semibold uppercase">Arquivo</span>
      {name && <span className="text-[8px] text-center line-clamp-2 px-0.5">{name}</span>}
    </div>
  );
}

export function resolveAttachmentKind(
  key: string,
  name?: string,
): "image" | "pdf" | "video" | "other" {
  const fromName = (name?.split(".").pop() || "").toLowerCase();
  const fromKey = (key.split(".").pop() || "").toLowerCase();
  const ext = fromName || fromKey;
  const blob = `${key} ${name || ""}`.toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "heic", "heif"].includes(ext)) {
    if (blob.includes(".pdf") || blob.includes("application/pdf")) return "pdf";
    return "image";
  }
  if (ext === "pdf" || blob.includes(".pdf")) return "pdf";
  if (["mp4", "mov", "webm", "avi", "mkv"].includes(ext)) return "video";
  return "other";
}
