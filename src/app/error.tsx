"use client";

import { Cloud } from "@/components/illustrations/buddies";
import { Button, ButtonLink } from "@/components/ui/button";

/**
 * Generic fallback for unexpected errors. It never shows `error.message`:
 * a message could carry personal or health data (and Next.js already hides
 * server messages in production). Nothing is logged from the browser either.
 */
export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-7 px-5 pt-safe pb-safe text-center">
      <Cloud className="mx-auto w-32" mood="calm" />
      <div className="flex flex-col gap-3">
        <h1 className="text-[2.2rem] leading-none font-semibold">Oups, un petit nuage</h1>
        <p className="mx-auto max-w-xs text-lg text-ink-soft">
          Quelque chose n&apos;a pas marché. Tes données sont à l&apos;abri : réessaie dans un
          instant.
        </p>
      </div>
      <div className="mx-auto flex w-full max-w-xs flex-col gap-3">
        <Button size="lg" onClick={() => retry()}>
          Réessayer
        </Button>
        <ButtonLink href="/" variant="soft" size="lg">
          Retour à l&apos;accueil
        </ButtonLink>
      </div>
    </main>
  );
}
