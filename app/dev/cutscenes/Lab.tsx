"use client";

import { AnimatePresence } from "framer-motion";
import { useState } from "react";
import { BattleCutscene } from "@/app/components/cutscene/BattleCutscene";
import { LevelUpScene } from "@/app/components/cutscene/MomentScenes";
import type { Actor, CutsceneEvent } from "@/lib/combat/cutscene";

const hero = (name: string, type: string): Actor => ({ name, party: true, look: { k: "hero", type } });
const foe = (name: string, type: string): Actor => ({ name, party: false, look: { k: "monster", type } });

const SCENES: Record<string, CutsceneEvent> = {
  start: { kind: "start", name: "Wolves on the road", party: [hero("Brannoch", "fighter"), hero("Mirela", "wizard"), hero("Tamsin", "rogue")], foes: [foe("Dire wolf", "beast"), foe("Wolf", "beast")] },
  slash: { kind: "hit", attacker: hero("Brannoch", "fighter"), target: foe("Dire wolf", "beast"), amount: 9, big: false, killed: false, fx: "slash" },
  magic: { kind: "hit", attacker: hero("Mirela", "wizard"), target: foe("Skeleton", "undead"), amount: 14, big: true, killed: false, fx: "magic" },
  fire: { kind: "hit", attacker: foe("Ember drake", "dragon"), target: hero("Orsolo", "cleric"), amount: 22, big: true, killed: false, fx: "fire" },
  arrow: { kind: "hit", attacker: hero("Tamsin", "ranger"), target: foe("Goblin", "humanoid"), amount: 6, big: false, killed: false, fx: "arrow" },
  kill: { kind: "hit", attacker: hero("Brannoch", "fighter"), target: foe("Goblin boss", "humanoid"), amount: 12, big: true, killed: true, fx: "slash" },
  heal: { kind: "heal", target: hero("Brannoch", "fighter"), amount: 8 },
  victory: { kind: "end", result: "victory", name: "Wolves on the road", party: [hero("Brannoch", "fighter"), hero("Mirela", "wizard"), hero("Tamsin", "rogue")] },
  defeat: { kind: "end", result: "defeat", name: "Wolves on the road", party: [hero("Brannoch", "fighter"), hero("Mirela", "wizard"), hero("Tamsin", "rogue")] },
};

export function Lab() {
  const [scene, setScene] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap gap-3">
      {[...Object.keys(SCENES), "levelup"].map((k) => (
        <button key={k} type="button" onClick={() => setScene(k)} className="rounded border border-border px-4 py-2 capitalize hover:border-gold">
          {k}
        </button>
      ))}
      <AnimatePresence>
        {scene && scene !== "levelup" && <BattleCutscene key={scene} event={SCENES[scene]} encounterName="Wolves on the road" onDone={() => setScene(null)} />}
        {scene === "levelup" && <LevelUpScene name="Mirela" classIndex="wizard" level={4} gained={["Hit points +5", "Ability Score Improvement"]} onDone={() => setScene(null)} />}
      </AnimatePresence>
    </div>
  );
}
