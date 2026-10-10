import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** A titled group of settings cards on « Moi ». */
export function SettingsSection({
  title,
  id,
  action,
  children,
  className,
}: {
  title: string;
  id?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn("flex scroll-mt-6 flex-col gap-3", className)}
    >
      <div className="flex min-h-8 items-end justify-between gap-3 px-1">
        <h2 id={headingId} className="text-[1.45rem] leading-tight font-semibold">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const TONES = {
  coral: "bg-coral-soft text-coral-ink",
  mint: "bg-mint-soft text-mint-ink",
  lavender: "bg-lavender-soft text-lavender-ink",
  amber: "bg-amber-soft text-amber-ink",
  sky: "bg-sky-soft text-ink",
} as const;
export type IconTone = keyof typeof TONES;

export function IconBubble({ tone, children }: { tone: IconTone; children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className={cn("grid size-12 shrink-0 place-items-center rounded-[16px]", TONES[tone])}
    >
      {children}
    </span>
  );
}

/** Big tappable row leading to a sub-page. */
export function LinkRow({
  href,
  icon,
  tone,
  title,
  subtitle,
  className,
}: {
  href: string;
  icon: ReactNode;
  tone: IconTone;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-[4.5rem] items-center gap-4 rounded-[24px] bg-surface p-4 shadow-soft transition-transform active:scale-[0.98]",
        className,
      )}
    >
      <IconBubble tone={tone}>{icon}</IconBubble>
      <span className="flex flex-1 flex-col">
        <span className="text-[17px] font-extrabold text-ink">{title}</span>
        {subtitle && <span className="text-sm text-ink-soft">{subtitle}</span>}
      </span>
      <ChevronRight size={22} className="shrink-0 text-ink-faint" aria-hidden="true" />
    </Link>
  );
}

/** One setting inside a card: label + hint on top, control below. */
export function SettingRow({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 py-5 first:pt-1 last:pb-1", className)}>
      <div className="flex flex-col gap-0.5 px-1">
        <p className="font-extrabold text-ink">{label}</p>
        {hint && <p className="text-sm text-ink-soft">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

/** Back link for « Moi » sub-pages. */
export function BackLink({ href = "/moi", label = "Moi" }: { href?: string; label?: string }) {
  return (
    <Link
      href={href}
      className="-ml-2 inline-flex min-h-12 items-center gap-1 self-start rounded-2xl pr-3 pl-1 font-bold text-coral-ink"
    >
      <ChevronRight size={22} className="rotate-180" aria-hidden="true" />
      {label}
    </Link>
  );
}
