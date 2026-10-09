"use client";

import { useActionState } from "react";
import { ButtonLink, Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { PasswordField, TextField } from "@/components/ui/field";
import { recoverAction } from "@/server/actions/auth";
import type { ActionState } from "@/server/action-state";

type State = ActionState<{ remaining: number }>;

export function RecoverForm() {
  const [state, formAction, pending] = useActionState<State, FormData>(recoverAction, {});

  if (state.ok && state.data) {
    const { remaining } = state.data;
    return (
      <div className="flex flex-col gap-4">
        <Notice tone="success">
          C&apos;est tout bon, ton nouveau mot de passe est enregistré 🎉
          {remaining <= 2 &&
            ` Il te reste ${remaining} code${remaining > 1 ? "s" : ""} : pense à en générer de nouveaux dans « Moi ».`}
        </Notice>
        <ButtonLink href="/connexion" size="lg">
          Me connecter
        </ButtonLink>
      </div>
    );
  }

  const errors = state.fieldErrors ?? {};
  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        error={errors.email}
      />
      <TextField
        label="Code de secours"
        name="code"
        autoComplete="one-time-code"
        autoCapitalize="characters"
        spellCheck={false}
        placeholder="XXXX-XXXX-XXXX"
        required
        error={errors.code}
      />
      <PasswordField
        label="Nouveau mot de passe"
        name="password"
        autoComplete="new-password"
        required
        hint="10 caractères minimum."
        error={errors.password}
      />
      {state.error && <Notice tone="warm">{state.error}</Notice>}
      <Button type="submit" size="lg" loading={pending} className="mt-2">
        Choisir ce mot de passe
      </Button>
    </form>
  );
}
