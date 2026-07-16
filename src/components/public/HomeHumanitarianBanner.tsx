import Link from "next/link";
import { Heart, ArrowRight } from "lucide-react";

const VE_YELLOW = "#ffcc00";
const VE_BLUE = "#00308f";
const VE_RED = "#cf142b";

const HUMANITARIAN_PORTAL_HREF = "/atendimentohumanitario";

type Props = {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
};

export default function HomeHumanitarianBanner({ eyebrow, title, body, cta }: Props) {
  return (
    <aside
      className="relative border-b border-white/10"
      style={{ backgroundColor: VE_BLUE }}
      role="region"
      aria-label={eyebrow}
    >
      <div
        className="h-1"
        style={{
          background: `linear-gradient(to right, ${VE_YELLOW}, ${VE_BLUE}, ${VE_RED})`,
        }}
        aria-hidden
      />

      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-5 sm:px-6 sm:py-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: VE_YELLOW }}
            aria-hidden
          >
            <Heart size={20} style={{ color: VE_RED }} fill={VE_RED} fillOpacity={0.25} />
          </div>

          <div className="min-w-0">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.14em]"
              style={{ color: VE_YELLOW }}
            >
              {eyebrow}
            </p>
            <p className="mt-0.5 text-sm font-bold leading-snug text-white sm:text-[15px]">
              {title}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/85 sm:text-sm">
              {body}
            </p>
          </div>
        </div>

        <Link
          href={HUMANITARIAN_PORTAL_HREF}
          className="inline-flex shrink-0 items-center justify-center gap-2 self-stretch rounded-lg px-4 py-2.5 text-sm font-bold transition hover:brightness-95 active:scale-[0.98] sm:self-center"
          style={{ backgroundColor: VE_YELLOW, color: VE_BLUE }}
        >
          {cta}
          <ArrowRight size={16} strokeWidth={2.5} aria-hidden />
        </Link>
      </div>
    </aside>
  );
}
