import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cloud } from "@/components/illustrations/buddies";
import { smtpEnabled } from "@/lib/env";
import { EmailResetForm } from "./email-reset-form";

export const metadata: Metadata = { title: "Lien par email" };

export default function EmailResetPage() {
  if (!smtpEnabled) notFound();
  return (
    <div className="flex flex-1 flex-col justify-center gap-7 py-10">
      <header className="flex flex-col items-center gap-3 text-center">
        <Cloud className="w-28" mood="happy" />
        <h1 className="text-[2.2rem] leading-none font-semibold">Un lien par email</h1>
        <p className="max-w-xs text-lg text-ink-soft">
          On t&apos;envoie un lien pour choisir un nouveau mot de passe.
        </p>
      </header>
      <EmailResetForm />
      <Link href="/connexion" className="text-center text-[15px] font-bold text-ink-soft">
        Retour à la connexion
      </Link>
    </div>
  );
}
