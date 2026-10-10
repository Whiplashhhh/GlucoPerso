import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeedbackFlow } from "@/components/feedback/feedback-flow";
import { getMeal } from "@/server/repos/meals";
import { idParam } from "@/server/params";
import { requireAppUser } from "@/server/session";

export const metadata: Metadata = { title: "Comment ça s'est passé ?" };

export default async function FeedbackPage({ params }: PageProps<"/retour/[id]">) {
  const { user, settings } = await requireAppUser();
  const id = await idParam(params);
  const meal = await getMeal(user.id, id);
  if (!meal) notFound();
  return (
    <FeedbackFlow
      meal={{
        id: meal.id,
        name: meal.name,
        photoId: meal.photos[0]?.id ?? null,
        outcome: meal.outcome,
        glucoseAfter: meal.glucoseAfter,
        glucoseLow: meal.glucoseLow,
        glucoseHigh: meal.glucoseHigh,
        hypoTreated: meal.hypoTreated,
        outcomeNote: meal.outcomeNote,
      }}
      glucoseUnit={settings.glucoseUnit}
      thresholds={{ hypo: settings.hypoThreshold, high: settings.highThreshold }}
    />
  );
}
