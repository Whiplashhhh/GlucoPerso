export const THEME_COOKIE = "gp-theme";
export type ThemeChoice = "system" | "light" | "dark";

/** Class for <html>: none follows the system, otherwise forces a theme. */
export function themeClass(value: string | undefined): string | undefined {
  return value === "light" || value === "dark" ? value : undefined;
}
