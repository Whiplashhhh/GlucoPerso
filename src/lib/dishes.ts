/** Lower-case, accent-free, single-spaced name used for fuzzy matching. */
export function normalizeDishName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Display name: trimmed, single spaces, first letter upper-cased. */
export function cleanDishName(name: string): string {
  const clean = name.trim().replace(/\s+/g, " ");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function photoUrl(photoId: string, size: "thumb" | "full" = "thumb"): string {
  return `/api/photos/${photoId}${size === "thumb" ? "?size=thumb" : ""}`;
}
