/**
 * Original hand-drawn SVG characters for GlucoPerso: little foods with faces,
 * a sun, clouds and stars. Flat shapes with soft shading so they read well in
 * light and dark mode. All decorative (aria-hidden).
 */
import type { SVGProps } from "react";

type BuddyProps = SVGProps<SVGSVGElement> & { mood?: Mood };
type Mood = "happy" | "joy" | "calm" | "wink";

const INK = "#3a2930";
const BLUSH = "#ff8e8e";

function Svg({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden="true" focusable="false" {...props}>
      {children}
    </svg>
  );
}

/** Shared cute face, centred on (x, y). */
export function Face({
  x,
  y,
  s = 1,
  mood = "happy",
}: {
  x: number;
  y: number;
  s?: number;
  mood?: Mood;
}) {
  const eye = (cx: number) =>
    mood === "joy" ? (
      <path
        key={cx}
        d={`M${cx - 3} 1 q3 -4.5 6 0`}
        stroke={INK}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    ) : mood === "calm" ? (
      <path
        key={cx}
        d={`M${cx - 3} -0.5 q3 3 6 0`}
        stroke={INK}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    ) : (
      <g key={cx}>
        <ellipse cx={cx} cy={0} rx={2.5} ry={3.1} fill={INK} />
        <circle cx={cx + 0.8} cy={-1.1} r={0.85} fill="#fff" />
      </g>
    );
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {mood === "wink" ? (
        <>
          {eye(-8)}
          <path d="M5 0.5 q3 -3 6 0" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
        </>
      ) : (
        <>
          {eye(-8)}
          {eye(8)}
        </>
      )}
      <path
        d={mood === "joy" ? "M-4.5 5 q4.5 6 9 0 z" : "M-4 5.2 q4 4 8 0"}
        stroke={INK}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={mood === "joy" ? "#c2524f" : "none"}
      />
      <ellipse cx={-13.5} cy={5} rx={4.2} ry={2.6} fill={BLUSH} opacity={0.5} />
      <ellipse cx={13.5} cy={5} rx={4.2} ry={2.6} fill={BLUSH} opacity={0.5} />
    </g>
  );
}

/** The GlucoPerso mascot: a soft little peach. */
export function Peach({ mood = "happy", ...props }: BuddyProps) {
  return (
    <Svg {...props}>
      <path
        d="M50 24C31 19 13 34 15 57c2 21 18 33 35 33s33-12 35-33c2-23-16-38-35-33Z"
        fill="#f9a283"
      />
      <path
        d="M85 57c-2 21-18 33-35 33-12 0-23-6-29-17 9 7 19 9 29 9 17 0 30-9 35-25Z"
        fill="#ee8466"
      />
      <path d="M50 26c-6 11-6 25-2 36" stroke="#e77a5c" strokeWidth={2.4} strokeLinecap="round" />
      <ellipse
        cx={31}
        cy={42}
        rx={6}
        ry={9.5}
        fill="#fff"
        opacity={0.35}
        transform="rotate(-24 31 42)"
      />
      <path d="M50 25c0-5-1-9-3-12" stroke="#8a5a3c" strokeWidth={3.2} strokeLinecap="round" />
      <path d="M51 23c5-11 18-14 26-10-4 10-15 14-26 10Z" fill="#7cc79a" />
      <path d="M54 21c6-3 12-5 19-6" stroke="#5aa878" strokeWidth={1.6} strokeLinecap="round" />
      <Face x={56} y={60} mood={mood} />
    </Svg>
  );
}

export function Sun({ mood = "joy", ...props }: BuddyProps) {
  const rays = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * Math.PI) / 6;
    const r1 = 32;
    const r2 = i % 2 === 0 ? 42 : 39;
    return (
      <line
        key={i}
        x1={50 + r1 * Math.cos(angle)}
        y1={50 + r1 * Math.sin(angle)}
        x2={50 + r2 * Math.cos(angle)}
        y2={50 + r2 * Math.sin(angle)}
        stroke="#ffc65a"
        strokeWidth={5}
        strokeLinecap="round"
      />
    );
  });
  return (
    <Svg {...props}>
      {rays}
      <circle cx={50} cy={50} r={25} fill="#ffd774" />
      <path d="M75 50a25 25 0 0 1-46 13c9 6 26 8 36-1 6-5 9-9 10-12Z" fill="#ffc65a" />
      <ellipse
        cx={40}
        cy={38}
        rx={5}
        ry={3}
        fill="#fff"
        opacity={0.45}
        transform="rotate(-30 40 38)"
      />
      <Face x={50} y={52} mood={mood} />
    </Svg>
  );
}

