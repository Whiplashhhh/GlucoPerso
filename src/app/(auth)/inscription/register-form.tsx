"use client";

import { useActionState } from "react";
import { RecoveryCodes } from "@/components/recovery-codes";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { PasswordField, TextField } from "@/components/ui/field";
import { registerAction } from "@/server/actions/auth";
import type { ActionState } from "@/server/action-state";

type State = ActionState<{ recoveryCodes: string[] }>;

export function RegisterForm({ needsInvite }: { needsInvite: boolean }) {
  const [state, formAction, pending] = useActionState<State, FormData>(registerAction, {});

  if (state.ok && state.data) {
    return <RecoveryCodes codes={state.data.recoveryCodes} continueHref="/bienvenue" />;
  }

  const errors = state.fieldErrors ?? {};
  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <TextField
        label="Ton prénom"
        name="name"
        autoComplete="given-name"
        required
        error={errors.name}
      />
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        error={errors.email}
      />
      <PasswordField
        label="Mot de passe"
        name="password"
        autoComplete="new-password"
        required
        hint="10 caractères minimum. Une petite phrase, c'est parfait."
        error={errors.password}
      />
      {needsInvite && (
        <TextField
          label="Code d'invitation"
          name="inviteCode"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="XXXX-XXXX-XXXX"
          required
          error={errors.inviteCode}
        />
      )}
      {state.error && <Notice tone="warm">{state.error}</Notice>}
      <Button type="submit" size="lg" loading={pending} className="mt-2">
        Créer mon carnet
      </Button>
    </form>
  );
}
