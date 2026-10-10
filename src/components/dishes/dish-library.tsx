"use client";

import { Search, Star, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DishPicture, RecentOutcomes } from "@/components/dishes/dish-art";
import { Cloud } from "@/components/illustrations/buddies";
import { inputClass } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { matchesDishQuery } from "@/lib/dishes";
import { formatGrams } from "@/lib/format";
import type { Outcome } from "@/lib/glucose";

export type LibraryDish = {
  id: string;
  name: string;
  isFavorite: boolean;
  photoId: string | null;
  count: number;
  averageCarbs: number | null;
  /** Positive « pile poil » wording, see perfectSummary. */
  perfectLabel: string;
  perfect: number;
  recentOutcomes: (Outcome | null)[];
  /** « hier », « il y a 3 jours »… */
  lastEaten: string;
};

/** Favourites as recipe cards, then every dish as a row, with a live filter. */
export function DishLibrary({ dishes }: { dishes: LibraryDish[] }) {
  const [query, setQuery] = useState("");
  const visible = useMemo(
    () => dishes.filter((dish) => matchesDishQuery(dish.name, query)),
    [dishes, query],
  );
  const favorites = visible.filter((dish) => dish.isFavorite);
  const others = visible.filter((dish) => !dish.isFavorite);
  const filtering = query.trim().length > 0;

  return (
    <div className="flex flex-col gap-7">
      <form role="search" onSubmit={(event) => event.preventDefault()} className="relative">
        <Search
          size={22}
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-faint"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Pâtes, raclette, crêpes…"
          aria-label="Chercher un plat"
          maxLength={80}
          enterKeyHint="search"
          autoComplete="off"
          className={cn(
            inputClass,
            "pr-14 pl-12 shadow-soft [&::-webkit-search-cancel-button]:hidden",
          )}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Effacer la recherche"
            className="absolute inset-y-0 right-1 my-auto grid size-12 place-items-center rounded-2xl text-ink-soft hover:text-ink"
          >
            <X size={22} />
          </button>
        )}
      </form>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[24px] border-2 border-dashed border-line px-6 py-8 text-center">
          <Cloud className="w-24" mood="calm" />
          <p className="font-semibold text-ink-soft">
            Aucun plat ne s&apos;appelle comme ça… pour l&apos;instant !
          </p>
        </div>
      ) : (
        <>
          {(favorites.length > 0 || !filtering) && (
            <section aria-labelledby="favorites-title" className="flex flex-col gap-3">
              <h2 id="favorites-title" className="pl-1 text-2xl font-semibold">
                ⭐ Mes favoris
              </h2>
              {favorites.length ? (
                <ul className="grid grid-cols-2 gap-3" aria-label="Mes favoris">
                  {favorites.map((dish) => (
                    <li key={dish.id}>
                      <FavoriteCard dish={dish} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="flex items-center gap-3 rounded-[22px] bg-amber-soft px-4 py-3.5 font-semibold text-amber-ink">
                  <Star size={22} className="shrink-0" />
                  Touche « Favori » sur un plat pour le retrouver ici et le noter en un geste.
                </p>
              )}
            </section>
          )}

          {others.length > 0 && (
            <section aria-labelledby="all-title" className="flex flex-col gap-3">
              <h2 id="all-title" className="pl-1 text-2xl font-semibold">
                {favorites.length || !filtering ? "Tous mes plats" : "Mes plats"}
              </h2>
              <ul className="flex flex-col gap-2.5" aria-label="Tous mes plats">
                {others.map((dish) => (
                  <li key={dish.id}>
                    <DishRow dish={dish} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function statsLine(dish: LibraryDish) {
  const times = `${dish.count} fois`;
  return dish.averageCarbs === null ? times : `${times} · ~${formatGrams(dish.averageCarbs)}`;
}

function PerfectBadge({ dish }: { dish: LibraryDish }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-extrabold whitespace-nowrap",
        dish.perfect > 0 ? "bg-mint-soft text-mint-ink" : "bg-surface-2 text-ink-soft",
      )}
    >
      {dish.perfectLabel}
    </span>
  );
}

function FavoriteCard({ dish }: { dish: LibraryDish }) {
  return (
    <Link
      href={`/plats/${dish.id}`}
      aria-label={`${dish.name}, ${statsLine(dish)}`}
      className="flex h-full flex-col overflow-hidden rounded-[24px] bg-surface shadow-soft transition-transform active:scale-[0.98]"
    >
      <div className="relative">
        <DishPicture
          dishId={dish.id}
          photoId={dish.photoId}
          className="aspect-[5/4] w-full rounded-b-[18px]"
        />
        <span
          aria-hidden="true"
          className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-surface/90 text-amber shadow-soft"
        >
          <Star size={17} fill="currentColor" strokeWidth={2} />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-3.5 pt-2.5 pb-3.5">
        <p className="line-clamp-2 font-display text-lg leading-snug font-semibold text-ink">
          {dish.name}
        </p>
        <p className="text-sm font-semibold text-ink-soft tabular">{statsLine(dish)}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1.5 pt-1">
          <RecentOutcomes outcomes={dish.recentOutcomes} size={11} />
          <PerfectBadge dish={dish} />
        </div>
      </div>
    </Link>
  );
}

function DishRow({ dish }: { dish: LibraryDish }) {
  return (
    <Link
      href={`/plats/${dish.id}`}
      aria-label={`${dish.name}, ${statsLine(dish)}`}
      className="flex items-center gap-3.5 rounded-[22px] bg-surface p-2.5 pr-4 shadow-soft transition-transform active:scale-[0.98]"
    >
      <div className="size-[4.5rem] shrink-0 overflow-hidden rounded-[18px]">
        <DishPicture dishId={dish.id} photoId={dish.photoId} className="size-full" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-[17px] font-bold text-ink">{dish.name}</p>
        <p className="text-sm text-ink-soft tabular">
          {statsLine(dish)} · {dish.lastEaten}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <RecentOutcomes outcomes={dish.recentOutcomes} size={11} />
          <PerfectBadge dish={dish} />
        </div>
      </div>
    </Link>
  );
}
