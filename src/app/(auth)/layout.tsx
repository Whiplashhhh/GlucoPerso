import { Cloud, Sparkle, Star } from "@/components/illustrations/buddies";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative isolate min-h-dvh overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute -top-32 -right-24 -z-10 size-80 rounded-full bg-coral-soft blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute top-1/2 -left-32 -z-10 size-72 rounded-full bg-lavender-soft blur-3xl"
      />
      <Cloud className="absolute top-10 -left-6 w-28 opacity-90 motion-safe:animate-[float_9s_ease-in-out_infinite]" />
      <Star className="absolute top-24 right-8 w-7 rotate-12" />
      <Sparkle className="absolute top-44 right-20 w-4 text-coral" />
      <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-safe pb-safe">
        {children}
      </main>
    </div>
  );
}
