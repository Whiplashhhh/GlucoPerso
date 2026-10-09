import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Cloud, Strawberry } from "@/components/illustrations/buddies";
import { env } from "@/lib/env";
import { getSession } from "@/server/session";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Créer mon carnet" };

export default async function RegisterPage() {
  if (await getSession()) redirect("/");

  if (env.REGISTRATION_MODE === "closed") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 py-10 text-center">
        <Cloud className="w-32" mood="calm" />
        <h1 className="text-3xl font-semibold">Les portes sont fermées</h1>
        <p className="max-w-xs text-lg text-ink-soft">
          Ce carnet est privé : les inscriptions sont désactivées pour le moment.
        </p>
        <Link href="/connexion" className="font-bold text-coral-ink">
          J&apos;ai déjà un compte
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col justify-center gap-7 py-10">
      <header className="flex flex-col items-center gap-3 text-center">
        <Strawberry className="w-24 motion-safe:animate-[bob_4s_ease-in-out_infinite]" mood="joy" />
        <h1 className="text-[2.4rem] leading-none font-semibold">Bienvenue !</h1>
        <p className="max-w-xs text-lg text-ink-soft">
          On crée ton petit carnet. Promis, c&apos;est rapide.
        </p>
      </header>
      <RegisterForm needsInvite={env.REGISTRATION_MODE === "invite"} />
      <p className="text-center text-[15px] font-bold text-ink-soft">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="text-coral-ink">
          Me connecter
        </Link>
      </p>
    </div>
  );
}
