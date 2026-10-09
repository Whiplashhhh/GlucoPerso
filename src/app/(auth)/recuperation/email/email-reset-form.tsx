"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { TextField } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";
import { email as emailSchema } from "@/lib/validation/common";

export function EmailResetForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = emailSchema.safeParse(new FormData(event.currentTarget).get("email"));
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    setPending(true);
    await authClient.requestPasswordReset({
      email: parsed.data,
      redirectTo: "/recuperation/nouveau",
    });
    // Same answer whether the account exists or not.
    setSent(true);
    setPending(false);
  }

  if (sent) {
    return (
      <Notice tone="success">
        Si un carnet existe avec cet email, le lien est en route 💌 Pense à regarder les spams.
      </Notice>
    );
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
        error={error}
      />
      <Button type="submit" size="lg" loading={pending}>
        Envoyer le lien
      </Button>
    </form>
  );
}
