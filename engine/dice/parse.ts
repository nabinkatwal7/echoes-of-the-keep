export type DiceTerm = {
  sign: 1 | -1;
  count: number;
  sides: number;
  /** keep highest/lowest N dice (4d6kh3 drops the lowest) */
  keep?: { mode: "h" | "l"; n: number };
};

export type DiceExpression = {
  terms: DiceTerm[];
  modifier: number;
  source: string;
};

const TERM = /^([+-]?)(?:(\d*)d(\d+|%)(?:k([hl])(\d+))?|(\d+))/i;

/** Parses expressions like "2d6+3", "d20", "4d6kh3", "1d8+1d6-2", "d%". */
export function parseDice(input: string): DiceExpression {
  const source = input.replace(/\s+/g, "");
  if (!source) throw new Error("Empty dice expression");
  const terms: DiceTerm[] = [];
  let modifier = 0;
  let rest = source;
  while (rest) {
    const m = TERM.exec(rest);
    if (!m || (m[1] === "" && rest !== source))
      throw new Error(`Invalid dice expression: "${input}"`);
    const sign = m[1] === "-" ? -1 : 1;
    if (m[6] !== undefined) {
      modifier += sign * Number(m[6]);
    } else {
      const count = m[2] === "" ? 1 : Number(m[2]);
      const sides = m[3] === "%" ? 100 : Number(m[3]);
      if (count < 1 || count > 100)
        throw new Error(`Dice count out of range in "${input}"`);
      if (sides < 2 || sides > 1000)
        throw new Error(`Dice sides out of range in "${input}"`);
      const term: DiceTerm = { sign, count, sides };
      if (m[4]) {
        const n = Number(m[5]);
        if (n < 1 || n > count)
          throw new Error(`Invalid keep count in "${input}"`);
        term.keep = { mode: m[4].toLowerCase() as "h" | "l", n };
      }
      terms.push(term);
    }
    rest = rest.slice(m[0].length);
  }
  return { terms, modifier, source };
}