export function Cloud({ mood = "calm", ...props }: BuddyProps) {
  return (
    <Svg {...props}>
      <path
        d="M27 72c-12 0-17-12-8-19-1-12 12-19 21-13 5-12 25-13 30 2 12-2 20 9 13 18 4 8-3 13-9 12H27Z"
        fill="var(--surface)"
        stroke="var(--line)"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Face x={50} y={57} s={0.8} mood={mood} />
    </Svg>
  );
}

export function Star({ face = false, ...props }: SVGProps<SVGSVGElement> & { face?: boolean }) {
  return (
    <Svg {...props}>
      <path
        d="M50 14l10.6 21.5 23.7 3.4-17.1 16.7 4 23.6L50 68 28.8 79.2l4-23.6-17.1-16.7 23.7-3.4Z"
        fill="#ffd36e"
        stroke="#ffd36e"
        strokeWidth={9}
        strokeLinejoin="round"
      />
      {face && <Face x={50} y={50} s={0.75} mood="joy" />}
    </Svg>
  );
}

export function Sparkle(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path
        d="M50 12c3 22 13 33 38 38-25 5-35 16-38 38-3-22-13-33-38-38 25-5 35-16 38-38Z"
        fill="currentColor"
      />
    </Svg>
  );
}

export function Croissant({ mood = "happy", ...props }: BuddyProps) {
  return (
    <Svg {...props}>
      <ellipse cx={17} cy={66} rx={8} ry={11} fill="#e9a04a" transform="rotate(-58 17 66)" />
      <ellipse cx={83} cy={66} rx={8} ry={11} fill="#e9a04a" transform="rotate(58 83 66)" />
      <ellipse cx={31} cy={60} rx={12} ry={17} fill="#f2b45e" transform="rotate(-38 31 60)" />
      <ellipse cx={69} cy={60} rx={12} ry={17} fill="#f2b45e" transform="rotate(38 69 60)" />
      <ellipse cx={50} cy={56} rx={17} ry={22} fill="#f7c472" />
      <path d="M36 48c9-5 19-5 28 0" stroke="#e59d47" strokeWidth={2} strokeLinecap="round" />
      <path
        d="M24 58c3-3 8-4 12-3M76 58c-3-3-8-4-12-3"
        stroke="#e59d47"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <ellipse
        cx={43}
        cy={42}
        rx={5}
        ry={3}
        fill="#fff"
        opacity={0.4}
        transform="rotate(-20 43 42)"
      />
      <Face x={50} y={61} s={0.85} mood={mood} />
    </Svg>
  );
}

export function Apple({ mood = "happy", ...props }: BuddyProps) {
  return (
    <Svg {...props}>
      <path
        d="M50 33c-10-8-32-5-32 21 0 22 16 35 32 31 16 4 32-9 32-31 0-26-22-29-32-21Z"
        fill="#f47f6f"
      />
      <path
        d="M82 54c0 22-16 35-32 31-11 3-22-3-28-14 8 6 18 8 28 6 14 2 27-7 32-23Z"
        fill="#e66b5c"
      />
      <path d="M50 33c0-6 1-11 4-15" stroke="#8a5a3c" strokeWidth={3.2} strokeLinecap="round" />
      <path d="M55 24c4-8 14-10 20-7-3 8-12 11-20 7Z" fill="#7cc79a" />
      <ellipse
        cx={32}
        cy={44}
        rx={5}
        ry={8}
        fill="#fff"
        opacity={0.35}
        transform="rotate(-25 32 44)"
      />
      <Face x={50} y={58} mood={mood} />
    </Svg>
  );
}

