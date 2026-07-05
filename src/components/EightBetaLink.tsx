import Link from "next/link";

const EIGHT_BETA_URL = "https://doctor8.com.br/";

export default function EightBetaLink() {
  return (
    <Link
      href={EIGHT_BETA_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
      aria-label="Eight beta"
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
      <span>beta</span>
    </Link>
  );
}
