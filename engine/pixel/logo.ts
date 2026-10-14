import type { Sprite } from "./canvas";

/** The Emberhall mark: a hearth fire on a pair of logs. */
export const LOGO: Sprite = {
  rows: [
    "................",
    ".......ee.......",
    "......eeee......",
    "......eyye......",
    ".....eeyyee.....",
    "....eeyyyyee....",
    "....eeyywyee....",
    "...eeeyywyyee...",
    "...eeyywwwyee...",
    "...eeyywwwyee...",
    "..reeyywyyeer...",
    "...reeyyyeer....",
    "....rreeerr.....",
    "..bbbbbbbbbbbb..",
    ".bbddbbbbbbddbb.",
    "..dd........dd..",
  ],
  palette: {
    e: "#e0702f",
    y: "#f6c445",
    w: "#fff3c4",
    r: "#a3283a",
    b: "#6b4a2b",
    d: "#3a2a1a",
  },
};
