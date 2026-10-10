import { BottomNav } from "@/components/bottom-nav";
import { MealUndoProvider } from "@/components/meals/meal-undo";
import { requireAppUser } from "@/server/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireAppUser();
  return (
    <MealUndoProvider>
      <div className="relative mx-auto min-h-dvh w-full max-w-md">
        <main className="relative px-5 pt-safe pb-36">{children}</main>
        <BottomNav />
      </div>
    </MealUndoProvider>
  );
}
