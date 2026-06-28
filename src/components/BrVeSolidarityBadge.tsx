"use client";

/** Compact BR + VE solidarity badge for dashboard sidebar. */
export default function BrVeSolidarityBadge() {
  return (
    <div
      className="mx-3 mb-3 rounded-xl overflow-hidden border border-white/10 bg-gradient-to-br from-slate-800/90 to-slate-900/95 shadow-inner"
      aria-hidden
    >
      <svg viewBox="0 0 240 72" className="w-full h-auto block" role="img">
        <defs>
          <linearGradient id="d8-sa-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0c1a27" />
            <stop offset="100%" stopColor="#1a3d52" />
          </linearGradient>
        </defs>
        <rect width="240" height="72" fill="url(#d8-sa-bg)" />
        {/* South America silhouette (simplified) */}
        <path
          fill="#2a85a355"
          stroke="#2a85a388"
          strokeWidth="0.8"
          d="M118 8c-18 2-32 14-38 28-4 10-2 22 6 30 8 8 20 10 32 6 14-5 24-18 26-32 2-14-4-26-14-32-4-2-8-3-12-2z M132 52c6 8 14 10 22 6 6-3 10-10 8-16-6 4-14 6-22 4-4-1-6 2-8 6z"
        />
        {/* Brazil flag */}
        <g transform="translate(18, 14)">
          <rect width="44" height="30" rx="3" fill="#009c3b" />
          <polygon points="22,4 40,15 22,26 4,15" fill="#ffdf00" />
          <circle cx="22" cy="15" r="6.5" fill="#002776" />
        </g>
        {/* Venezuela flag */}
        <g transform="translate(178, 14)">
          <rect width="44" height="30" rx="3" fill="#cf142b" />
          <rect y="10" width="44" height="10" fill="#00247d" />
          <rect y="20" width="44" height="10" fill="#ffcc00" />
          <circle cx="22" cy="15" r="5" fill="#fff" opacity="0.85" />
        </g>
        {/* Connector arc */}
        <path
          d="M62 29 Q120 18 178 29"
          fill="none"
          stroke="#e05930"
          strokeWidth="1.5"
          strokeDasharray="3 2"
          opacity="0.85"
        />
        <circle cx="120" cy="22" r="3" fill="#e05930" />
      </svg>
      <p className="px-3 py-2 text-[10px] leading-snug text-slate-400 text-center border-t border-white/5">
        Brasil ? Venezuela
      </p>
    </div>
  );
}
