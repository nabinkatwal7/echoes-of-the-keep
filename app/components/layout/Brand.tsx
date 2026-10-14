import Link from "next/link";
import { LOGO } from "@/engine/pixel/logo";
import { PixelSprite } from "../pixel/PixelSprite";

export const PRODUCT = "Echoes of the Keep";

/** The pixel hearth and the product name, linking home. */
export function Brand() {
  return (
    <Link href="/" className="group flex shrink-0 items-center gap-2.5" aria-label={`${PRODUCT} home`}>
      <PixelSprite sprite={LOGO} scale={2} className="anim-flicker transition-transform duration-300 group-hover:-translate-y-0.5" />
      <span className="font-display text-[0.8rem] font-bold uppercase leading-tight tracking-[0.08em] text-foreground sm:whitespace-nowrap sm:text-lg sm:tracking-[0.1em]">
        Echoes <span className="text-gold">of the</span> Keep
      </span>
    </Link>
  );
}
