import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "@fontsource-variable/fraunces/soft.css";
import "@fontsource-variable/nunito";
import { MotionProvider } from "@/components/motion-provider";
import { THEME_COOKIE, themeClass } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "GlucoPerso", template: "%s · GlucoPerso" },
  description: "Ton carnet de repas et d'insuline, tout en douceur.",
  applicationName: "GlucoPerso",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf4ea" },
    { media: "(prefers-color-scheme: dark)", color: "#17122a" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = (await cookies()).get(THEME_COOKIE)?.value;
  return (
    <html lang="fr" className={themeClass(theme)}>
      <body>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
