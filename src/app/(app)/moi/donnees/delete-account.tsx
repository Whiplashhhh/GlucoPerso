"use client";

import { Trash2 } from "lucide-react";
import { type FormEvent, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { PasswordField } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { deleteAccountSchema } from "@/lib/validation/settings";
import { deleteAccountAction } from "@/server/actions/account";

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setPassword("");
    setFieldError(undefined);
    setError(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsed = deleteAccountSchema.safeParse({ password });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message);
      return;
    }
    startTransition(async () => {
      // On success the action redirects to the login page.
      const result = await deleteAccountAction(parsed.data);
      setFieldError(result.fieldErrors?.password);
      if (result.error) setError(result.error);
    });
  }

  return (
    <>
      <div className="flex flex-col gap-4 rounded-[24px] border-2 border-dashed border-line p-5">
        <p className="text-ink-soft">
          Tout sera effacé pour de bon : ton profil, tes réglages, tes ratios, tes repas et leurs
          photos. Pense à exporter tes données avant si tu veux les garder.
        </p>
        <Button variant="outline" onClick={() => setOpen(true)} icon={<Trash2 size={20} />}>
          Supprimer mon compte
        </Button>
      </div>

      <Modal open={open} onClose={close} title="Supprimer ton compte ?">
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <p className="text-center text-ink-soft">
            C&apos;est définitif : on ne pourra rien récupérer. Pour confirmer que c&apos;est bien
            toi, retape ton mot de passe.
          </p>
          <PasswordField
            label="Ton mot de passe"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={fieldError}
          />
          {error && <Notice tone="warm">{error}</Notice>}
          <Button type="submit" size="lg" variant="soft" loading={pending}>
            Oui, tout supprimer
          </Button>
          <Button size="lg" onClick={close}>
            Non, je reste
          </Button>
        </form>
      </Modal>
    </>
  );
}
