import { Peach } from "@/components/illustrations/buddies";
import { requireAppUser } from "@/server/session";

export default async function HomePage() {
  const { user } = await requireAppUser();
  return (
    <div className="flex flex-col gap-6 pt-8">
      <h1 className="text-[2.2rem] leading-tight font-semibold">Coucou {user.name} ☀️</h1>
      <div className="flex flex-col items-center gap-3 rounded-[24px] bg-surface p-8 text-center shadow-soft">
        <Peach className="w-24" />
        <p className="text-lg text-ink-soft">
          Rien ici pour l&apos;instant… ton estomac attend son heure 🍽️
        </p>
      </div>
    </div>
  );
}
