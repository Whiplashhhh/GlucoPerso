"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { PasswordField, TextField } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";
import { loginSchema } from "@/lib/validation/auth";

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsed = loginSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setPending(true);
    const { error: signInError } = await authClient.signIn.email(parsed.data);
    if (signInError) {
      setPending(false);
      const lockMessage = signInError.message?.startsWith("Trop d'essais")
        ? signInError.message
        : "Trop d'essais d'un coup. On souffle un peu et on réessaie dans un moment 🌿";
      setError(
        signInError.status === 429
          ? lockMessage
          : "Email ou mot de passe incorrect. Pas de panique, ça arrive !",
      );
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        error={fieldErrors.email}
      />
      <PasswordField
        label="Mot de passe"
        name="password"
        autoComplete="current-password"
        required
        error={fieldErrors.password}
      />
      {error && <Notice tone="warm">{error}</Notice>}
      <Button type="submit" size="lg" loading={pending} className="mt-2">
        Me connecter
      </Button>
    </form>
  );
}
