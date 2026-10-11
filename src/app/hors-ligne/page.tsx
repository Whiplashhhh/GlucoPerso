import type { Metadata } from "next";
import { CheerArt } from "@/components/celebration";
import { Cloud, Peach, Sparkle, Star } from "@/components/illustrations/buddies";
import { OfflineMealForm } from "@/components/offline/offline-meal-form";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Hors ligne" };

/**
 * Shown by the service worker (public/sw.js) when a page cannot be reached.
 * It is the only HTML the worker keeps in cache, so it must never display
 * personal data. On a device where she was signed in, it also lets her note a
 * meal, kept encrypted until the network comes back (OfflineMealForm).
 */
export default function OfflinePage() {
  return (
    <div className="relative isolate min-h-dvh overflow-hidden md:overflow-visible">
      <main className="relative isolate mx-auto app-frame flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-5 pt-safe pb-safe text-center md:min-h-[calc(100dvh-3rem)] [&:has(section)]:py-10">
        <div
          aria-hidden="true"
          className="absolute -top-32 -right-24 -z-10 size-80 rounded-full bg-lavender-soft blur-3xl"
        />
        <Cloud className="absolute top-12 -left-6 -z-10 w-28 opacity-90 motion-safe:animate-[float_9s_ease-in-out_infinite]" />
        <Star className="absolute top-16 right-10 -z-10 w-6 rotate-12" />
        <Sparkle className="absolute top-32 right-20 -z-10 w-4 text-coral" />
        <CheerArt tone="lavender" sparkles={false} className="mx-auto">
          <Peach className="w-32 motion-safe:animate-[bob_4s_ease-in-out_infinite]" mood="calm" />
        </CheerArt>
        <div className="flex flex-col gap-3">
          <h1 className="text-[2.4rem] leading-none font-semibold">Pas de réseau…</h1>
          <p className="mx-auto max-w-xs text-lg text-ink-soft">
            Ton carnet t&apos;attend sagement. Dès que la connexion revient, on reprend là où tu en
            étais.
          </p>
        </div>
        <OfflineMealForm />
        {/* Renders a real <a>: works even if JavaScript could not be loaded. */}
        <ButtonLink href="/" prefetch={false} size="lg" className="mx-auto w-full max-w-xs">
          Réessayer
        </ButtonLink>
      </main>
    </div>
  );
}
