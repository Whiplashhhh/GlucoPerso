import { requireAppUser } from "@/server/session";

/** Full-screen sheets (meal entry, feedback): no bottom navigation. */
export default async function SheetLayout({ children }: LayoutProps<"/">) {
  await requireAppUser();
  return (
    <div className="relative mx-auto app-frame min-h-dvh w-full max-w-md md:min-h-[calc(100dvh-3rem)]">
      {children}
    </div>
  );
}
