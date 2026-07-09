type Props = {
  className?: string;
  size?: number;
};

/** Friendly owl mascot for the Doctor8 voice assistant. */
export default function OwlIcon({ className = "", size = 28 }: Props) {
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
      <ellipse cx="16" cy="19" rx="10" ry="11" fill="#6d28d9" />
      <path
        d="M10 8.5L12.5 12.5L8 11.5L10 8.5ZM22 8.5L20 11.5L15.5 12.5L22 8.5Z"
        fill="#5b21b6"
      />
      <circle cx="11.5" cy="17.5" r="4.2" fill="#ffffff" />
      <circle cx="20.5" cy="17.5" r="4.2" fill="#ffffff" />
      <circle cx="12" cy="18" r="2.1" fill="#1e1b4b" />
      <circle cx="21" cy="18" r="2.1" fill="#1e1b4b" />
      <circle cx="12.6" cy="17.3" r="0.7" fill="#ffffff" />
      <circle cx="21.6" cy="17.3" r="0.7" fill="#ffffff" />
      <path d="M16 21.5L14.2 23.2H17.8L16 21.5Z" fill="#f59e0b" />
      <path d="M13.5 24.5C14.8 25.6 17.2 25.6 18.5 24.5" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}
