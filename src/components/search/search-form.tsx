"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Spinner } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { inputClass } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { MEAL_TAGS, type MealTag, TAG_INFO } from "@/lib/tags";

function searchHref(q: string, tags: ReadonlySet<MealTag>) {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  for (const tag of tags) params.append("tag", tag);
  const query = params.toString();
  return query ? `/recherche?${query}` : "/recherche";
}

/** Search field + tag chips; the results are rendered server-side from the URL. */
export function SearchForm({ q, tags }: { q: string; tags: MealTag[] }) {
  const router = useRouter();
  const [searching, startTransition] = useTransition();
  const [text, setText] = useState(q);
  const [selected, setSelected] = useState<ReadonlySet<MealTag>>(() => new Set(tags));
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = setTimeout(() => {
      startTransition(() => router.replace(searchHref(text, selected), { scroll: false }));
    }, 250);
    return () => clearTimeout(timer);
  }, [text, selected, router]);

  function toggle(tag: MealTag) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(() => router.replace(searchHref(text, selected), { scroll: false }));
        }}
        className="relative"
      >
        <Search
          size={22}
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-faint"
        />
        <input
          type="search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Raclette, resto, sport…"
          aria-label="Rechercher un plat, une note"
          maxLength={80}
          enterKeyHint="search"
          autoComplete="off"
          className={cn(
            inputClass,
            "pr-14 pl-12 shadow-soft [&::-webkit-search-cancel-button]:hidden",
          )}
        />
        <span className="absolute inset-y-0 right-1 flex items-center">
          {searching ? (
            <span className="grid size-12 place-items-center text-coral-ink">
              <Spinner />
            </span>
          ) : (
            text && (
              <button
                type="button"
                onClick={() => setText("")}
                aria-label="Effacer la recherche"
                className="grid size-12 place-items-center rounded-2xl text-ink-soft hover:text-ink"
              >
                <X size={22} />
              </button>
            )
          )}
        </span>
      </form>
      <div
        role="group"
        className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1"
        aria-label="Filtrer par contexte"
      >
        {MEAL_TAGS.map((tag) => (
          <Chip key={tag} selected={selected.has(tag)} onClick={() => toggle(tag)}>
            {TAG_INFO[tag].emoji} {TAG_INFO[tag].label}
          </Chip>
        ))}
      </div>
    </div>
  );
}
