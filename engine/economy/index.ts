export type Coin = "cp" | "sp" | "ep" | "gp" | "pp";
export type Purse = Record<Coin, number>;

/** Value of each coin in copper pieces (PHB p.143): 10 cp = 1 sp, 5 sp = 1 ep, 2 ep = 1 gp, 10 gp = 1 pp. */
export const COPPER_VALUE: Record<Coin, number> = { cp: 1, sp: 10, ep: 50, gp: 100, pp: 1000 };

export const emptyPurse = (): Purse => ({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 });

export const purseValueCp = (p: Purse) => (Object.keys(COPPER_VALUE) as Coin[]).reduce((s, c) => s + p[c] * COPPER_VALUE[c], 0);

/** Parse a cost such as "25 gp" or "1,500 gp" into copper pieces. */
export function parseCostCp(cost: string): number {
  const m = /^\s*([\d,]+)\s*(cp|sp|ep|gp|pp)\s*$/i.exec(cost);
  if (!m) throw new Error(`Cannot parse cost: "${cost}"`);
  return Number(m[1].replace(/,/g, "")) * COPPER_VALUE[m[2].toLowerCase() as Coin];
}

/** Convert copper to coins using the largest denominations (electrum skipped unless asked, as most tables do). */
export function fromCopper(cp: number, useElectrum = false): Purse {
  if (cp < 0) throw new RangeError("Cannot convert a negative amount");
  const purse = emptyPurse();
  let rest = cp;
  for (const coin of (useElectrum ? ["pp", "gp", "ep", "sp", "cp"] : ["pp", "gp", "sp", "cp"]) as Coin[]) {
    purse[coin] = Math.floor(rest / COPPER_VALUE[coin]);
    rest -= purse[coin] * COPPER_VALUE[coin];
  }
  return purse;
}

/** Pay a cost from a purse, making change from higher coins; throws when funds are short. */
export function pay(purse: Purse, costCp: number): Purse {
  const total = purseValueCp(purse);
  if (costCp > total) throw new Error("Not enough money");
  return fromCopper(total - costCp, purse.ep > 0);
}

/** Split a purse as evenly as possible among n characters; the remainder (in copper) stays in the party stash. */
export function splitLoot(purse: Purse, n: number): { share: Purse; remainderCp: number } {
  if (n < 1) throw new RangeError("Need at least one recipient");
  const each = Math.floor(purseValueCp(purse) / n);
  return { share: fromCopper(each), remainderCp: purseValueCp(purse) - each * n };
}

/** Daily cost of a lifestyle, in copper (PHB p.157). Aristocratic is "10 gp minimum". */
export const LIFESTYLE_COST_CP_PER_DAY = {
  wretched: 0, squalid: 10, poor: 20, modest: 100, comfortable: 200, wealthy: 400, aristocratic: 1000,
} as const;
export type Lifestyle = keyof typeof LIFESTYLE_COST_CP_PER_DAY;

export const lifestyleCostCp = (lifestyle: Lifestyle, days: number) => LIFESTYLE_COST_CP_PER_DAY[lifestyle] * days;

/** Selling treasure: gear fetches half its listed price; gems, art and trade goods keep full value (PHB p.144). */
export const sellPriceCp = (listedCp: number, kind: "gear" | "valuable" = "gear") => (kind === "gear" ? Math.floor(listedCp / 2) : listedCp);
