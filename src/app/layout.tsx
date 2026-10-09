import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces/soft.css";
import "@fontsource-variable/nunito";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
