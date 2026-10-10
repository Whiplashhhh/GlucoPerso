"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { AnimatePresence, type PanInfo, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import type { MealRowData } from "@/components/home/meal-row";
import { Croissant, Peach } from "@/components/illustrations/buddies";
import { MealList } from "@/components/meals/meal-list";
import { useMealUndo } from "@/components/meals/meal-undo";
import { OutcomeDot } from "@/components/outcome-dot";
import {
  WEEKDAYS,
  type CalendarDay,
  buildMonthGrid,
  dayLabel,
  monthLabel,
  monthOfDay,
  shiftMonth,
} from "@/lib/calendar";
import { cn } from "@/lib/cn";
import type { Outcome } from "@/lib/glucose";
import { OUTCOME_INFO, OUTCOMES } from "@/lib/outcomes";

export type CalendarMeal = MealRowData & { day: string };

const MAX_MARKERS = 3;
const SWIPE_DISTANCE = 56;
const SWIPE_VELOCITY = 450;

function calendarHref(month: string, day: string | null) {
  return `/calendrier?mois=${month}${day ? `&jour=${day}` : ""}`;
}

function mealsLabel(count: number) {
  if (count === 0) return "aucun repas";
  return count === 1 ? "1 repas" : `${count} repas`;
}

export function CalendarView({
  monthKey,
  todayKey,
  initialDay,
  meals,
}: {
  monthKey: string;
  todayKey: string;
  initialDay: string | null;
  meals: CalendarMeal[];
}) {
  const router = useRouter();
  const [loading, startTransition] = useTransition();
  const { hidden } = useMealUndo();
  const [direction, setDirection] = useState(0);
  // A swipe ends with a click on the cell under the finger: ignore that one.
  const dragged = useRef(false);
  // The selection belongs to a month: when the month in the URL changes
  // (chevrons, swipe, back button), the server-chosen day takes over.
  const [selection, setSelection] = useState({ month: monthKey, day: initialDay });
  const selected = selection.month === monthKey ? selection.day : initialDay;

  const weeks = useMemo(() => buildMonthGrid(monthKey), [monthKey]);
  const byDay = useMemo(() => {
    const groups = new Map<string, CalendarMeal[]>();
    for (const meal of meals) {
      if (hidden.has(meal.id)) continue;
      groups.set(meal.day, [...(groups.get(meal.day) ?? []), meal]);
    }
    return groups;
  }, [meals, hidden]);

  const monthMeals = [...byDay.entries()]
    .filter(([day]) => monthOfDay(day) === monthKey)
    .flatMap(([, list]) => list);
  const answered = monthMeals.filter((meal) => meal.outcome).length;
  const currentMonth = monthOfDay(todayKey);

  function goTo(month: string, day: string | null) {
    if (month === monthKey) return;
    setDirection(month > monthKey ? 1 : -1);
    setSelection({ month, day });
    startTransition(() => router.push(calendarHref(month, day), { scroll: false }));
  }

  function goMonth(delta: number) {
    const month = shiftMonth(monthKey, delta);
    goTo(month, month === currentMonth ? todayKey : null);
  }

  function select(cell: CalendarDay) {
    if (dragged.current) return;
    if (!cell.inMonth) {
      goTo(monthOfDay(cell.key), cell.key);
      return;
    }
    setSelection({ month: monthKey, day: cell.key });
    // Shallow URL update: the day list is already here, no server round-trip.
    window.history.replaceState(null, "", calendarHref(monthKey, cell.key));
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    setTimeout(() => {
      dragged.current = false;
    }, 60);
    if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) goMonth(1);
    else if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) goMonth(-1);
  }

  const dayMeals = selected ? (byDay.get(selected) ?? []) : [];

  return (
    <div className="flex flex-col gap-5 pt-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-extrabold tracking-wide text-coral-ink uppercase">
            Mon carnet
          </p>
          <h1 className="text-[2.1rem] leading-tight font-semibold" aria-live="polite">
            {monthLabel(monthKey)}
          </h1>
          <p className="mt-0.5 text-[15px] text-ink-soft">
            {monthMeals.length
              ? `${mealsLabel(monthMeals.length)} · ${answered} ${answered > 1 ? "retours" : "retour"}`
              : "Un mois tout neuf ✨"}
          </p>
        </div>
        <Link
          href="/recherche"
          aria-label="Rechercher un repas"
          className="mt-1 grid size-12 shrink-0 place-items-center rounded-full bg-surface text-ink shadow-soft transition-transform active:scale-95"
        >
          <Search size={22} strokeWidth={2.4} />
        </Link>
      </header>

      <section
        aria-label={`Calendrier de ${monthLabel(monthKey)}`}
        className="-mx-1.5 overflow-hidden rounded-[28px] bg-surface px-1.5 pt-2 pb-2.5 shadow-soft"
      >
        <div className="flex items-center justify-between px-1 pb-1">
          <MonthButton direction="previous" onClick={() => goMonth(-1)} />
          {monthKey !== currentMonth ? (
            <button
              type="button"
              onClick={() => goTo(currentMonth, todayKey)}
              className="min-h-11 rounded-full bg-coral-soft px-4 text-sm font-extrabold text-coral-ink transition-transform active:scale-95"
            >
              Aujourd&apos;hui
            </button>
          ) : (
            <span className="text-sm font-bold text-ink-faint">Glisse pour changer de mois</span>
          )}
          <MonthButton direction="next" onClick={() => goMonth(1)} />
        </div>

        <div className="grid grid-cols-7" aria-hidden="true">
          {WEEKDAYS.map((weekday) => (
            <span
              key={weekday.long}
              className="py-1.5 text-center text-xs font-extrabold text-ink-faint"
            >
              {weekday.short}
            </span>
          ))}
        </div>

        <div className="relative">
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <motion.div
              key={monthKey}
              custom={direction}
              variants={{
                enter: (dir: number) => ({ x: dir * 80, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (dir: number) => ({ x: dir * -80, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.22}
              dragDirectionLock
              onDragStart={() => {
                dragged.current = true;
              }}
              onDragEnd={onDragEnd}
              className={cn("flex flex-col gap-0.5 transition-opacity", loading && "opacity-60")}
              data-testid="month-grid"
            >
              {weeks.map((week) => (
                <div key={week[0]?.key} className="grid grid-cols-7">
                  {week.map((cell) => (
                    <DayCell
                      key={cell.key}
                      cell={cell}
                      outcomes={(byDay.get(cell.key) ?? []).map((meal) => meal.outcome)}
                      today={cell.key === todayKey}
                      selected={cell.key === selected}
                      onSelect={() => select(cell)}
                    />
                  ))}
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <Legend />

      <section aria-labelledby="day-title" className="flex flex-col gap-3">
        {selected ? (
          <>
            <h2 id="day-title" className="flex items-baseline gap-2 text-2xl font-semibold">
              <span className="first-letter:uppercase">{dayLabel(selected)}</span>
              {selected === todayKey && (
                <span className="rounded-full bg-coral-soft px-2.5 py-0.5 font-sans text-xs font-extrabold text-coral-ink">
                  Aujourd&apos;hui
                </span>
              )}
            </h2>
            <MealList
              meals={dayMeals}
              label={`Repas du ${dayLabel(selected)}`}
              empty={<EmptyDay past={selected < todayKey} />}
            />
          </>
        ) : (
          <div className="flex items-center gap-4 rounded-[24px] bg-surface-2 p-4">
            <Croissant className="w-16 shrink-0" mood="wink" />
            <p id="day-title" className="font-semibold text-ink-soft">
              Touche un jour pour revoir ce que tu as mangé 👆
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function MonthButton({
  direction,
  onClick,
}: {
  direction: "previous" | "next";
  onClick: () => void;
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "previous" ? "Mois précédent" : "Mois suivant"}
      className="grid size-12 place-items-center rounded-full text-ink-soft transition-[transform,background-color] hover:bg-surface-2 active:scale-90"
    >
      <Icon size={26} strokeWidth={2.4} />
    </button>
  );
}

function DayCell({
  cell,
  outcomes,
  today,
  selected,
  onSelect,
}: {
  cell: CalendarDay;
  outcomes: (Outcome | null)[];
  today: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const extra = outcomes.length - MAX_MARKERS;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-current={today ? "date" : undefined}
      aria-label={`${dayLabel(cell.key)}${today ? " (aujourd'hui)" : ""}, ${mealsLabel(outcomes.length)}`}
      data-day={cell.key}
      className={cn(
        "flex h-[3.7rem] min-w-0 flex-col items-center gap-1 rounded-[18px] pt-1.5 transition-[background-color,transform] active:scale-95",
        selected ? "bg-coral-soft" : "hover:bg-surface-2",
        !cell.inMonth && "opacity-45",
      )}
    >
      <span
        className={cn(
          "grid size-8 place-items-center rounded-full text-[15px] font-bold tabular",
          selected ? "bg-coral text-on-coral" : today ? "text-coral-ink" : "text-ink",
          today && "ring-2 ring-coral ring-offset-2 ring-offset-surface",
          today && selected && "ring-offset-coral-soft",
        )}
      >
        {cell.day}
      </span>
      <span className="flex h-2.5 items-center gap-[3px]">
        {outcomes.slice(0, MAX_MARKERS).map((outcome, index) => (
          <OutcomeDot key={index} outcome={outcome} size={9} />
        ))}
        {extra > 0 && (
          <span className="text-[10px] leading-none font-extrabold text-ink-soft">+{extra}</span>
        )}
      </span>
    </button>
  );
}

function Legend() {
  return (
    <ul
      className="-mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1.5 px-2 text-xs font-bold text-ink-soft"
      aria-label="Légende"
    >
      {OUTCOMES.map((outcome) => (
        <li key={outcome} className="flex items-center gap-1.5">
          <OutcomeDot outcome={outcome} size={10} />
          {OUTCOME_INFO[outcome].short}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <OutcomeDot outcome={null} size={10} />
        En attente
      </li>
    </ul>
  );
}

function EmptyDay({ past }: { past: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[24px] border-2 border-dashed border-line px-6 py-7 text-center">
      <Peach className="w-20" mood="calm" />
      <p className="font-semibold text-ink-soft">
        {past
          ? "Rien de noté ce jour-là, et ce n'est pas grave du tout 💛"
          : "Rien ici pour l'instant… ton estomac attend son heure 🍽️"}
      </p>
    </div>
  );
}
