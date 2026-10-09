import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSettings, requireUser } from "@/server/session";
import { OnboardingFlow } from "./onboarding-flow";

export const metadata: Metadata = { title: "Bienvenue" };

export default async function WelcomePage() {
  const user = await requireUser();
  const settings = await getSettings(user.id);
  if (settings?.onboardedAt) redirect("/");
  return <OnboardingFlow initialName={user.name} />;
}
