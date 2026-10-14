import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Solo play: the game's own bot players and bot Dungeon Master act through the same server actions as people, so every rule
 * and permission check still applies to them. `runAs` makes `requireUser()` return the bot for the duration of a call.
 * Only server code that has already checked the human belongs to the solo game may call this; it is never exposed as an action.
 */
type Acting = { id: string; name: string };
const store = new AsyncLocalStorage<Acting>();

export const runAs = <T>(user: Acting, fn: () => Promise<T>): Promise<T> => store.run(user, fn);
export const actingAs = (): Acting | undefined => store.getStore();
