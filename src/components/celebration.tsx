"use client";

import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useMemo } from "react";
import { Sparkle, Star } from "@/components/illustrations/buddies";
import { cn } from "@/lib/cn";

const COLORS = ["#f08a6c", "#57b886", "#9a84dc", "#e9a640", "#ffd36e", "#f57d8b"];

type Piece = {
  x: number;
  delay: number;
  rotate: number;
  color: string;
  size: number;
  round: boolean;
};

function pieces(count: number, seed: number): Piece[] {
  // Deterministic pseudo-random so renders stay pure.
  let state = seed;
  const random = () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
  return Array.from({ length: count }, (_, i) => ({
    x: random() * 100,
    delay: random() * 0.25,
    rotate: random() * 540 - 270,
    color: COLORS[i % COLORS.length] ?? "#f08a6c",
    size: 7 + random() * 7,
    round: random() > 0.55,
  }));
}

const HALO = {
  amber: "bg-amber-soft",
  coral: "bg-coral-soft",
  mint: "bg-mint-soft",
  lavender: "bg-lavender-soft",
  sky: "bg-sky-soft",
} as const;

/**
 * A buddy on a soft halo with a few static sparkles around it. Static on
 * purpose: it still feels festive with reduced motion, when confetti is off.
 */
export function CheerArt({
  children,
  tone = "amber",
  sparkles = true,
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof HALO;
  sparkles?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative isolate grid place-items-center", className)}>
      <span
        aria-hidden="true"
        className={cn("absolute inset-[-14%] -z-10 rounded-full opacity-90 blur-md", HALO[tone])}
      />
      {sparkles && (
        <>
          <Sparkle className="absolute -top-3 -left-4 w-5 text-coral" />
          <Star className="absolute top-1 -right-6 w-6 rotate-12" />
          <Sparkle className="absolute -right-2 -bottom-1 w-3.5 text-amber" />
          <Sparkle className="absolute bottom-3 -left-7 w-3 text-lavender" />
        </>
      )}
      {children}
    </div>
  );
}

/** Light confetti burst + a gentle haptic tap when available. */
export function Celebration({ seed = 7, count = 36 }: { seed?: number; count?: number }) {
  const reduce = useReducedMotion();
  const items = useMemo(() => pieces(count, seed), [count, seed]);

  useEffect(() => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator)
      navigator.vibrate?.([18, 40, 18]);
  }, []);

  if (reduce) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {items.map((piece, index) => (
        <motion.span
          key={index}
          className="absolute top-0 block"
          style={{
            left: `${piece.x}%`,
            width: piece.size,
            height: piece.round ? piece.size : piece.size * 0.45,
            borderRadius: piece.round ? 999 : 3,
            background: piece.color,
          }}
          initial={{ y: -30, opacity: 1, rotate: 0 }}
          animate={{ y: "105vh", opacity: [1, 1, 0], rotate: piece.rotate, x: [0, 18, -12, 8] }}
          transition={{ duration: 2.2 + piece.delay * 2, delay: piece.delay, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}
