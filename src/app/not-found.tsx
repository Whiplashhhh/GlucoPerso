import type { Metadata } from "next";
import { CheerArt } from "@/components/celebration";
import { Cloud, Croissant } from "@/components/illustrations/buddies";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page introuvable" };

/** Friendly 404: a lost little croissant, one clear way back home. */
export default function NotFound() {
  return (
    <main className="relative isolate mx-auto app-frame flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 overflow-hidden px-5 pt-safe pb-safe text-center md:min-h-[calc(100dvh-3rem)]">
      <div
        aria-hidden="true"
        className="absolute -top-28 -left-24 -z-10 size-72 rounded-full bg-amber-soft blur-3xl"
      />
      <Cloud className="absolute top-12 -right-6 -z-10 w-28 opacity-90 motion-safe:animate-[float_9s_ease-in-out_infinite]" />
      <CheerArt tone="coral" className="mx-auto">
        <Croissant className="w-36 motion-safe:animate-[bob_4s_ease-in-out_infinite]" mood="wink" />
      </CheerArt>
      <div className="flex flex-col gap-3">
        <p className="font-display text-lg font-semibold text-coral-ink">Oups, erreur 404</p>
        <h1 className="text-[2.4rem] leading-none font-semibold">Cette page s&apos;est égarée</h1>
        <p className="mx-auto max-w-xs text-lg text-ink-soft">
          Elle a dû partir chercher un goûter. Pas grave, ton carnet est toujours là.
        </p>
      </div>
      <ButtonLink href="/" size="lg" className="mx-auto w-full max-w-xs">
        Retour à l&apos;accueil
      </ButtonLink>
    </main>
  );
}
