import { BottomNav } from "@/components/bottom-nav";
import { MealUndoProvider } from "@/components/meals/meal-undo";
import { OfflineSync } from "@/components/offline/offline-sync";
import { offlineKeyPair } from "@/server/offline/keys";
import { requireAppUser } from "@/server/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { user, settings } = await requireAppUser();
  return (
    <MealUndoProvider>
      <div className="relative mx-auto app-frame min-h-dvh w-full max-w-md md:min-h-[calc(100dvh-3rem)]">
        <main className="relative px-5 pt-safe pb-36">{children}</main>
        <BottomNav />
      </div>
      <OfflineSync
        config={{
          publicKey: offlineKeyPair().publicKey,
          userId: user.id,
          glucoseUnit: settings.glucoseUnit,
        }}
      />
    </MealUndoProvider>
  );
}
