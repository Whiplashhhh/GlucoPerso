"use client";

import { BookHeart, CalendarDays, House, Plus, Smile } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/", label: "Accueil", icon: House },
  { href: "/calendrier", label: "Calendrier", icon: CalendarDays },
  { href: "/plats", label: "Mes plats", icon: BookHeart },
  { href: "/moi", label: "Moi", icon: Smile },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function BottomNav() {
  const pathname = usePathname();
  const left = ITEMS.slice(0, 2);
  const right = ITEMS.slice(2);

  const renderItem = (item: (typeof ITEMS)[number]) => {
    const active = isActive(pathname, item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-[18px] text-[11px] font-extrabold transition-colors",
          active ? "text-coral-ink" : "text-ink-faint hover:text-ink-soft",
        )}
      >
        {active && (
          <motion.span
            layoutId="nav-indicator"
            className="absolute inset-x-2 inset-y-1 rounded-[16px] bg-coral-soft"
            transition={{ type: "spring", stiffness: 520, damping: 38 }}
          />
        )}
        <Icon className="relative" size={24} strokeWidth={active ? 2.5 : 2.1} />
        <span className="relative">{item.label}</span>
      </Link>
    );
  };

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md px-3 pb-safe"
    >
      <div className="relative mb-3 flex items-center gap-1 rounded-[28px] border border-line/60 bg-surface/90 px-2 py-1.5 shadow-lift backdrop-blur-xl">
        {left.map(renderItem)}
        <div className="flex w-20 shrink-0 justify-center">
          <Link
            href="/repas/nouveau"
            aria-label="Ajouter un repas"
            className="grid size-16 -translate-y-6 place-items-center rounded-full bg-coral text-on-coral shadow-lift ring-[6px] ring-bg transition-transform active:scale-95"
          >
            <Plus size={32} strokeWidth={2.8} />
          </Link>
        </div>
        {right.map(renderItem)}
      </div>
    </nav>
  );
}
