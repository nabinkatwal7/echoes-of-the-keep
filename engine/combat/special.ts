/** Recharge and legendary actions, read from a stat block (Basic Rules monster format). */

export type RechargeAbility = {
  name: string;
  /** the d6 must meet or beat this (a 5–6 recharge stores 5) */
  min: number;
  ready: boolean;
  dice?: string;
  damageType?: string;
  saveDc?: number;
  /** "str" | "dex" | "con" | "int" | "wis" | "cha" */
  saveAbility?: string;
};

export type LegendaryOption = { name: string; cost: number };

export type LegendaryState = { max: number; left: number; pending?: boolean; options: LegendaryOption[] };

const SAVE_KEY: Record<string, string> = {
  strength: "str", dexterity: "dex", constitution: "con", intelligence: "int", wisdom: "wis", charisma: "cha",
};

/**
 * "Breath Weapons (Recharge 5–6)". Damage and the save, if the next sentences state them, are kept so the
 * ability can be rolled. The ability starts ready.
 */
export function parseRecharge(text: string): RechargeAbility[] {
  const body = text.replace(/\s+/g, " ");
  const out: RechargeAbility[] = [];
  const re = /([A-Z][A-Za-z'’ -]{0,40}?)\s*\(Recharge\s*(\d)\s*[–—-]\s*6\)/g;
  for (const m of body.matchAll(re)) {
    const window = body.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 500);
    const save = /DC\s*(\d+)\s*(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)/i.exec(window);
    const dmg = /(\d+d\d+(?:\s*[+-]\s*\d+)?)\)?\s+(\w+)\s+damage/i.exec(window);
    out.push({
      name: m[1].trim(),
      min: Number(m[2]),
      ready: true,
      ...(dmg ? { dice: dmg[1].replace(/\s+/g, ""), damageType: dmg[2].toLowerCase() } : {}),
      ...(save ? { saveDc: Number(save[1]), saveAbility: SAVE_KEY[save[2].toLowerCase()] } : {}),
    });
  }
  return out;
}

/** At the start of the monster's turn, each spent ability rolls a d6 and returns on a high enough result. */
export function rechargeRoll(abilities: RechargeAbility[], d6: () => number): { abilities: RechargeAbility[]; lines: string[] } {
  const lines: string[] = [];
  const next = abilities.map((a) => {
    if (a.ready) return a;
    const n = d6();
    const ready = n >= a.min;
    lines.push(`${a.name} rolls a ${n} to recharge${ready ? " and is ready" : " and stays spent"}`);
    return { ...a, ready };
  });
  return { abilities: next, lines };
}

export function spendRecharge(abilities: RechargeAbility[], name: string): RechargeAbility[] | null {
  const i = abilities.findIndex((a) => a.name.toLowerCase() === name.toLowerCase());
  if (i < 0 || !abilities[i].ready) return null;
  const next = abilities.slice();
  next[i] = { ...next[i], ready: false };
  return next;
}

/** "The dragon can take 3 legendary actions" plus named options. Options without a cost are 1. */
export function parseLegendary(text: string): LegendaryState | null {
  const body = text.replace(/\s+/g, " ");
  const head = /can take (\d+|one|two|three) legendary actions/i.exec(body);
  if (!head) return null;
  const words: Record<string, number> = { one: 1, two: 2, three: 3 };
  const max = words[head[1].toLowerCase()] ?? Number(head[1]);
  const section = body.slice(head.index ?? 0);
  const options: LegendaryOption[] = [];
  const seen = new Set<string>();
  for (const m of section.matchAll(/([A-Z][A-Za-z'’ -]{1,30}?)\s*\(Costs (\d) Actions?\)/g)) {
    const name = m[1].trim();
    if (seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    options.push({ name, cost: Number(m[2]) });
  }
  for (const m of section.matchAll(/(?:^|\.\s+)([A-Z][A-Za-z'’ -]{1,24})\. The /g)) {
    const name = m[1].trim();
    if (seen.has(name.toLowerCase()) || /^(legendary|only)$/i.test(name)) continue;
    seen.add(name.toLowerCase());
    options.push({ name, cost: 1 });
  }
  return { max, left: max, options };
}

export function spendLegendary(state: LegendaryState, cost: number): LegendaryState | null {
  if (state.pending || state.left < cost || cost < 1) return null;
  return { ...state, left: state.left - cost, pending: true };
}

export function resetLegendary(state: LegendaryState): LegendaryState {
  return { ...state, left: state.max, pending: false };
}
