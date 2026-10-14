import { existsSync } from "node:fs";
import path from "node:path";

/**
 * True when the handbook extract (content/extracted) is on this machine. The extract is built from a Player's Handbook PDF you
 * supply yourself, so it is not in the repository; tests that read it skip themselves when it is absent.
 */
export const HAS_HANDBOOK = existsSync(path.join(__dirname, "..", "extracted", "structured", "spells.json"));
