# Décisions

Journal des décisions prises en autonomie (personne n'était disponible pour trancher).
Format : date — décision — raison.

## Méthode

- **2026-10-10 — Flux Git** : `main` reste toujours déployable. Chaque étape du plan part sur sa propre branche (`feat/…`, `fix/…`, `chore/…`, `style/…`), passe par une Pull Request GitHub et n'est fusionnée (squash) qu'une fois la CI verte. Les messages suivent Conventional Commits, vérifiés par commitlint via un hook Husky.
- **2026-10-10 — Versions** : Next.js 16 (App Router), React 19, Prisma 7.10 (dernière stable : le tag npm `latest` pointe sur une RC 8.0, écartée), Better Auth 1.7, Tailwind 4, Zod 4, Motion 14, Vitest, Playwright. TypeScript reste sur la dernière version 5.x/6.x compatible avec Next (TS 7 natif pas encore pris en charge par l'outillage Next).
- **2026-10-10 — Node** : image Docker sur la LTS Node 24 ; `engines` accepte Node ≥ 22.

## Produit

- **2026-10-10 — Moments de la journée** : `BREAKFAST` (petit-déj, 5 h–10 h 59), `LUNCH` (déjeuner, 11 h–14 h 59), `AFTERNOON_SNACK` (goûter, 15 h–17 h 59), `DINNER` (dîner, 18 h–22 h 59), `SNACK` (encas, le reste). `DEFAULT` désigne le ratio général utilisé pour tout moment sans ratio dédié.
- **2026-10-10 — Glycémies** stockées en g/L, converties en mg/dL à l'affichage si besoin (× 100).
- **2026-10-10 — « Unités injectées » inclut la correction** (« dont correction ») : bolus repas = unités − correction.
