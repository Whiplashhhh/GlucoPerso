import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Peach } from "@/components/illustrations/buddies";
import { env } from "@/lib/env";
import { getSession } from "@/server/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage() {
  if (await getSession()) redirect("/");
  return (
    <div className="flex flex-1 flex-col justify-center gap-8 py-10">
      <header className="flex flex-col items-center gap-3 text-center">
        <Peach className="w-28 motion-safe:animate-[bob_4s_ease-in-out_infinite]" mood="happy" />
        <h1 className="text-[2.6rem] leading-none font-semibold">Re-coucou !</h1>
        <p className="max-w-xs text-lg text-ink-soft">Ton carnet t&apos;attendait bien au chaud.</p>
      </header>
      <LoginForm />
      <nav className="flex flex-col items-center gap-2 text-[15px] font-bold">
        <Link href="/recuperation" className="rounded-xl px-3 py-2 text-coral-ink">
          Mot de passe oublié ?
        </Link>
        {env.REGISTRATION_MODE !== "closed" && (
          <Link href="/inscription" className="rounded-xl px-3 py-2 text-ink-soft">
            Première fois ici ? <span className="text-coral-ink">Créer mon carnet</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
