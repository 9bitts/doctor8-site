/** Decorative Venezuela tricolor + stars for humanitarian patient portal. */
export default function VenezuelaFlagBackdrop() {
  const starPoints =
    "M12,2 L14.5,8.5 L21.5,8.5 L16,12.5 L18,19 L12,15 L6,19 L8,12.5 L2.5,8.5 L9.5,8.5 Z";

  const stars = [
    { cx: 52, cy: 58, r: 0.85 },
    { cx: 88, cy: 44, r: 0.9 },
    { cx: 128, cy: 34, r: 0.95 },
    { cx: 168, cy: 28, r: 1 },
    { cx: 208, cy: 28, r: 1 },
    { cx: 248, cy: 34, r: 0.95 },
    { cx: 288, cy: 44, r: 0.9 },
    { cx: 324, cy: 58, r: 0.85 },
  ];

  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 scale-[1.08] sm:scale-110 origin-center">
        <div className="absolute inset-0 flex flex-col">
          <div className="flex-1 bg-[#FFCC00]" />
          <div className="flex-1 bg-[#002868] relative flex items-center justify-center overflow-hidden">
            <svg
              viewBox="0 0 376 88"
              className="w-[92%] max-w-2xl opacity-95 drop-shadow-[0_2px_12px_rgba(0,0,0,0.25)]"
              preserveAspectRatio="xMidYMid meet"
            >
              {stars.map((star, i) => (
                <g
                  key={i}
                  transform={`translate(${star.cx - 12}, ${star.cy - 12}) scale(${star.r})`}
                  fill="#FFFFFF"
                >
                  <path d={starPoints} />
                </g>
              ))}
            </svg>
          </div>
          <div className="flex-1 bg-[#CF142B]" />
        </div>
      </div>

      <div className="absolute inset-0 bg-slate-950/72" />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/55 via-slate-950/25 to-slate-950/75" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(2,6,23,0.45)_100%)]" />
      <div className="absolute inset-0 backdrop-blur-[2px]" />
    </div>
  );
}
