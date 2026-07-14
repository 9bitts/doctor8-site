type Props = {
  className?: string;
  size?: number;
  variant?: "default" | "light";
};

/** Cute tech owl mascot for the Doctor8 voice assistant. */
export default function OwlIcon({ className = "", size = 28, variant = "default" }: Props) {
  const id = `owl-${size}-${variant}`;
  const eyeWhite = variant === "light" ? "#ffffff" : "#f8fafc";
  const pupil = variant === "light" ? "#0f172a" : "#1e1b4b";
  const tuft = variant === "light" ? "#4338ca" : "#5b21b6";

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
        <linearGradient id={`${id}-body`} x1="8" y1="6" x2="24" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee" />
          <stop offset="0.5" stopColor="#6366f1" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id={`${id}-ring`} x1="0" y1="16" x2="32" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#67e8f9" stopOpacity="0.85" />
          <stop offset="1" stopColor="#c4b5fd" stopOpacity="0.35" />
        </linearGradient>
        <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="0.9" result="blur" />
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
        opacity="0.8"
      />

      <ellipse
        cx="16"
        cy="17.5"
        rx="10.5"
        ry="11"
        fill={`url(#${id}-body)`}
        filter={`url(#${id}-glow)`}
      />

      {/* Ear tufts */}
      <path d="M9.5 7.5L11.2 12.8L7.8 11.2Z" fill={tuft} />
      <path d="M22.5 7.5L20.8 12.8L24.2 11.2Z" fill={tuft} />

      {/* Big owl eyes */}
      <circle cx="11.8" cy="15.2" r="4.1" fill={eyeWhite} />
      <circle cx="20.2" cy="15.2" r="4.1" fill={eyeWhite} />
      <circle cx="12.3" cy="15.5" r="2.05" fill={pupil} />
      <circle cx="20.7" cy="15.5" r="2.05" fill={pupil} />
      <circle cx="13.1" cy="14.7" r="0.65" fill={eyeWhite} opacity="0.95" />
      <circle cx="21.5" cy="14.7" r="0.65" fill={eyeWhite} opacity="0.95" />

      {/* Beak */}
      <path d="M16 17.2L14.1 20.1H17.9L16 17.2Z" fill="#f59e0b" />
      <path
        d="M14.8 23.2C15.6 23.9 16.4 23.9 17.2 23.2"
        stroke={eyeWhite}
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.55"
      />

      {/* Wing hints */}
      <path
        d="M6.5 18.5C7.8 16.8 9.2 16 10.5 16.2"
        stroke={variant === "light" ? "#e0e7ff" : "#c4b5fd"}
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.65"
      />
      <path
        d="M25.5 18.5C24.2 16.8 22.8 16 21.5 16.2"
        stroke={variant === "light" ? "#e0e7ff" : "#c4b5fd"}
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.65"
      />
    </svg>
  );
}
