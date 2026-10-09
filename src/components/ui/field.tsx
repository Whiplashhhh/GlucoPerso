"use client";

import { Eye, EyeOff } from "lucide-react";
import { type ComponentProps, type ReactNode, useId, useState } from "react";
import { cn } from "@/lib/cn";

export const inputClass =
  "w-full min-h-14 rounded-[18px] border-2 border-line bg-surface px-4 text-lg text-ink placeholder:text-ink-faint transition-colors outline-none focus:border-coral aria-[invalid=true]:border-coral-strong";

type FieldProps = ComponentProps<"input"> & {
  label: string;
  hint?: ReactNode;
  error?: string;
  trailing?: ReactNode;
};

export function TextField({ label, hint, error, trailing, className, id, ...props }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-message`;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="pl-1 text-sm font-bold text-ink-soft">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          className={cn(inputClass, trailing ? "pr-14" : undefined)}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>
      <FieldMessage id={messageId} error={error} hint={hint} />
    </div>
  );
}

export function FieldMessage({
  id,
  error,
  hint,
}: {
  id?: string;
  error?: string;
  hint?: ReactNode;
}) {
  if (error) {
    return (
      <p id={id} role="alert" className="pl-1 text-sm font-semibold text-coral-ink">
        {error}
      </p>
    );
  }
  if (hint) {
    return (
      <p id={id} className="pl-1 text-sm text-ink-soft">
        {hint}
      </p>
    );
  }
  return null;
}

export function PasswordField(props: Omit<FieldProps, "type" | "trailing">) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="grid size-12 place-items-center rounded-2xl text-ink-soft hover:text-ink"
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        >
          {visible ? <EyeOff size={22} /> : <Eye size={22} />}
        </button>
      }
    />
  );
}
