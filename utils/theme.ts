export type ThemePref = "system" | "light" | "dark";

export const THEME_KEY = "emberhall-theme";

/** Which theme a stored preference means right now ("system" follows the device). */
export function resolveTheme(pref: ThemePref, prefersLight: boolean): "light" | "dark" {
  return pref === "system" ? (prefersLight ? "light" : "dark") : pref;
}

/** Anything other than an explicit light or dark choice counts as "follow the device". */
export function parsePref(value: string | null | undefined): ThemePref {
  return value === "light" || value === "dark" ? value : "system";
}