export function Avocado({ mood = "happy", ...props }: BuddyProps) {
  return (
    <Svg {...props}>
      <path
        d="M50 10C33 10 24 37 20 57c-4 22 12 35 30 35s34-13 30-35C76 37 67 10 50 10Z"
        fill="#5f9f6f"
      />
      <path
        d="M50 17C37 17 30 39 27 57c-3 18 9 28 23 28s26-10 23-28C70 39 63 17 50 17Z"
        fill="#d9eeaa"
      />
      <circle cx={50} cy={64} r={13} fill="#b9784a" />
      <ellipse
        cx={45}
        cy={59}
        rx={4}
        ry={2.5}
        fill="#fff"
        opacity={0.35}
        transform="rotate(-30 45 59)"
      />
      <Face x={50} y={39} s={0.7} mood={mood} />
    </Svg>
  );
}

export function Toast({ mood = "happy", ...props }: BuddyProps) {
  return (
    <Svg {...props}>
      <path
        d="M22 42c-9-17 9-28 28-25 19-3 37 8 28 25v38c0 6-3 9-9 9H31c-6 0-9-3-9-9V42Z"
        fill="#da9650"
      />
      <path
        d="M29 44c-6-11 7-19 21-17 14-2 27 6 21 17v34c0 3-2 5-5 5H34c-3 0-5-2-5-5V44Z"
        fill="#f6d39a"
      />
      <rect
        x={41}
        y={30}
        width={17}
        height={12}
        rx={4}
        fill="#fff1b8"
        transform="rotate(-8 49 36)"
      />
      <Face x={50} y={62} s={0.9} mood={mood} />
    </Svg>
  );
}

export function Strawberry({ mood = "happy", ...props }: BuddyProps) {
  return (
    <Svg {...props}>
      <path
        d="M50 89C30 81 17 59 21 43c4-12 18-12 29-8 11-4 25-4 29 8 4 16-9 38-29 46Z"
        fill="#f57d8b"
      />
      {[
        [33, 50],
        [67, 50],
        [40, 70],
        [60, 70],
        [50, 80],
        [29, 62],
        [71, 62],
      ].map(([cx, cy]) => (
        <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx={1.4} ry={2.1} fill="#ffe3a3" />
      ))}
      <path d="M50 38l-8-10 8 3 0-9 3 9 8-4-6 9 10 1-10 4Z" fill="#6dbb86" strokeLinejoin="round" />
      <Face x={50} y={56} s={0.85} mood={mood} />
    </Svg>
  );
}

export function Bowl({ mood = "happy", ...props }: BuddyProps) {
  return (
    <Svg {...props}>
      <path
        d="M34 30c-3-5 3-8 0-13M50 28c-3-5 3-8 0-13M66 30c-3-5 3-8 0-13"
        stroke="var(--ink-faint)"
        strokeWidth={2.4}
        strokeLinecap="round"
        opacity={0.55}
      />
      <path d="M18 50c4-10 18-14 32-14s28 4 32 14H18Z" fill="#ffe0a1" />
      <circle cx={36} cy={44} r={4} fill="#7cc79a" />
      <circle cx={60} cy={42} r={5} fill="#f47f6f" />
      <path d="M14 50h72c0 22-17 36-36 36S14 72 14 50Z" fill="#f08a6c" />
      <path
        d="M86 50c0 22-17 36-36 36-11 0-21-5-28-13 7 4 15 6 23 6 20 0 37-12 41-29Z"
        fill="#e0694a"
      />
      <rect x={12} y={47} width={76} height={6} rx={3} fill="#f6a088" />
      <Face x={50} y={66} s={0.85} mood={mood} />
    </Svg>
  );
}

export function Cupcake({ mood = "happy", ...props }: BuddyProps) {
  return (
    <Svg {...props}>
      <path d="M26 56h48l-6 30H32Z" fill="#a990e6" />
      <path d="M38 56l2 30M50 56v30M62 56l-2 30" stroke="#8f74d6" strokeWidth={2.4} />
      <path
        d="M22 58c-4-8 3-14 9-13 0-10 10-15 19-11 6-8 20-5 21 5 8-1 13 8 8 15 3 4 0 6-3 6H25c-3 0-5-1-3-2Z"
        fill="#ffd3e1"
      />
      <circle cx={52} cy={24} r={6} fill="#f47f6f" />
      <path d="M53 18c1-4 3-6 6-7" stroke="#8a5a3c" strokeWidth={2} strokeLinecap="round" />
      <Face x={50} y={70} s={0.75} mood={mood} />
    </Svg>
  );
}
