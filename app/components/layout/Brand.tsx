import Link from "next/link";
import { LOGO } from "@/engine/pixel/logo";
import { PixelSprite } from "../pixel/PixelSprite";

export const PRODUCT = "Emberhall";

/** The pixel hearth and the product name, linking home. */
export function Brand() {
  return (
    <Link href="/" className="group flex shrink-0 items-center gap-2.5" aria-label={`${PRODUCT} home`}>
      <PixelSprite sprite={LOGO} scale={2} className="transition-transform duration-300 group-hover:-translate-y-0.5" />
      <span className="whitespace-nowrap font-display text-lg font-bold uppercase tracking-[0.1em] sm:text-xl sm:tracking-[0.14em] text-foreground">
        Ember<span className="text-gold">hall</span>
      </span>
    </Link>
  );
}
