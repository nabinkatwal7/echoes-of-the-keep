# Accessibility review (WCAG 2.2 AA)

A manual review against the success criteria that matter most for this interface, plus the code changes it led to. It has **not** been checked with a screen reader on every page or with an automated scanner such as axe; do both before a public launch.

## What is in place

| Criterion | How |
| --- | --- |
| 1.1.1 Non-text content | Decorative icons are `aria-hidden`; the map backdrop and scene images have descriptive `alt` text; the d20 mark is labelled |
| 1.3.1 Info and relationships | Forms use `label` elements through the `Field` component; tab strips use `role="tablist"` and `aria-selected`; the battle map is a `grid` with labelled cells; the chronicle is `role="log"` with `aria-live="polite"` |
| 1.4.1 Use of color | Health, conditions and online status always include text ("Bloodied", "poisoned", "is here"), not color alone |
| 1.4.3 Contrast | The dark theme uses light parchment text (`#eadfc6`) on near-black (`#100c08`); muted text is `#a8997c` on the same background (about 7:1). Badge text colors were chosen from the same palette |
| 1.4.10 Reflow | Layouts collapse to one column at phone width; wide tables scroll inside their own container |
| 2.1.1 Keyboard | Everything is a button, link or form control. The map can be driven by keyboard because each square is a button |
| 2.4.1 Bypass blocks | "Skip to content" link as the first focusable element (`app/layout.tsx`) |
| 2.4.3 Focus order | Source order matches visual order |
| 2.4.7 Focus visible | Global `:focus-visible` ring in `app/globals.css` |
| 2.5.8 Target size | Buttons are at least 44 px tall (`min-h-11`); compact secondary buttons are 36 px, which still meets the 24 px AA minimum |
| 2.3.3 / motion | `prefers-reduced-motion` turns off animation |
| 1.4.3 / 1.4.11 contrast option | Footer toggles a higher-contrast palette and Atkinson Hyperlegible (“Plain type”), remembered in this browser |
| 3.3.1 / 3.3.3 Errors | Server errors appear next to the form in an element with `role="alert"`; messages say what to fix |
| 4.1.3 Status messages | Success and progress messages use `role="status"` |

## Known gaps

1. The battle map and the exploration map both include a text list of who stands where, as well as a name on each square.
2. Drag-free movement means moving a token is two clicks (select, then choose a square). That is accessible, but slow for long moves.
3. Counterspell uses two number fields (the incoming spell's level, and the slot you spend) instead of browser prompts.
4. Dice results in the chronicle are announced as a whole line; they could be shortened for speech.
5. Not yet tested at 200% text zoom on every page, or with Windows high-contrast mode.

## Automated scan

`pnpm e2e` runs axe-core (WCAG 2.0, 2.1 and 2.2 A/AA rules) on the public pages and, with the demo data seeded (`pnpm exec tsx scripts/demo-seed.ts`), on the heroes, account, campaign, table, combat, DM screen, world and journal pages. All pass. The first run found a real problem: the battle and exploration maps used `role="grid"` without rows, which screen readers cannot navigate. They are now labelled groups of buttons.

## How to check

1. Tab through each page and confirm focus is visible and nothing is skipped.
2. Run axe DevTools or Lighthouse on `/`, `/learn`, `/characters/new`, a character sheet, the table and the combat page.
3. Use NVDA (Windows) or VoiceOver (macOS) to create a character and make one attack in combat.
