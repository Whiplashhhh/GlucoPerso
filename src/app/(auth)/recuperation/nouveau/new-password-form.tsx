"use client";

import { type FormEvent, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { PasswordField } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";
import { password as passwordSchema } from "@/lib/validation/auth";

export function NewPasswordForm({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | undefined>();

  if (!token) {
    return <Notice tone="warm">Ce lien est incomplet ou a expiré. Redemande-en un nouveau.</Notice>;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = passwordSchema.safeParse(new FormData(event.currentTarget).get("password"));
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setPending(true);
    const { error: resetError } = await authClient.resetPassword({
      newPassword: parsed.data,
      token,
    });
    setPending(false);
    if (resetError) {
      setError("Ce lien a expiré. Redemande-en un nouveau, ça ne prend qu'une minute.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <Notice tone="success">Mot de passe changé, bravo 🎉</Notice>
        <ButtonLink href="/connexion" size="lg">
          Me connecter
        </ButtonLink>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <PasswordField
        label="Nouveau mot de passe"
        name="password"
        autoComplete="new-password"
        required
        hint="10 caractères minimum."
        error={error}
      />
      <Button type="submit" size="lg" loading={pending}>
        Enregistrer
      </Button>
    </form>
  );
}
