"use client";

/**
 * Last-resort fallback when the root layout itself fails. It renders its own
 * document without the app styles, and never shows `error.message` (it could
 * carry personal or health data).
 */
export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: "4rem 1.25rem" }}>
        <title>GlucoPerso</title>
        <main style={{ maxWidth: "24rem", margin: "0 auto", textAlign: "center" }}>
          <h1>Oups, un petit nuage</h1>
          <p>Quelque chose n&apos;a pas marché. Tes données sont à l&apos;abri.</p>
          <button type="button" onClick={() => retry()} style={{ padding: "0.75rem 1.5rem" }}>
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
