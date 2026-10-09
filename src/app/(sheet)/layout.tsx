import { requireAppUser } from "@/server/session";

/** Full-screen sheets (meal entry, feedback): no bottom navigation. */
export default async function SheetLayout({ children }: LayoutProps<"/">) {
  await requireAppUser();
  return <div className="relative mx-auto min-h-dvh w-full max-w-md">{children}</div>;
}
