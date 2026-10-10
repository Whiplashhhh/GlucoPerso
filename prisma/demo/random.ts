/** Small seeded PRNG so the demo data is the same on every run. */
export type Rng = {
  /** Uniform float in [0, 1). */
  next: () => number;
  /** Uniform float in [min, max). */
  between: (min: number, max: number) => number;
  /** Uniform integer in [min, max], both included. */
  int: (min: number, max: number) => number;
  /** True with probability `p`. */
  chance: (p: number) => boolean;
  pick: <T>(items: readonly T[]) => T;
  /** Picks an item with probability proportional to its weight. */
  weighted: <T>(items: readonly (readonly [T, number])[]) => T;
};

/** mulberry32: tiny, fast and good enough for demo data (not for secrets). */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const between = (min: number, max: number) => min + (max - min) * next();
  const int = (min: number, max: number) => Math.floor(between(min, max + 1));
  const pick = <T>(items: readonly T[]): T => {
    const item = items[Math.floor(next() * items.length)];
    if (item === undefined) throw new Error("pick() needs at least one item");
    return item;
  };
  const weighted = <T>(items: readonly (readonly [T, number])[]): T => {
    const total = items.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = next() * total;
    for (const [item, weight] of items) {
      roll -= weight;
      if (roll < 0) return item;
    }
    const last = items[items.length - 1];
    if (last === undefined) throw new Error("weighted() needs at least one item");
    return last[0];
  };
  return { next, between, int, chance: (p) => next() < p, pick, weighted };
}

/** Rounds to the nearest multiple of `step` (pen increments, ratios). */
export function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** Rounds a glucose reading in g/L to two decimals. */
export function roundGlucose(value: number): number {
  return Math.round(value * 100) / 100;
}
