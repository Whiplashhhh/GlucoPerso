import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { requireAppUser } from "@/server/session";
import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = { title: "Moi" };

export default async function MePage() {
  const { user } = await requireAppUser();
  return (
    <div className="flex flex-col gap-6 pt-8">
      <h1 className="text-[2.2rem] leading-tight font-semibold">Moi</h1>
      <Card className="flex flex-col gap-1">
        <p className="text-xl font-bold">{user.name}</p>
        <p className="text-ink-soft">{user.email}</p>
      </Card>
      <SignOutButton />
    </div>
  );
}
