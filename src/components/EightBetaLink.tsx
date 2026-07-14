import Link from "next/link";
import { REDE_EIGHT_URL } from "@/lib/rede-eight";

export default function EightBetaLink() {
  return (
    <Link
      href={REDE_EIGHT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
      aria-label="Rede Eight"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/branding/eight-icon.svg"
        alt=""
        width={20}
        height={20}
        className="shrink-0"
        aria-hidden
      />
    </Link>
  );
}
