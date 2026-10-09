import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "soft" | "ghost" | "outline";
type Size = "lg" | "md" | "sm";

const base =
  "relative inline-flex select-none items-center justify-center gap-2 font-bold transition-[transform,background-color,box-shadow,opacity] duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-coral text-on-coral shadow-soft hover:bg-coral-strong",
  soft: "bg-surface-2 text-ink hover:bg-surface-3",
  ghost: "text-coral-ink hover:bg-coral-soft/60",
  outline: "border-2 border-line bg-surface text-ink hover:border-coral",
};

const sizes: Record<Size, string> = {
  lg: "min-h-14 rounded-[20px] px-6 text-lg",
  md: "min-h-12 rounded-[18px] px-5 text-base",
  sm: "min-h-10 rounded-2xl px-4 text-sm",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size };

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block size-5 animate-spin rounded-full border-[3px] border-current border-r-transparent",
        className,
      )}
      aria-hidden="true"
    />
  );
}
