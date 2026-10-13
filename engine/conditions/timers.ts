import { CONDITIONS, type Condition } from "./index";

/** A condition on a combatant with an optional duration measured in rounds. */
export type ActiveCondition = {
  condition: Condition;
  /** rounds left; undefined = until removed */
  rounds?: number;
  source?: string;
  /** count down at the end of the creature's own turn (default) or at the start of it */
  expires?: "start" | "end";
};

export const isCondition = (s: string): s is Condition => (CONDITIONS as readonly string[]).includes(s);

/** Add a condition; the same condition from the same source refreshes its timer instead of stacking (App. A). */
export function addCondition(list: ActiveCondition[], add: ActiveCondition): ActiveCondition[] {
  const i = list.findIndex((c) => c.condition === add.condition && c.source === add.source);
  if (i < 0) return [...list, add];
  const next = [...list];
  next[i] = { ...next[i], rounds: Math.max(next[i].rounds ?? 0, add.rounds ?? 0) || undefined, expires: add.expires ?? next[i].expires };
  return next;
}

export const removeCondition = (list: ActiveCondition[], condition: Condition, source?: string): ActiveCondition[] =>
  list.filter((c) => !(c.condition === condition && (source === undefined || c.source === source)));

/** Count down timers at the start or end of a creature's turn; returns what remains and what expired. */
export function tickConditions(list: ActiveCondition[], moment: "start" | "end"): { remaining: ActiveCondition[]; expired: ActiveCondition[] } {
  const remaining: ActiveCondition[] = [];
  const expired: ActiveCondition[] = [];
  for (const c of list) {
    if (c.rounds === undefined || (c.expires ?? "end") !== moment) {
      remaining.push(c);
      continue;
    }
    if (c.rounds - 1 <= 0) expired.push(c);
    else remaining.push({ ...c, rounds: c.rounds - 1 });
  }
  return { remaining, expired };
}

export const conditionSet = (list: ActiveCondition[]): Set<Condition> => new Set(list.map((c) => c.condition));
