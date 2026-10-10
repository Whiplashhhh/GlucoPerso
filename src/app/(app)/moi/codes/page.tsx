import type { Metadata } from "next";
import { Star } from "@/components/illustrations/buddies";
import { BackLink } from "@/components/settings/section";
import { remainingRecoveryCodes } from "@/server/repos/recovery";
import { requireAppUser } from "@/server/session";
import { CodesGenerator } from "./codes-generator";

export const metadata: Metadata = { title: "Codes de secours" };

export default async function RecoveryCodesPage() {
  const { user } = await requireAppUser();
  const left = await remainingRecoveryCodes(user.id);
  return (
    <div className="flex flex-col gap-6 pt-4">
      <BackLink />
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-[2.1rem] leading-tight font-semibold">Codes de secours</h1>
          <p className="text-ink-soft">
            Ils te permettent de choisir un nouveau mot de passe si tu l&apos;oublies, sans email.
          </p>
        </div>
        <Star face className="w-16 shrink-0 rotate-6" />
      </header>
      <CodesGenerator left={left} />
    </div>
  );
}
