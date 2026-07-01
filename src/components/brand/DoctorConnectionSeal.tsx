type Props = {
  className?: string;
  /** Icon-only mark for narrow screens (no wordmark). */
  compact?: boolean;
};

function DoctorConnectionMark({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <svg
        viewBox="28 32 124 96"
        xmlns="http://www.w3.org/2000/svg"
        className="h-auto w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <circle cx="75" cy="80" r="42" fill="none" stroke="#176a88" strokeWidth="14" />
        <circle cx="125" cy="80" r="42" fill="none" stroke="#e05930" strokeWidth="14" />
        <rect x="93" y="62" width="14" height="36" rx="3" fill="#ffffff" />
        <rect x="82" y="73" width="36" height="14" rx="3" fill="#ffffff" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 560 160"
      xmlns="http://www.w3.org/2000/svg"
      className="h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <circle cx="75" cy="80" r="42" fill="none" stroke="#176a88" strokeWidth="14" />
      <circle cx="125" cy="80" r="42" fill="none" stroke="#e05930" strokeWidth="14" />
      <rect x="93" y="62" width="14" height="36" rx="3" fill="#ffffff" />
      <rect x="82" y="73" width="36" height="14" rx="3" fill="#ffffff" />
      <text
        x="190"
        y="68"
        fontFamily="Poppins, sans-serif"
        fontWeight="700"
        fontSize="42"
        fill="#176a88"
      >
        Doctor
      </text>
      <text
        x="190"
        y="118"
        fontFamily="Poppins, sans-serif"
        fontWeight="700"
        fontSize="42"
        fill="#e05930"
      >
        Connection
      </text>
    </svg>
  );
}

/** Doctor Connection mark ? interlocking circles + wordmark (seal / badge use). */
export function DoctorConnectionSeal({ className = "", compact = false }: Props) {
  return (
    <div
      className={`pointer-events-none select-none drop-shadow-sm ${className}`.trim()}
      role="img"
      aria-label="Doctor Connection"
    >
      <DoctorConnectionMark compact={compact} />
    </div>
  );
}
