import type { Sprite } from "./canvas";

/** The Echoes of the Keep mark: a lit tower with echoes ringing out from it. */
export const LOGO: Sprite = {
  rows: [
    "................",
    "....ll.ll.ll....",
    "....ll.ll.ll....",
    ".b..llllllld..b.",
    "b...lmmmmmmd...b",
    "b.a.lmmyymmd.a.b",
    "ba..lmmywmmd..ab",
    "b.a.lmmyymmd.a.b",
    "b...lmmmmmmd...b",
    ".b..lmmmmmmd..b.",
    "....lmmmmmmd....",
    "....lmmoommd....",
    "....lmmoommd....",
    "...dddddddddd...",
    "................",
    "................",
  ],
  palette: {
    l: "#b5a47e",
    m: "#85735a",
    d: "#55452f",
    y: "#f6c445",
    w: "#fff3c4",
    o: "#2a2016",
    a: "#9db0ff",
    b: "#5f72c9",
  },
};
