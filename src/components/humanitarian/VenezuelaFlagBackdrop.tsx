/** Decorative Venezuela tricolor backdrop for humanitarian patient portal. */
export default function VenezuelaFlagBackdrop() {
  return (
    <div aria-hidden className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 scale-[1.03] blur-[2px] saturate-[1.05]"
        style={{
          background: `linear-gradient(
            to bottom,
            #FBD108 0%,
            #FBD108 33.3%,
            #00247D 33.3%,
            #00247D 66.6%,
            #CF142B 66.6%,
            #CF142B 100%
          )`,
        }}
      />
      <div
        className="absolute left-1/2 top-[33.3%] h-[640px] w-[640px] -translate-x-1/2 -translate-y-[58%] opacity-[0.35]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,.85) 3px, transparent 3.5px)",
          backgroundSize: "58px 58px",
          WebkitMaskImage: "radial-gradient(closest-side, rgba(0,0,0,.9) 0%, transparent 72%)",
          maskImage: "radial-gradient(closest-side, rgba(0,0,0,.9) 0%, transparent 72%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 900px 700px at 50% 8%, rgba(10,27,38,.15), rgba(10,27,38,.72) 60%, rgba(6,17,24,.92) 100%),
            linear-gradient(180deg, rgba(6,17,24,.55) 0%, rgba(6,17,24,.78) 100%)
          `,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ boxShadow: "inset 0 0 220px 60px rgba(0,0,0,.55)" }}
      />
    </div>
  );
}
