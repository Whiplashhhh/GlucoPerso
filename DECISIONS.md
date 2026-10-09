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

## Sécurité et architecture

- **2026-10-10 — CSP à nonce plutôt que Partial Prerendering** : `cacheComponents` désactivé. Une appli authentifiée de données de santé est rendue dynamiquement de toute façon ; la CSP stricte (`script-src 'nonce-…' 'strict-dynamic'`) l'emporte. `style-src` garde `'unsafe-inline'` car Motion anime via l'attribut `style`.
- **2026-10-10 — Inscription uniquement par Server Action** : l'endpoint HTTP Better Auth `/sign-up/email` renvoie 403 ; l'action applique `REGISTRATION_MODE` et réserve atomiquement le code d'invitation _avant_ de créer le compte (libéré en cas d'échec). Codes d'invitation à usage unique créés par `npm run invite`, stockés hachés.
- **2026-10-10 — Codes de récupération** : 8 codes de 60 bits (alphabet sans I/L/O/U), hachés SHA-256 (suffisant vu l'entropie), affichés une fois ; il faut les télécharger ou copier pour continuer. Une récupération révoque toutes les sessions.
- **2026-10-10 — Verrouillage progressif** : après 5 échecs, 30 s puis doublement jusqu'à 1 h, oubli après 24 h calmes. Clés = hash de l'email (jamais l'email en clair). S'ajoute au rate limiting Better Auth stocké en base.
- **2026-10-10 — argon2id** via `@node-rs/argon2` (paramètres OWASP : 19 Mio, t=2, p=1).
- **2026-10-10 — Thème** : cookie `gp-theme` lu côté serveur (pas de script inline, pas de flash) ; sans cookie on suit le système.
- **2026-10-10 — Config ESLint** : laissée à celle du scaffold Next (core-web-vitals + TypeScript) ; un hook local protège ce fichier. Elle ne contient pas de règles de style en conflit avec Prettier.
