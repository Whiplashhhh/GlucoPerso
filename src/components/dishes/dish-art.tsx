import {
  Apple,
  Avocado,
  Bowl,
  Croissant,
  Cupcake,
  Peach,
  Strawberry,
  Toast,
} from "@/components/illustrations/buddies";
import { OutcomeDot } from "@/components/outcome-dot";
import { cn } from "@/lib/cn";
import { photoUrl } from "@/lib/dishes";
import type { Outcome } from "@/lib/glucose";

const BUDDIES = [Bowl, Croissant, Avocado, Toast, Strawberry, Apple, Cupcake, Peach] as const;
const TINTS = [
  "bg-coral-soft",
  "bg-amber-soft",
  "bg-mint-soft",
  "bg-lavender-soft",
  "bg-sky-soft",
] as const;

/** Small stable hash so a dish always gets the same little buddy. */
function pick(id: string, size: number) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % size;
}

/** A cute, stable illustration on a soft tint, for dishes without a photo. */
export function DishArt({ dishId, className }: { dishId: string; className?: string }) {
  const Buddy = BUDDIES[pick(dishId, BUDDIES.length)] ?? Bowl;
  return (
    <div
      className={cn("grid place-items-center", TINTS[pick(`${dishId}~`, TINTS.length)], className)}
    >
      <Buddy className="h-[72%] w-[72%]" mood={pick(dishId, 3) === 0 ? "joy" : "happy"} />
    </div>
  );
}

/** Latest meal photo, or the dish's illustration. */
export function DishPicture({
  dishId,
  photoId,
  className,
}: {
  dishId: string;
  photoId: string | null;
  className?: string;
}) {
  if (!photoId) return <DishArt dishId={dishId} className={className} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- authenticated photo route
    <img src={photoUrl(photoId)} alt="" loading="lazy" className={cn("object-cover", className)} />
  );
}

/** Outcomes of the last meals, newest on the right like a little timeline. */
export function RecentOutcomes({
  outcomes,
  size = 12,
  className,
}: {
  outcomes: (Outcome | null)[];
  size?: number;
  className?: string;
}) {
  if (!outcomes.length) return null;
  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      role="group"
      aria-label="Derniers repas"
    >
      {[...outcomes].reverse().map((outcome, index) => (
        <OutcomeDot key={index} outcome={outcome} size={size} />
      ))}
    </span>
  );
}
