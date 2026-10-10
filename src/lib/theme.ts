export const THEME_COOKIE = "gp-theme";
export type ThemeChoice = "system" | "light" | "dark";
export type ThemePreference = "SYSTEM" | "LIGHT" | "DARK";

export const THEME_CHOICES: ThemeChoice[] = ["system", "light", "dark"];

/** Cookie value for a stored preference. */
export function themeChoiceOf(preference: ThemePreference): ThemeChoice {
  return preference === "LIGHT" ? "light" : preference === "DARK" ? "dark" : "system";
}

/** Stored preference for a cookie value. */
export function themePreferenceOf(choice: ThemeChoice): ThemePreference {
  return choice === "light" ? "LIGHT" : choice === "dark" ? "DARK" : "SYSTEM";
}

/** The theme cookie lives a year; it only holds system | light | dark. */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Class for <html>: none follows the system, otherwise forces a theme. */
export function themeClass(value: string | undefined): string | undefined {
  return value === "light" || value === "dark" ? value : undefined;
}
