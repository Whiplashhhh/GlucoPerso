import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "@/components/illustrations/buddies";
import { smtpEnabled } from "@/lib/env";
import { RecoverForm } from "./recover-form";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function RecoverPage() {
  return (
    <div className="flex flex-1 flex-col justify-center gap-7 py-10">
      <header className="flex flex-col items-center gap-3 text-center">
        <Star face className="w-24 -rotate-6 motion-safe:animate-[bob_4s_ease-in-out_infinite]" />
        <h1 className="text-[2.2rem] leading-none font-semibold">Un trou de mémoire&nbsp;?</h1>
        <p className="max-w-xs text-lg text-ink-soft">
          Ça arrive à tout le monde. Utilise un de tes codes de secours.
        </p>
      </header>
      <RecoverForm />
      <nav className="flex flex-col items-center gap-2 text-[15px] font-bold">
        {smtpEnabled && (
          <Link href="/recuperation/email" className="rounded-xl px-3 py-2 text-coral-ink">
            Recevoir plutôt un lien par email
          </Link>
        )}
        <Link href="/connexion" className="rounded-xl px-3 py-2 text-ink-soft">
          Retour à la connexion
        </Link>
      </nav>
    </div>
  );
}
