import type { Metadata } from "next";
import { Peach } from "@/components/illustrations/buddies";
import { NewPasswordForm } from "./new-password-form";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default async function NewPasswordPage({
  searchParams,
}: PageProps<"/recuperation/nouveau">) {
  const { token } = await searchParams;
  return (
    <div className="flex flex-1 flex-col justify-center gap-7 py-10">
      <header className="flex flex-col items-center gap-3 text-center">
        <Peach className="w-24" mood="wink" />
        <h1 className="text-[2.2rem] leading-none font-semibold">Un nouveau départ</h1>
        <p className="max-w-xs text-lg text-ink-soft">Choisis ton nouveau mot de passe.</p>
      </header>
      <NewPasswordForm token={typeof token === "string" ? token : ""} />
    </div>
  );
}
