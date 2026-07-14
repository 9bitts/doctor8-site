type Props = {
  className?: string;
  size?: number;
  variant?: "default" | "light";
};

/** Modern AI assistant orb — neural waveform inside a gradient sphere. */
export default function OwlIcon({ className = "", size = 28, variant = "default" }: Props) {
  const id = `ai-${size}-${variant}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${id}-orb`} x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee" />
          <stop offset="0.45" stopColor="#6366f1" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id={`${id}-ring`} x1="0" y1="16" x2="32" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#67e8f9" stopOpacity="0.9" />
          <stop offset="1" stopColor="#c4b5fd" stopOpacity="0.4" />
        </linearGradient>
        <filter id={`${id}-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle
        cx="16"
        cy="16"
        r="14.5"
        stroke={`url(#${id}-ring)`}
        strokeWidth="0.75"
        strokeDasharray="3 2"
        opacity="0.85"
      />
      <circle
        cx="16"
        cy="16"
        r="12"
        fill={`url(#${id}-orb)`}
        filter={`url(#${id}-glow)`}
      />
      <circle cx="16" cy="16" r="12" fill={variant === "light" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.08)"} />

      <path
        d="M8 16.5C10 13.5 12.5 12 16 12C19.5 12 22 13.5 24 16.5"
        stroke={variant === "light" ? "#ffffff" : "#ecfeff"}
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M9 19.5C11 17 13.5 16 16 16C18.5 16 21 17 23 19.5"
        stroke={variant === "light" ? "#ffffff" : "#e0e7ff"}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M10.5 22C12.5 20.5 14.5 20 16 20C17.5 20 19.5 20.5 21.5 22"
        stroke={variant === "light" ? "#ffffff" : "#c4b5fd"}
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.9"
      />

      <circle cx="11" cy="11" r="1" fill="#67e8f9" opacity="0.9" />
      <circle cx="21" cy="10" r="0.8" fill="#a5b4fc" opacity="0.8" />
      <circle cx="23" cy="20" r="0.7" fill="#c4b5fd" opacity="0.7" />
    </svg>
  );
}
