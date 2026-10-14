# Security and privacy review

Reviewed at the end of the build. Findings are listed with what was done.

## Authentication and sessions

| Area | State |
| --- | --- |
| Sign-in | Username and password only, no third-party providers |
| Password storage | scrypt with a random 16-byte salt per password; cost parameters are stored in the hash (`lib/password.ts`) |
| Password rules | At least 8 characters; usernames 3-24 characters of `a-z 0-9 _` |
| Guessing | In-memory throttle: 5 failures per username in 10 minutes. **Single instance only.** With several instances move the counter to the database or a shared cache |
| Sessions | JWT sessions signed with `AUTH_SECRET`, 30-day lifetime. Changing the secret signs everyone out |
| Account changes | Changing the password needs the current password. Deleting the account needs the password and the exact username |

## Authorization

Every server action calls `requireUser()` and then checks the person's role for the thing they touch:

- Characters: owner, or the DM of a campaign the character is attached to (`lib/characters/access.ts`).
- Campaign data: membership first, then DM-only checks for combat setup, the clock, rewards, world editing and the stash.
- Combat: players act only for their own hero, and only on their turn (reactions any time).
- Database tests in `tests/*.db.test.ts` cover the negative cases: non-members, other players, players using DM actions.

## Information hiding

- Secret rolls, DM whispers and player-to-player whispers are filtered **on the server** before they reach the event stream (`lib/campaigns/visibility.ts`).
- Combat views never send monster hit points, armor class or hidden creatures to players (`lib/combat/view.ts`).
- Combat undo snapshots contain full monster rows. They are removed from every event payload before it leaves the server (`stripPrivate` in `lib/campaigns/queries.ts`). *This was found and fixed during development.*
- Unrevealed NPCs, places and quests are not loaded for players at all.

## Input handling

- Dice expressions, damage dice, amounts, ranges and text lengths are validated on the server in every action.
- Scene images must be https links to image files; the image is shown with `referrerPolicy="no-referrer"`.
- User text is rendered as text by React. There is no `dangerouslySetInnerHTML` of user content.
- Character import is parsed with a schema and has a size limit (200 KB).

## Transport and browser protections

`next.config.ts` sends a Content-Security-Policy (`default-src 'self'`, no framing, no plugins, forms only to this site), `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, and HSTS in production. The CSP allows inline scripts because Next.js emits them; moving to nonces is a future hardening step.

## Known gaps and recommendations

1. The login throttle is per process (see above).
2. There is no email on accounts, so there is **no password recovery**. A DM cannot reset a player's password. Add recovery or an admin reset before a public launch.
3. No rate limit on registration or on chat and roll actions. Put a reverse proxy rate limit in front, or add one per user in `postMessage`.
4. The CSP uses `'unsafe-inline'` for scripts and styles.
5. Backups are not encrypted by the provided script. Encrypt them if they leave the machine.

## Privacy

The app stores a username, a display name, a password hash, the characters and campaign content people create, and the last time a member opened a table (for the "who is here" dots). It sets one session cookie. There is no analytics, advertising or third-party script. People can download all their data and delete their account from the Account page.
