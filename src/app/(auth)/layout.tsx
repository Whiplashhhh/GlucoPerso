import { Cloud, Sparkle, Star } from "@/components/illustrations/buddies";
import { ForgetOfflineAccount } from "@/components/offline/offline-sync";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative isolate min-h-dvh overflow-hidden md:overflow-visible">
      <main className="relative isolate mx-auto app-frame flex min-h-dvh w-full max-w-md flex-col px-5 pt-safe pb-safe md:min-h-[calc(100dvh-3rem)]">
        {/* Decorations stay in the margins, never behind the titles. */}
        <div
          aria-hidden="true"
          className="absolute -top-32 -right-24 -z-10 size-80 rounded-full bg-coral-soft blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute top-1/2 -left-32 -z-10 size-72 rounded-full bg-lavender-soft blur-3xl"
        />
        <Cloud className="absolute top-8 -left-5 -z-10 w-24 opacity-90 motion-safe:animate-[float_9s_ease-in-out_infinite]" />
        <Star className="absolute top-10 right-6 -z-10 w-7 rotate-12" />
        <Sparkle className="absolute top-20 right-14 -z-10 w-3.5 text-coral" />
        {children}
      </main>
      <ForgetOfflineAccount />
    </div>
  );
}
