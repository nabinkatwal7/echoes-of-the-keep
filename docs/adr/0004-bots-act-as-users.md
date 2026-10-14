# ADR 0004: Computer players act through the normal actions as their own users

**Status:** accepted.

## Context

Solo play needs a computer Dungeon Master and computer heroes. They must move, attack, cast, rest, hand out experience and level up. The app already has server actions for all of this, each checking the signed-in person's rights (a player may act only for their own hero on their own turn; only the DM may start an encounter or award experience).

Two designs were possible:

1. Write separate "bot" code paths that change the database directly.
2. Let the bot perform the same actions a person would.

## Decision

Option 2. Each computer player is a real `User` row with `isBot = true` and no usable password (`passwordHash = "!"`). It owns its hero or, for the computer DM, owns the campaign. `lib/actAs.ts` provides `runAs(bot, fn)`, which stores the bot in an `AsyncLocalStorage`; `requireUser()` and `getUser()` return it for the duration of `fn`.

The planners (`planHeroTurn`, `planMonsterTurn`) are pure functions that return a list of steps. A thin layer (`lib/combat/autoActions.ts`) runs each step through the existing actions: `moveCombatant`, `attack`, `castInCombat`, `takeAction`, `endTurn`, `runMonsterTurn`, `endEncounter`.

## Consequences

- Every rule, range check, slot spend, economy check and permission check applies to the computer exactly as to a person. There is one implementation of each rule, so a bug fix helps both.
- Everything a bot does lands in the same event log with the same undo snapshots.
- `runAs` is a security-sensitive function: whoever calls it can act as any user. It is a plain function (not a server action, so it cannot be called from a browser), and the only callers are server modules that have first verified that the signed-in person is the human of that solo game (`mySolo()` in `lib/solo/actions.ts` and the check at the top of `autoStep`).
- Bots cannot sign in: nothing hashes to `"!"`, and the login form never reaches a bot's username.
- Tests that mock `requireUser` must also honour `actingAs()` (see `tests/db.ts`).
- Bot accounts must be cleaned up with their games (`lib/solo/cleanup.ts`, called when a game or an account is deleted).
- The computer is bound by the same limits as the actions. Anything the actions cannot do (for example, a monster casting a spell) the computer cannot do either, until the action supports it.
