import { heroSprite } from "@/engine/pixel/heroes";
import { MonsterAvatar } from "./Avatars";
import { PixelSprite } from "./PixelSprite";

const PARTY = [["fighter", "Brannoch"], ["wizard", "Mirela"], ["rogue", "Tamsin"], ["cleric", "Orsolo"]] as const;
const FLAMES = [
  { dy: "-14px", delay: "0s", color: "#f6c445" },
  { dy: "6px", delay: "0.35s", color: "#e0702f" },
  { dy: "-4px", delay: "0.7s", color: "#fff3c4" },
  { dy: "14px", delay: "1.05s", color: "#e0702f" },
  { dy: "-20px", delay: "1.4s", color: "#f6c445" },
  { dy: "2px", delay: "1.8s", color: "#a3283a" },
];

/** A small looping scene: the party waits, the drake breathes fire, a d20 tumbles. Pure CSS, decorative. */
export function Tableau() {
  return (
    <div aria-hidden className="relative flex h-40 items-end justify-between overflow-hidden px-2 pb-1">
      <div className="flex items-end gap-1">
        {PARTY.map(([k, n], i) => (
          <div key={n} className="anim-bob" style={{ animationDelay: `${i * 0.35}s` }}>
            <div className="anim-recoil" style={{ animationDelay: `${i * 0.05}s` }}>
              <PixelSprite sprite={heroSprite(k, n)} scale={4} />
            </div>
          </div>
        ))}
      </div>
      <span className="anim-tumble absolute left-1/2 top-2 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded border-2 border-gold bg-surface2 font-display text-lg font-bold text-goldBright">20</span>
      <div className="relative">
        <div className="anim-breathe">
          <div className="-scale-x-100">
            <MonsterAvatar type="dragon" name="Ember drake" size={120} round={false} />
          </div>
        </div>
        <div className="pointer-events-none absolute left-2 top-8">
          {FLAMES.map((f, i) => (
            <span key={i} className="anim-flame absolute block h-2.5 w-2.5" style={{ background: f.color, animationDelay: f.delay, ["--dy" as string]: f.dy }} />
          ))}
        </div>
      </div>
    </div>
  );
}
